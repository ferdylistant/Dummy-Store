import { randomBytes } from 'node:crypto'
import express, { type RequestHandler } from 'express'
import { sql } from 'kysely'
import { z } from 'zod'
import { sessionAdmin, sessionUser, type Auth } from './auth.js'
import type { Database } from './db/index.js'
import { HttpError } from './errors.js'
import { MAX_UPLOAD_BYTES, storeImage, UPLOAD_TYPES } from './media.js'
import { cancelUnpaidOrder } from './orders.js'
import { allProducts, listCategories, type MediaUrl } from './repositories/catalog.js'
import { getSettings, saveSettings, SETTINGS, type SettingsKey } from './settings.js'

export const ART_KINDS = [
  'tee',
  'shirt',
  'hoodie',
  'sweater',
  'jacket',
  'pants',
  'shorts',
  'bandana',
  'cap',
  'tote',
  'mug',
  'socks',
  'pin',
  'sticker',
] as const
export const RAIL_KINDS = ['tee', 'knit', 'hoodie', 'shirt', 'jacket', 'coat'] as const

const mediaId = z.string().regex(/^[0-9a-f]{32}$/, 'Gambar tidak dikenali. Unggah ulang.')
const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Pakai huruf kecil, angka, dan tanda hubung, misalnya kaos-polos.')
const money = z.number().int().min(0).max(100_000_000)
const unique = (values: string[]) => new Set(values.map((value) => value.toLowerCase())).size === values.length

export const productInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 huruf.').max(120),
    slug,
    category: z.string().min(1, 'Pilih kategori.').max(80),
    price: money,
    /** The crossed-out price. Higher than price means the product is on sale. */
    compareAtPrice: money.nullable(),
    description: z.string().trim().min(10, 'Deskripsi minimal 10 huruf.').max(2000),
    details: z.array(z.string().trim().min(1).max(160)).max(12),
    material: z.string().trim().min(2).max(160),
    colors: z
      .array(z.object({ name: z.string().trim().min(1).max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) }))
      .min(1, 'Tambahkan minimal satu warna.')
      .max(12)
      .refine((colors) => unique(colors.map((color) => color.name)), 'Nama warna tidak boleh sama.'),
    sizes: z
      .array(z.string().trim().min(1).max(20))
      .min(1, 'Tambahkan minimal satu ukuran.')
      .max(12)
      .refine(unique, 'Ukuran tidak boleh sama.'),
    /** Stock per variant, keyed "Color|Size". Missing variants get zero. */
    stock: z.record(z.string(), z.number().int().min(0).max(100_000)),
    weightGrams: z.number().int().min(1, 'Berat minimal 1 gram.').max(50_000),
    isNew: z.boolean(),
    featured: z.boolean(),
    isActive: z.boolean(),
    art: z.enum(ART_KINDS),
    railKind: z.enum(RAIL_KINDS).nullable(),
    images: z.array(z.object({ mediaId, alt: z.string().trim().max(160) })).max(10, 'Maksimal 10 gambar.'),
    railMediaId: mediaId.nullable(),
    railBackMediaId: mediaId.nullable().default(null),
    railSideMediaId: mediaId.nullable().default(null),
    /** The rail photos include their own hanger. */
    railHasHanger: z.boolean().default(false),
  })
  .refine((input) => input.compareAtPrice === null || input.compareAtPrice > input.price, {
    path: ['compareAtPrice'],
    message: 'Harga coret harus lebih tinggi dari harga jual.',
  })

export type ProductInput = z.infer<typeof productInputSchema>

const categoryInputSchema = z.object({
  slug,
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(5).max(200),
  intro: z.string().trim().min(5).max(600),
  art: z.enum(ART_KINDS),
  artColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  coverProductId: z.string().max(40).nullable(),
})

const FULFILLMENT = ['unfulfilled', 'packed', 'shipped', 'delivered'] as const
const fulfillmentSchema = z.object({
  fulfillmentStatus: z.enum(FULFILLMENT),
  courier: z.string().trim().max(60).nullable(),
  trackingNumber: z.string().trim().max(80).nullable(),
})

/** Unknown references from the database become readable form errors. */
function friendly(error: unknown): never {
  const code = (error as { code?: string }).code
  const detail = String((error as { detail?: string; message?: string }).detail ?? (error as Error).message ?? '')
  if (code === '23505') throw new HttpError(409, 'duplicate', 'Slug sudah dipakai. Ganti dengan yang lain.')
  if (code === '23503') {
    if (detail.includes('media')) throw new HttpError(422, 'unknown_media', 'Ada gambar yang tidak ditemukan. Unggah ulang.')
    if (detail.includes('categories')) throw new HttpError(422, 'unknown_category', 'Kategori tidak ditemukan.')
    throw new HttpError(422, 'reference', 'Ada data terkait yang tidak ditemukan.')
  }
  throw error
}

/** Creates or replaces a product with its variants and pictures, all or nothing. */
export async function saveProduct(db: Database, input: ProductInput, id?: string) {
  const productId = id ?? `p${randomBytes(5).toString('hex')}`
  try {
    await db.transaction().execute(async (trx) => {
      const values = {
        slug: input.slug,
        name: input.name,
        category: input.category,
        art: input.art,
        rail_kind: input.railKind,
        price: input.price,
        compare_at_price: input.compareAtPrice,
        description: input.description,
        details: JSON.stringify(input.details),
        material: input.material,
        colors: JSON.stringify(input.colors),
        sizes: JSON.stringify(input.sizes),
        is_new: input.isNew,
        featured: input.featured,
        is_active: input.isActive,
        weight_grams: input.weightGrams,
        rail_media_id: input.railMediaId,
        // The back and side only make sense with a front.
        rail_back_media_id: input.railMediaId ? input.railBackMediaId : null,
        rail_side_media_id: input.railMediaId ? input.railSideMediaId : null,
        rail_has_hanger: Boolean(input.railMediaId) && input.railHasHanger,
        updated_at: new Date(),
      }
      if (id) {
        const updated = await trx.updateTable('products').set(values).where('id', '=', id).executeTakeFirst()
        if (Number(updated.numUpdatedRows) === 0) throw new HttpError(404, 'not_found', 'Produk tidak ditemukan.')
      } else {
        const { next } = await trx
          .selectFrom('products')
          .select(sql<number>`coalesce(max(position), -1) + 1`.as('next'))
          .executeTakeFirstOrThrow()
        await trx.insertInto('products').values({ ...values, id: productId, position: Number(next), image: null }).execute()
      }

      // Every color and size pair is a variant. Pairs that no longer exist are removed.
      const variants = input.colors.flatMap((color) =>
        input.sizes.map((size) => ({
          product_id: productId,
          color: color.name,
          size,
          stock: input.stock[`${color.name}|${size}`] ?? 0,
        })),
      )
      await trx.deleteFrom('variants').where('product_id', '=', productId).execute()
      await trx.insertInto('variants').values(variants).execute()

      await trx.deleteFrom('product_images').where('product_id', '=', productId).execute()
      if (input.images.length) {
        await trx
          .insertInto('product_images')
          .values(input.images.map((image, position) => ({ product_id: productId, media_id: image.mediaId, position, alt: image.alt })))
          .execute()
      }
    })
  } catch (error) {
    if (error instanceof HttpError) throw error
    friendly(error)
  }
  return productId
}

export function adminRouter(db: Database, auth: Auth, mediaUrl: MediaUrl, onChange: () => void = () => {}) {
  const router = express.Router()

  const requireAdmin: RequestHandler = async (req, res, next) => {
    if (await sessionAdmin(auth, req.headers)) {
      res.set('Cache-Control', 'no-store')
      return next()
    }
    if (await sessionUser(auth, req.headers)) throw new HttpError(403, 'forbidden', 'Akun ini bukan admin.')
    throw new HttpError(401, 'unauthorized', 'Silakan masuk sebagai admin.')
  }
  router.use(requireAdmin)

  // Every successful change refreshes the store's cached pages.
  router.use((req, res, next) => {
    if (req.method !== 'GET') {
      res.on('finish', () => {
        if (res.statusCode < 400) onChange()
      })
    }
    next()
  })

  // ---------- overview
  // Shop days start at midnight in Jakarta (UTC+7), so "today" matches the admin's clock.
  const LOCAL_DAY = sql`((now() AT TIME ZONE 'UTC') + interval '7 hours')::date`

  router.get('/overview', async (req, res) => {
    const { days } = z.object({ days: z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])).default(30) }).parse(req.query)
    const since = sql`now() - make_interval(days => ${days}::int)`
    const before = sql`now() - make_interval(days => ${days * 2}::int)`
    const paid = db.selectFrom('orders').where('status', '=', 'paid')

    const [today, all, statuses, fulfillment, lowStock, recent, customers, products, totals, series, top, toShip, expiring, setup] =
      await Promise.all([
        paid
          .select(sql<number>`coalesce(sum(total), 0)::int`.as('sum'))
          .where(sql<boolean>`((paid_at AT TIME ZONE 'UTC') + interval '7 hours')::date = ${LOCAL_DAY}`)
          .executeTakeFirstOrThrow(),
        paid.select(sql<number>`coalesce(sum(total), 0)::int`.as('sum')).executeTakeFirstOrThrow(),
        db.selectFrom('orders').select(['status', sql<number>`count(*)::int`.as('count')]).groupBy('status').execute(),
        db
          .selectFrom('orders')
          .select(['fulfillment_status', sql<number>`count(*)::int`.as('count')])
          .where('status', '=', 'paid')
          .groupBy('fulfillment_status')
          .execute(),
        db
          .selectFrom('variants')
          .innerJoin('products', 'products.id', 'variants.product_id')
          .select(['products.id', 'products.name', 'variants.color', 'variants.size', 'variants.stock'])
          .where('products.is_active', '=', true)
          .where('variants.stock', '<=', 3)
          .orderBy('variants.stock')
          .limit(8)
          .execute(),
        db
          .selectFrom('orders')
          .select(['order_number', 'full_name', 'total', 'status', 'fulfillment_status', 'created_at'])
          .orderBy('id', 'desc')
          .limit(6)
          .execute(),
        sql<{ count: number; current: number; previous: number }>`SELECT count(*)::int AS count,
            count(*) FILTER (WHERE "createdAt" >= ${since})::int AS current,
            count(*) FILTER (WHERE "createdAt" >= ${before} AND "createdAt" < ${since})::int AS previous
          FROM "user" WHERE coalesce(role, 'customer') <> 'admin'`.execute(db),
        db.selectFrom('products').select(sql<number>`count(*)::int`.as('count')).where('is_active', '=', true).executeTakeFirstOrThrow(),
        sql<{ revenue: number; prev_revenue: number; paid: number; prev_paid: number; created: number; prev_created: number }>`SELECT
            coalesce(sum(total) FILTER (WHERE status = 'paid' AND paid_at >= ${since}), 0)::int AS revenue,
            coalesce(sum(total) FILTER (WHERE status = 'paid' AND paid_at >= ${before} AND paid_at < ${since}), 0)::int AS prev_revenue,
            count(*) FILTER (WHERE status = 'paid' AND paid_at >= ${since})::int AS paid,
            count(*) FILTER (WHERE status = 'paid' AND paid_at >= ${before} AND paid_at < ${since})::int AS prev_paid,
            count(*) FILTER (WHERE created_at >= ${since})::int AS created,
            count(*) FILTER (WHERE created_at >= ${before} AND created_at < ${since})::int AS prev_created
          FROM orders`.execute(db),
        sql<{ day: string; revenue: number; orders: number }>`SELECT to_char(d, 'YYYY-MM-DD') AS day,
            coalesce(sum(o.total), 0)::int AS revenue,
            count(o.id)::int AS orders
          FROM generate_series(${LOCAL_DAY} - ${days - 1}::int, ${LOCAL_DAY}, interval '1 day') AS d
          LEFT JOIN orders o ON o.status = 'paid' AND ((o.paid_at AT TIME ZONE 'UTC') + interval '7 hours')::date = d::date
          GROUP BY d ORDER BY d`.execute(db),
        sql<{ productId: string; name: string; quantity: number; revenue: number; mediaId: string | null }>`SELECT i.product_id AS "productId",
            max(i.product_name) AS name,
            sum(i.quantity)::int AS quantity,
            sum(i.line_total)::int AS revenue,
            (SELECT media_id FROM product_images WHERE product_id = i.product_id ORDER BY position LIMIT 1) AS "mediaId"
          FROM order_items i JOIN orders o ON o.id = i.order_id
          WHERE o.status = 'paid' AND o.paid_at >= ${since}
          GROUP BY i.product_id ORDER BY quantity DESC, revenue DESC LIMIT 5`.execute(db),
        db
          .selectFrom('orders')
          .select(['order_number', 'full_name', 'total', 'paid_at', 'fulfillment_status', 'city'])
          .where('status', '=', 'paid')
          .where('fulfillment_status', 'in', ['unfulfilled', 'packed'])
          .orderBy('paid_at')
          .limit(5)
          .execute(),
        db
          .selectFrom('orders')
          .select(['order_number', 'full_name', 'total', 'expires_at', 'payment_method'])
          .where('status', '=', 'awaiting_payment')
          .where('expires_at', '>', new Date())
          .orderBy('expires_at')
          .limit(5)
          .execute(),
        Promise.all([
          getSettings(db, 'store'),
          getSettings(db, 'origin'),
          sql<{ without_photos: number; on_rail_with_photos: number }>`SELECT
              count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM product_images pi WHERE pi.product_id = p.id))::int AS without_photos,
              count(*) FILTER (WHERE p.rail_media_id IS NOT NULL)::int AS on_rail_with_photos
            FROM products p WHERE p.is_active`.execute(db),
        ]),
      ])

    const sum = totals.rows[0]!
    const [store, origin, catalog] = setup
    const people = customers.rows[0] ?? { count: 0, current: 0, previous: 0 }
    res.json({
      days,
      revenue: { today: today.sum, last30Days: sum.revenue, total: all.sum },
      period: {
        revenue: { current: sum.revenue, previous: sum.prev_revenue },
        paidOrders: { current: sum.paid, previous: sum.prev_paid },
        createdOrders: { current: sum.created, previous: sum.prev_created },
        averageOrder: {
          current: sum.paid ? Math.round(sum.revenue / sum.paid) : 0,
          previous: sum.prev_paid ? Math.round(sum.prev_revenue / sum.prev_paid) : 0,
        },
        newCustomers: { current: people.current, previous: people.previous },
      },
      series: series.rows,
      orders: Object.fromEntries(statuses.map((row) => [row.status, row.count])),
      fulfillment: Object.fromEntries(fulfillment.map((row) => [row.fulfillment_status, row.count])),
      lowStock: lowStock.map((row) => ({ productId: row.id, name: row.name, color: row.color, size: row.size, stock: row.stock })),
      recentOrders: recent.map((row) => ({
        orderNumber: row.order_number,
        customer: row.full_name,
        total: row.total,
        status: row.status,
        fulfillmentStatus: row.fulfillment_status,
        createdAt: row.created_at,
      })),
      topProducts: top.rows.map(({ mediaId, ...row }) => ({ ...row, image: mediaId ? mediaUrl(mediaId) : null })),
      toShip: toShip.map((row) => ({
        orderNumber: row.order_number,
        customer: row.full_name,
        city: row.city,
        total: row.total,
        paidAt: row.paid_at,
        fulfillmentStatus: row.fulfillment_status,
      })),
      expiring: expiring.map((row) => ({
        orderNumber: row.order_number,
        customer: row.full_name,
        total: row.total,
        expiresAt: row.expires_at,
        paymentMethod: row.payment_method,
      })),
      setup: {
        origin: Boolean(origin.regionCode),
        logo: Boolean(store.logoMediaId),
        contact: Boolean(store.phone) && store.email !== 'halo@dummystore.example',
        socials: Object.values(store.socials ?? {}).some(Boolean),
        productsWithoutPhotos: catalog.rows[0]?.without_photos ?? 0,
        railPhotos: catalog.rows[0]?.on_rail_with_photos ?? 0,
      },
      customers: people.count,
      activeProducts: products.count,
    })
  })

  // Small numbers for the menu badges, asked on every page.
  router.get('/counts', async (_req, res) => {
    const { rows } = await sql<{ to_ship: number; awaiting: number; low_stock: number }>`SELECT
        (SELECT count(*) FROM orders WHERE status = 'paid' AND fulfillment_status IN ('unfulfilled', 'packed'))::int AS to_ship,
        (SELECT count(*) FROM orders WHERE status = 'awaiting_payment')::int AS awaiting,
        (SELECT count(DISTINCT v.product_id) FROM variants v JOIN products p ON p.id = v.product_id WHERE p.is_active AND v.stock <= 3)::int AS low_stock`.execute(db)
    const row = rows[0]!
    res.json({ toShip: row.to_ship, awaitingPayment: row.awaiting, lowStock: row.low_stock })
  })

  // ---------- media
  router.post('/media', express.raw({ type: UPLOAD_TYPES, limit: MAX_UPLOAD_BYTES }), async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new HttpError(415, 'unsupported_media', 'Kirim gambar JPG, PNG, WebP, atau AVIF.')
    }
    const image = await storeImage(db, req.body)
    res.status(201).json({ ...image, url: mediaUrl(image.id) })
  })

  // ---------- products
  router.get('/products', async (req, res) => {
    const { q, category, status } = z
      .object({
        q: z.string().trim().max(80).optional(),
        category: z.string().max(80).optional(),
        status: z.enum(['active', 'inactive', 'all']).default('all'),
      })
      .parse(req.query)
    const [products, active, stock] = await Promise.all([
      allProducts(db, mediaUrl, { includeInactive: true }),
      db.selectFrom('products').select(['id', 'is_active', 'updated_at']).execute(),
      db
        .selectFrom('variants')
        .select(['product_id', sql<number>`sum(stock)::int`.as('stock')])
        .groupBy('product_id')
        .execute(),
    ])
    const activeById = new Map(active.map((row) => [row.id, row]))
    const stockById = new Map(stock.map((row) => [row.product_id, row.stock]))
    const keyword = q?.toLowerCase()
    const items = products
      .map((product) => ({
        ...product,
        isActive: activeById.get(product.id)?.is_active ?? true,
        updatedAt: activeById.get(product.id)?.updated_at,
        totalStock: stockById.get(product.id) ?? 0,
      }))
      .filter((product) => !category || product.category === category)
      .filter((product) => status === 'all' || product.isActive === (status === 'active'))
      .filter((product) => !keyword || `${product.name} ${product.slug}`.toLowerCase().includes(keyword))
    res.json({ items })
  })

  router.get('/products/:id', async (req, res) => {
    const product = (await allProducts(db, mediaUrl, { includeInactive: true })).find((item) => item.id === req.params.id)
    if (!product) throw new HttpError(404, 'not_found', 'Produk tidak ditemukan.')
    const [row, variants, images] = await Promise.all([
      db.selectFrom('products').select(['is_active', 'rail_media_id', 'rail_back_media_id', 'rail_side_media_id']).where('id', '=', product.id).executeTakeFirstOrThrow(),
      db.selectFrom('variants').select(['color', 'size', 'stock']).where('product_id', '=', product.id).execute(),
      db
        .selectFrom('product_images')
        .select(['media_id', 'alt'])
        .where('product_id', '=', product.id)
        .orderBy('position')
        .execute(),
    ])
    res.json({
      ...product,
      isActive: row.is_active,
      railMediaId: row.rail_media_id,
      railBackMediaId: row.rail_back_media_id,
      railSideMediaId: row.rail_side_media_id,
      stock: Object.fromEntries(variants.map((variant) => [`${variant.color}|${variant.size}`, variant.stock])),
      images: product.images.map((image, index) => ({ ...image, mediaId: images[index]?.media_id })),
    })
  })

  router.post('/products', async (req, res) => {
    const id = await saveProduct(db, productInputSchema.parse(req.body))
    res.status(201).json({ id })
  })

  router.put('/products/:id', async (req, res) => {
    const id = await saveProduct(db, productInputSchema.parse(req.body), req.params.id)
    res.json({ id })
  })

  // A product someone ordered stays for order history, hidden from the store.
  router.delete('/products/:id', async (req, res) => {
    const ordered = await db.selectFrom('order_items').select('order_id').where('product_id', '=', req.params.id).limit(1).executeTakeFirst()
    if (ordered) {
      const archived = await db.updateTable('products').set({ is_active: false, updated_at: new Date() }).where('id', '=', req.params.id).executeTakeFirst()
      if (Number(archived.numUpdatedRows) === 0) throw new HttpError(404, 'not_found', 'Produk tidak ditemukan.')
      return res.json({ archived: true })
    }
    const deleted = await db.deleteFrom('products').where('id', '=', req.params.id).executeTakeFirst()
    if (Number(deleted.numDeletedRows) === 0) throw new HttpError(404, 'not_found', 'Produk tidak ditemukan.')
    res.json({ archived: false })
  })

  // ---------- categories
  router.get('/categories', async (_req, res) => {
    const [categories, counts] = await Promise.all([
      listCategories(db),
      db.selectFrom('products').select(['category', sql<number>`count(*)::int`.as('count')]).groupBy('category').execute(),
    ])
    const byCategory = new Map(counts.map((row) => [row.category, row.count]))
    res.json({ items: categories.map((category) => ({ ...category, productCount: byCategory.get(category.slug) ?? 0 })) })
  })

  const categoryValues = (input: z.infer<typeof categoryInputSchema>) => ({
    name: input.name,
    description: input.description,
    intro: input.intro,
    art: input.art,
    art_color: input.artColor,
    cover_product_id: input.coverProductId,
  })

  router.post('/categories', async (req, res) => {
    const input = categoryInputSchema.parse(req.body)
    const { next } = await db
      .selectFrom('categories')
      .select(sql<number>`coalesce(max(position), -1) + 1`.as('next'))
      .executeTakeFirstOrThrow()
    try {
      await db.insertInto('categories').values({ ...categoryValues(input), slug: input.slug, position: Number(next) }).execute()
    } catch (error) {
      friendly(error)
    }
    res.status(201).json({ slug: input.slug })
  })

  // The slug is the category's address and its products' reference, so it stays fixed.
  router.put('/categories/:slug', async (req, res) => {
    const input = categoryInputSchema.parse({ ...req.body, slug: req.params.slug })
    try {
      const updated = await db.updateTable('categories').set(categoryValues(input)).where('slug', '=', req.params.slug).executeTakeFirst()
      if (Number(updated.numUpdatedRows) === 0) throw new HttpError(404, 'not_found', 'Kategori tidak ditemukan.')
    } catch (error) {
      if (error instanceof HttpError) throw error
      friendly(error)
    }
    res.json({ slug: req.params.slug })
  })

  router.put('/categories-order', async (req, res) => {
    const { slugs } = z.object({ slugs: z.array(z.string().max(80)).max(50) }).parse(req.body)
    await db.transaction().execute(async (trx) => {
      for (const [position, item] of slugs.entries()) {
        await trx.updateTable('categories').set({ position }).where('slug', '=', item).execute()
      }
    })
    res.json({ slugs })
  })

  router.delete('/categories/:slug', async (req, res) => {
    const used = await db.selectFrom('products').select('id').where('category', '=', req.params.slug).limit(1).executeTakeFirst()
    if (used) throw new HttpError(409, 'category_in_use', 'Kategori masih berisi produk. Pindahkan produknya dulu.')
    const deleted = await db.deleteFrom('categories').where('slug', '=', req.params.slug).executeTakeFirst()
    if (Number(deleted.numDeletedRows) === 0) throw new HttpError(404, 'not_found', 'Kategori tidak ditemukan.')
    res.status(204).end()
  })

  // ---------- orders
  router.get('/orders', async (req, res) => {
    const { status, fulfillment, q, page } = z
      .object({
        status: z.enum(['awaiting_payment', 'paid', 'expired', 'cancelled', 'refunded']).optional(),
        /** "to_ship" is paid work not handed to a courier yet: unfulfilled or packed. */
        fulfillment: z.enum([...FULFILLMENT, 'to_ship']).optional(),
        q: z.string().trim().max(80).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .parse(req.query)
    const PAGE = 20
    let query = db.selectFrom('orders')
    if (status) query = query.where('status', '=', status)
    if (fulfillment === 'to_ship') query = query.where('status', '=', 'paid').where('fulfillment_status', 'in', ['unfulfilled', 'packed'])
    else if (fulfillment) query = query.where('fulfillment_status', '=', fulfillment)
    if (q) {
      const like = `%${q.replace(/[%_\\]/g, (char) => `\\${char}`)}%`
      query = query.where((eb) =>
        eb.or([eb('order_number', 'ilike', like), eb('full_name', 'ilike', like), eb('email', 'ilike', like)]),
      )
    }
    const [{ count }, rows] = await Promise.all([
      query.select(sql<number>`count(*)::int`.as('count')).executeTakeFirstOrThrow(),
      query
        .select(['id', 'order_number', 'full_name', 'email', 'total', 'status', 'fulfillment_status', 'payment_method', 'created_at', 'city'])
        .orderBy('id', 'desc')
        .limit(PAGE)
        .offset((page - 1) * PAGE)
        .execute(),
    ])
    const items = rows.length
      ? await db
          .selectFrom('order_items')
          .select(['order_id', sql<number>`sum(quantity)::int`.as('quantity')])
          .where('order_id', 'in', rows.map((row) => row.id))
          .groupBy('order_id')
          .execute()
      : []
    const quantity = new Map(items.map((row) => [row.order_id, row.quantity]))
    res.json({
      items: rows.map((row) => ({
        orderNumber: row.order_number,
        customer: row.full_name,
        email: row.email,
        city: row.city,
        total: row.total,
        status: row.status,
        fulfillmentStatus: row.fulfillment_status,
        paymentMethod: row.payment_method,
        createdAt: row.created_at,
        itemCount: quantity.get(row.id) ?? 0,
      })),
      total: count,
      page,
      pageCount: Math.max(1, Math.ceil(count / PAGE)),
    })
  })

  router.get('/orders/:orderNumber', async (req, res) => {
    const order = await db.selectFrom('orders').selectAll().where('order_number', '=', req.params.orderNumber).executeTakeFirst()
    if (!order) throw new HttpError(404, 'not_found', 'Pesanan tidak ditemukan.')
    const items = await db.selectFrom('order_items').selectAll().where('order_id', '=', order.id).execute()
    res.json({
      orderNumber: order.order_number,
      status: order.status,
      fulfillmentStatus: order.fulfillment_status,
      courier: order.courier,
      trackingNumber: order.tracking_number,
      shippedAt: order.shipped_at,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      expiresAt: order.expires_at,
      paymentMethod: order.payment_method,
      shippingMethod: order.shipping_method,
      subtotal: order.subtotal,
      shippingCost: order.shipping_cost,
      total: order.total,
      customer: { name: order.full_name, email: order.email, phone: order.phone, userId: order.user_id },
      address: {
        street: order.address,
        village: order.village,
        district: order.district,
        city: order.city,
        province: order.province,
        postalCode: order.postal_code,
        notes: order.notes,
      },
      items: items.map((item) => ({
        productId: item.product_id,
        name: item.product_name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        lineTotal: item.line_total,
      })),
    })
  })

  router.put('/orders/:orderNumber/fulfillment', async (req, res) => {
    const input = fulfillmentSchema.parse(req.body)
    const order = await db.selectFrom('orders').select(['id', 'status', 'shipped_at']).where('order_number', '=', req.params.orderNumber).executeTakeFirst()
    if (!order) throw new HttpError(404, 'not_found', 'Pesanan tidak ditemukan.')
    if (order.status !== 'paid') throw new HttpError(409, 'not_paid', 'Hanya pesanan yang sudah dibayar yang bisa dikirim.')
    if (input.fulfillmentStatus === 'shipped' && !input.trackingNumber) {
      throw new HttpError(422, 'tracking_required', 'Isi nomor resi sebelum menandai pesanan dikirim.')
    }
    await db
      .updateTable('orders')
      .set({
        fulfillment_status: input.fulfillmentStatus,
        courier: input.courier,
        tracking_number: input.trackingNumber,
        shipped_at: ['shipped', 'delivered'].includes(input.fulfillmentStatus) ? (order.shipped_at ?? new Date()) : null,
      })
      .where('id', '=', order.id)
      .execute()
    res.json(input)
  })

  router.post('/orders/:orderNumber/cancel', async (req, res) => {
    const cancelled = await cancelUnpaidOrder(db, req.params.orderNumber)
    if (!cancelled) throw new HttpError(409, 'not_cancellable', 'Hanya pesanan yang belum dibayar yang bisa dibatalkan.')
    res.json({ status: 'cancelled' })
  })

  // ---------- customers
  router.get('/customers', async (req, res) => {
    const { q } = z.object({ q: z.string().trim().max(80).optional() }).parse(req.query)
    const like = q ? `%${q.replace(/[%_\\]/g, (char) => `\\${char}`)}%` : null
    const rows = await sql<{
      id: string
      name: string
      email: string
      emailVerified: boolean
      createdAt: Date
      orders: number
      paidOrders: number
      spent: number
      lastOrderAt: Date | null
      providers: string[]
    }>`SELECT u.id, u.name, u.email, u."emailVerified", u."createdAt",
        count(o.id)::int AS orders,
        count(o.id) FILTER (WHERE o.status = 'paid')::int AS "paidOrders",
        coalesce(sum(o.total) FILTER (WHERE o.status = 'paid'), 0)::int AS spent,
        max(o.created_at) AS "lastOrderAt",
        coalesce((SELECT array_agg(DISTINCT a."providerId") FROM account a WHERE a."userId" = u.id), '{}') AS providers
      FROM "user" u LEFT JOIN orders o ON o.user_id = u.id
      WHERE coalesce(u.role, 'customer') <> 'admin'
        AND (${like}::text IS NULL OR u.name ILIKE ${like} OR u.email ILIKE ${like})
      GROUP BY u.id ORDER BY u."createdAt" DESC LIMIT 200`.execute(db)
    res.json({ items: rows.rows })
  })

  router.get('/customers/:id', async (req, res) => {
    const { rows: users } = await sql<{ id: string; name: string; email: string; emailVerified: boolean; createdAt: Date; image: string | null }>`
      SELECT id, name, email, "emailVerified", "createdAt", image FROM "user"
      WHERE id = ${req.params.id} AND coalesce(role, 'customer') <> 'admin'`.execute(db)
    const user = users[0]
    if (!user) throw new HttpError(404, 'not_found', 'Pelanggan tidak ditemukan.')


    const [providers, sessions, preferences, addresses, orders] = await Promise.all([
      sql<{ providerId: string }>`SELECT DISTINCT "providerId" FROM account WHERE "userId" = ${user.id}`.execute(db),
      sql<{ active: number; lastSeen: Date | null }>`SELECT count(*) FILTER (WHERE "expiresAt" > now())::int AS active, max("updatedAt") AS "lastSeen"
        FROM session WHERE "userId" = ${user.id}`.execute(db),
      db.selectFrom('user_preferences').select(['order_updates', 'promotions']).where('user_id', '=', user.id).executeTakeFirst(),
      db.selectFrom('addresses').selectAll().where('user_id', '=', user.id).orderBy('is_default', 'desc').orderBy('id').execute(),
      db
        .selectFrom('orders')
        .select(['id', 'order_number', 'status', 'fulfillment_status', 'total', 'payment_method', 'shipping_method', 'city', 'created_at', 'paid_at'])
        .where('user_id', '=', user.id)
        .orderBy('id', 'desc')
        .limit(200)
        .execute(),
    ])

    const ids = orders.map((order) => order.id)
    const [counts, favourites] = ids.length
      ? await Promise.all([
          db
            .selectFrom('order_items')
            .select(['order_id', sql<number>`sum(quantity)::int`.as('quantity')])
            .where('order_id', 'in', ids)
            .groupBy('order_id')
            .execute(),
          sql<{ productId: string; name: string; quantity: number; revenue: number; mediaId: string | null }>`SELECT i.product_id AS "productId",
              max(i.product_name) AS name, sum(i.quantity)::int AS quantity, sum(i.line_total)::int AS revenue,
              (SELECT media_id FROM product_images WHERE product_id = i.product_id ORDER BY position LIMIT 1) AS "mediaId"
            FROM order_items i JOIN orders o ON o.id = i.order_id
            WHERE o.status = 'paid' AND o.id = ANY(${ids}::int[])
            GROUP BY i.product_id ORDER BY quantity DESC, revenue DESC LIMIT 5`.execute(db),
        ])
      : [[], { rows: [] }]
    const quantity = new Map(counts.map((row) => [row.order_id, row.quantity]))

    const paid = orders.filter((order) => order.status === 'paid')
    const spent = paid.reduce((sum, order) => sum + order.total, 0)
    // Six calendar months, Jakarta time, oldest first.
    const months = Array.from({ length: 6 }, (_, back) => {
      const local = new Date(Date.now() + 7 * 3_600_000)
      local.setUTCDate(1)
      local.setUTCMonth(local.getUTCMonth() - (5 - back))
      return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`
    })
    const monthOf = (date: Date) => {
      const local = new Date(new Date(date).getTime() + 7 * 3_600_000)
      return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      image: user.image,
      providers: providers.rows.map((row) => row.providerId),
      sessions: { active: sessions.rows[0]?.active ?? 0, lastSeen: sessions.rows[0]?.lastSeen ?? null },
      preferences: { orderUpdates: preferences?.order_updates ?? true, promotions: preferences?.promotions ?? false },
      stats: {
        orders: orders.length,
        paidOrders: paid.length,
        spent,
        averageOrder: paid.length ? Math.round(spent / paid.length) : 0,
        firstPaidAt: paid.at(-1)?.paid_at ?? null,
        lastOrderAt: orders[0]?.created_at ?? null,
        byStatus: Object.fromEntries(['paid', 'awaiting_payment', 'expired', 'cancelled', 'refunded'].map((status) => [status, orders.filter((order) => order.status === status).length])),
      },
      months: months.map((month) => ({ month, spent: paid.filter((order) => order.paid_at && monthOf(order.paid_at) === month).reduce((sum, order) => sum + order.total, 0) })),
      addresses: addresses.map((row) => ({
        id: row.id,
        label: row.label,
        recipient: row.recipient,
        phone: row.phone,
        address: row.address,
        village: row.village,
        district: row.district,
        city: row.city,
        province: row.province,
        postalCode: row.postal_code,
        isDefault: row.is_default,
      })),
      orders: orders.map((order) => ({
        orderNumber: order.order_number,
        status: order.status,
        fulfillmentStatus: order.fulfillment_status,
        total: order.total,
        paymentMethod: order.payment_method,
        shippingMethod: order.shipping_method,
        city: order.city,
        createdAt: order.created_at,
        itemCount: quantity.get(order.id) ?? 0,
      })),
      favourites: favourites.rows.map(({ mediaId, ...row }) => ({ ...row, image: mediaId ? mediaUrl(mediaId) : null })),
    })
  })

  // ---------- settings
  router.get('/settings', async (_req, res) => {
    const [store, origin, home] = await Promise.all([getSettings(db, 'store'), getSettings(db, 'origin'), getSettings(db, 'home')])
    res.json({ store: { ...store, logoUrl: store.logoMediaId ? mediaUrl(store.logoMediaId) : null }, origin, home })
  })

  router.put('/settings/:key', async (req, res) => {
    const key = z.enum(Object.keys(SETTINGS) as [SettingsKey, ...SettingsKey[]]).parse(req.params.key)
    res.json(await saveSettings(db, key, req.body))
  })

  return router
}

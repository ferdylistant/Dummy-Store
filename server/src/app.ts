import { toNodeHandler } from 'better-auth/node'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { sql } from 'kysely'
import { z } from 'zod'
import { accountRouter, requireVillage, saveAddress } from './account.js'
import { adminRouter } from './admin.js'
import { readMedia } from './media.js'
import { publicSettings } from './settings.js'
import { sessionUser, type Auth } from './auth.js'
import type { Database } from './db/index.js'
import { errorHandler, HttpError, notFoundHandler } from './errors.js'
import {
  applyPaymentStatus,
  createOrder,
  orderNumberSchema,
  orderSchema,
  orderStatus,
} from './orders.js'
import type { PaymentGateway } from './payments/midtrans.js'
import { regionChildren, regionCodeSchema, type RegionProvider } from './regions.js'
import { quoteShipping, shippingItemsSchema, type RateProvider } from './shipping.js'
import {
  findProductBySlug,
  homeContent,
  listCategories,
  findCategory,
  productFacets,
  queryProducts,
  relatedProducts,
} from './repositories/catalog.js'

const list = z
  .string()
  .max(500)
  .transform((value) => value.split(',').filter(Boolean))
const flag = z.enum(['true', 'false']).transform((value) => value === 'true')

const productQuerySchema = z.object({
  category: z.string().max(80).optional(),
  q: z.string().max(80).optional(),
  sizes: list.optional(),
  colors: list.optional(),
  ids: list.optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['rekomendasi', 'terbaru', 'termurah', 'termahal']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  featured: flag.optional(),
  isNew: flag.optional(),
  rail: flag.optional(),
})

const idempotencyKeySchema = z.string().min(8).max(100).optional()

const notificationSchema = z.object({
  order_id: z.string().min(1).max(60),
  status_code: z.string().min(1).max(10),
  gross_amount: z.string().min(1).max(30),
  signature_key: z.string().min(1).max(256),
  transaction_status: z.string().max(40).optional(),
  fraud_status: z.string().max(40).optional(),
  payment_type: z.string().max(60).optional(),
})

function limiter(perMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: perMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'rate_limited', message: 'Terlalu banyak percobaan. Coba lagi sebentar.' },
    },
  })
}

export interface AppOptions {
  corsOrigins: string[]
  /** Storefront URL that Midtrans returns shoppers to. */
  siteUrl?: string
  /** Null when Midtrans keys are missing. Orders are refused until it is set. */
  payments?: PaymentGateway | null
  /** Orders allowed per IP address per minute. */
  ordersPerMinute?: number
  auth: Auth
  /** The dashboard's own sign in. Without it the admin API is not mounted. */
  adminAuth?: Auth
  /** Null when Biteship is not configured. Address forms then use plain fields. */
  regions?: RegionProvider | null
  google?: boolean
  /**
   * Proxy hops in front of the API, passed to Express "trust proxy". Zero means
   * the API faces the internet directly and forwarded headers are ignored.
   */
  trustProxy?: number
  /** The API's own public address, used for picture links. Relative links without it. */
  publicUrl?: string
  /** Called after the dashboard changes something the store shows. */
  onStoreChange?: () => void
  /** Courier rates. Null or missing means the store's flat rates. */
  shippingRates?: RateProvider | null
}

export function createApp(db: Database, options: AppOptions) {
  const app = express()
  app.set('trust proxy', options.trustProxy ?? 0)
  const payments = options.payments ?? null
  const mediaUrl = (id: string) => `${options.publicUrl ?? ''}/api/media/${id}`
  const regions = options.regions ?? null

  app.use(helmet())
  app.use(
    cors({
      origin: options.corsOrigins,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Idempotency-Key'],
    }),
  )
  // Better Auth takes the client IP from x-forwarded-for. Replace whatever the
  // client sent with the address Express trusts, so a session's IP cannot be faked.
  app.use(['/api/auth', '/api/admin-auth'], (req, _res, next) => {
    // IPv6 loopback becomes 127.0.0.1, since Better Auth stores IPv6 as its /64 network.
    const ip = req.ip === '::1' ? '127.0.0.1' : req.ip?.replace(/^::ffff:/, '')
    if (ip) req.headers['x-forwarded-for'] = ip
    else delete req.headers['x-forwarded-for']
    next()
  })
  // Better Auth reads the raw body itself, so it is mounted before the JSON parser.
  app.all('/api/auth/{*path}', toNodeHandler(options.auth))
  if (options.adminAuth) app.all('/api/admin-auth/{*path}', toNodeHandler(options.adminAuth))
  app.use(express.json({ limit: '32kb' }))

  app.get('/api/config', (_req, res) => {
    res.json({ payments: Boolean(payments), regions: Boolean(regions), google: Boolean(options.google) })
  })

  app.get('/api/regions', limiter(60), async (req, res) => {
    if (!regions) throw new HttpError(503, 'regions_not_configured', 'Pencarian wilayah belum aktif.')
    const { q } = z.object({ q: z.string().trim().min(3).max(60) }).parse(req.query)
    res.json({ items: await regions.search(q) })
  })

  // The Kepmendagri list from our own database: provinces, then each level down.
  // It changes only with a new data release, so browsers and CDNs may keep it a day.
  app.get('/api/regions/children', limiter(120), async (req, res) => {
    const { parent } = z
      .object({ parent: z.string().regex(/^\d{2}(\.\d{2}){0,2}$/).optional() })
      .parse(req.query)
    res.set('Cache-Control', 'public, max-age=86400')
    res.json({ items: await regionChildren(db, parent ?? null) })
  })

  app.use('/api/me', accountRouter(db, options.auth))
  // Admin requests read the dashboard's cookie only, never the store's.
  if (options.adminAuth) app.use('/api/admin', adminRouter(db, options.adminAuth, mediaUrl, options.onStoreChange))

  // Pictures never change under the same id, so browsers may keep them a year.
  app.get('/api/media/:id', async (req, res) => {
    const media = await readMedia(db, req.params.id)
    if (!media) throw new HttpError(404, 'not_found', 'Gambar tidak ditemukan.')
    res.set({
      'Content-Type': media.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      // The store and dashboard run on other origins and show these pictures.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    })
    res.end(Buffer.from(media.data))
  })

  app.get('/api/settings', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=60')
    res.json(await publicSettings(db, mediaUrl))
  })

  app.get('/api/home', async (_req, res) => {
    res.json(await homeContent(db, mediaUrl))
  })

  app.get('/health', async (_req, res) => {
    await sql`SELECT 1`.execute(db)
    res.json({ status: 'ok', payments: payments ? 'ready' : 'not_configured' })
  })

  app.get('/api/categories', async (_req, res) => {
    res.json({ items: await listCategories(db) })
  })

  app.get('/api/categories/:slug', async (req, res) => {
    const category = await findCategory(db, req.params.slug)
    if (!category) throw new HttpError(404, 'not_found', 'Kategori tidak ditemukan.')
    res.json(category)
  })

  app.get('/api/products', async (req, res) => {
    res.json(await queryProducts(db, mediaUrl, productQuerySchema.parse(req.query)))
  })

  app.get('/api/products/facets', async (req, res) => {
    const { category } = productQuerySchema.pick({ category: true }).parse(req.query)
    res.json(await productFacets(db, mediaUrl, category))
  })

  app.get('/api/products/:slug', async (req, res) => {
    const product = await findProductBySlug(db, mediaUrl, req.params.slug)
    if (!product) throw new HttpError(404, 'not_found', 'Produk tidak ditemukan.')
    res.json(product)
  })

  app.get('/api/products/:slug/related', async (req, res) => {
    const product = await findProductBySlug(db, mediaUrl, req.params.slug)
    if (!product) throw new HttpError(404, 'not_found', 'Produk tidak ditemukan.')
    const { limit } = z
      .object({ limit: z.coerce.number().int().min(1).max(12).default(4) })
      .parse(req.query)
    res.json({ items: await relatedProducts(db, mediaUrl, product, limit) })
  })

  app.post('/api/orders', limiter(options.ordersPerMinute ?? 20), async (req, res) => {
    const input = orderSchema.parse(req.body)
    const idempotencyKey = idempotencyKeySchema.parse(req.get('Idempotency-Key'))
    if (!payments) {
      throw new HttpError(503, 'payment_not_configured', 'Pembayaran belum disiapkan oleh toko.')
    }
    const user = await sessionUser(options.auth, req.headers)
    const result = await createOrder(db, payments, input, {
      siteUrl: options.siteUrl ?? options.corsOrigins[0] ?? '',
      idempotencyKey,
      userId: user?.id,
      region: await requireVillage(db, input.customer.regionCode),
      shippingRates: options.shippingRates,
    })
    if (user && input.saveAddress) {
      const { customer } = input
      await saveAddress(db, user.id, {
        label: 'Alamat',
        recipient: customer.fullName,
        phone: customer.phone,
        address: customer.address,
        regionCode: customer.regionCode,
      })
    }
    res.status(201).json(result)
  })

  // Shipping choices for the cart and the chosen village, priced on the server.
  app.post('/api/shipping/rates', limiter(30), async (req, res) => {
    const { regionCode, items } = z.object({ regionCode: regionCodeSchema, items: shippingItemsSchema }).parse(req.body)
    res.set('Cache-Control', 'no-store')
    res.json(await quoteShipping(db, options.shippingRates, regionCode, items))
  })

  // Returns status only, never customer data, because anyone with the number can ask.
  app.get('/api/orders/:orderNumber', limiter(60), async (req, res) => {
    const parsed = orderNumberSchema.safeParse(req.params.orderNumber)
    const status = parsed.success ? await orderStatus(db, payments, parsed.data) : null
    if (!status) throw new HttpError(404, 'not_found', 'Pesanan tidak ditemukan.')
    res.set('Cache-Control', 'no-store').json(status)
  })

  app.post('/api/payments/midtrans/notification', async (req, res) => {
    if (!payments) throw new HttpError(503, 'payment_not_configured', 'Pembayaran belum disiapkan.')
    const notification = notificationSchema.parse(req.body)
    if (!payments.verifySignature(notification)) {
      throw new HttpError(403, 'invalid_signature', 'Tanda tangan notifikasi tidak valid.')
    }

    // The notification only says something changed. The status API is the source of truth.
    const payment = (await payments.getStatus(notification.order_id)) ?? {
      orderId: notification.order_id,
      transactionStatus: notification.transaction_status ?? '',
      fraudStatus: notification.fraud_status,
      grossAmount: Number(notification.gross_amount),
      paymentType: notification.payment_type,
    }
    const status = await applyPaymentStatus(db, payment)
    // Unknown orders are acknowledged, so Midtrans test pings do not retry forever.
    res.json({ received: true, status: status ?? 'ignored' })
  })

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

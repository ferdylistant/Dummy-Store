import express, { type RequestHandler } from 'express'
import { z } from 'zod'
import { sessionUser, type Auth } from './auth.js'
import { cartSchema, mergeCart, readCart, replaceCart } from './cart.js'
import type { Selectable } from 'kysely'
import type { Database, Schema } from './db/index.js'
import { HttpError } from './errors.js'
import { regionCodeSchema, resolveVillage, type ResolvedVillage } from './regions.js'

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(30),
  recipient: z.string().trim().min(3, 'Tulis nama penerima.').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,12}$/, 'Nomor ponsel tidak valid.'),
  address: z.string().trim().min(10, 'Tulis alamat lengkap.').max(500),
  /** Village code. Province, city, district, village, and postal code come from it. */
  regionCode: regionCodeSchema,
  isDefault: z.boolean().optional(),
})

export type AddressInput = z.infer<typeof addressSchema>

const preferencesSchema = z.object({
  orderUpdates: z.boolean(),
  promotions: z.boolean(),
})

type AddressRow = Selectable<Schema['addresses']>

const MAX_ADDRESSES = 20

function toAddress(row: AddressRow) {
  return {
    id: row.id,
    label: row.label,
    recipient: row.recipient,
    phone: row.phone,
    address: row.address,
    district: row.district,
    city: row.city,
    province: row.province,
    village: row.village,
    postalCode: row.postal_code,
    /** Null for addresses saved before villages were required. They must be completed. */
    regionCode: row.region_code,
    isDefault: row.is_default,
  }
}

export async function listAddresses(db: Database, userId: string) {
  const rows = await db
    .selectFrom('addresses')
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('is_default', 'desc')
    .orderBy('id', 'desc')
    .execute()
  return rows.map(toAddress)
}

/** The first address becomes the default. A new default replaces the old one. */
/** Region names for a village code, or a clear error when it is not a real village. */
export async function requireVillage(db: Database, code: string): Promise<ResolvedVillage> {
  const region = await resolveVillage(db, code)
  if (!region) throw new HttpError(422, 'unknown_region', 'Desa atau kelurahan tidak ditemukan. Pilih lagi dari daftar.')
  return region
}

export async function saveAddress(db: Database, userId: string, input: AddressInput, id?: number) {
  const region = await requireVillage(db, input.regionCode)
  return db.transaction().execute(async (trx) => {
    const { count } = await trx
      .selectFrom('addresses')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('user_id', '=', userId)
      .executeTakeFirstOrThrow()
    const total = Number(count)
    if (!id && total >= MAX_ADDRESSES) {
      throw new HttpError(422, 'too_many_addresses', `Maksimal ${MAX_ADDRESSES} alamat.`)
    }
    const makeDefault = Boolean(input.isDefault) || total === 0
    if (makeDefault) await trx.updateTable('addresses').set({ is_default: false }).where('user_id', '=', userId).execute()
    const values = {
      label: input.label,
      recipient: input.recipient,
      phone: input.phone,
      address: input.address,
      district: region.district,
      city: region.city,
      province: region.province,
      postal_code: region.postalCode,
      village: region.village,
      region_code: region.regionCode,
    }
    if (id) {
      const updated = await trx
        .updateTable('addresses')
        .set(makeDefault ? { ...values, is_default: true } : values)
        .where('id', '=', id)
        .where('user_id', '=', userId)
        .executeTakeFirst()
      if (Number(updated.numUpdatedRows) === 0) throw new HttpError(404, 'not_found', 'Alamat tidak ditemukan.')
      return id
    }
    const created = await trx
      .insertInto('addresses')
      .values({ ...values, user_id: userId, is_default: makeDefault })
      .returning('id')
      .executeTakeFirstOrThrow()
    return created.id
  })
}

async function deleteAddress(db: Database, userId: string, id: number) {
  await db.transaction().execute(async (trx) => {
    const row = await trx
      .selectFrom('addresses')
      .select('is_default')
      .where('id', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirst()
    if (!row) throw new HttpError(404, 'not_found', 'Alamat tidak ditemukan.')
    await trx.deleteFrom('addresses').where('id', '=', id).execute()
    // Keep one default while any address remains.
    if (row.is_default) {
      const newest = await trx
        .selectFrom('addresses')
        .select('id')
        .where('user_id', '=', userId)
        .orderBy('id', 'desc')
        .limit(1)
        .executeTakeFirst()
      if (newest) await trx.updateTable('addresses').set({ is_default: true }).where('id', '=', newest.id).execute()
    }
  })
}

async function preferences(db: Database, userId: string) {
  const row = await db
    .selectFrom('user_preferences')
    .select(['order_updates', 'promotions'])
    .where('user_id', '=', userId)
    .executeTakeFirst()
  return { orderUpdates: row ? row.order_updates : true, promotions: row?.promotions ?? false }
}

async function orderHistory(db: Database, userId: string) {
  const orders = await db
    .selectFrom('orders')
    .select(['id', 'order_number', 'status', 'total', 'created_at', 'shipping_method'])
    .where('user_id', '=', userId)
    .orderBy('id', 'desc')
    .limit(50)
    .execute()
  const items = orders.length
    ? await db
        .selectFrom('order_items')
        .select(['order_id', 'product_id', 'product_name', 'color', 'size', 'quantity', 'line_total'])
        .where(
          'order_id',
          'in',
          orders.map((order) => order.id),
        )
        .execute()
    : []
  return orders.map((order) => ({
    orderNumber: order.order_number,
    status: order.status,
    total: order.total,
    createdAt: order.created_at,
    shippingMethod: order.shipping_method,
    items: items
      .filter((item) => item.order_id === order.id)
      .map((item) => ({
        productId: item.product_id,
        name: item.product_name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        lineTotal: item.line_total,
      })),
  }))
}
/** Routes under /api/me. Every one of them needs a signed in user. */
export function accountRouter(db: Database, auth: Auth) {
  const router = express.Router()

  const requireUser: RequestHandler = async (req, res, next) => {
    const user = await sessionUser(auth, req.headers)
    if (!user) throw new HttpError(401, 'unauthorized', 'Silakan masuk terlebih dahulu.')
    res.locals.userId = user.id
    next()
  }
  router.use(requireUser)
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  const idParam = z.coerce.number().int().positive()

  router.get('/addresses', async (_req, res) => {
    res.json({ items: await listAddresses(db, res.locals.userId) })
  })

  router.post('/addresses', async (req, res) => {
    const id = await saveAddress(db, res.locals.userId, addressSchema.parse(req.body))
    res.status(201).json((await listAddresses(db, res.locals.userId)).find((item) => item.id === id))
  })

  router.put('/addresses/:id', async (req, res) => {
    const id = await saveAddress(db, res.locals.userId, addressSchema.parse(req.body), idParam.parse(req.params.id))
    res.json((await listAddresses(db, res.locals.userId)).find((item) => item.id === id))
  })

  router.delete('/addresses/:id', async (req, res) => {
    await deleteAddress(db, res.locals.userId, idParam.parse(req.params.id))
    res.status(204).end()
  })

  router.get('/preferences', async (_req, res) => {
    res.json(await preferences(db, res.locals.userId))
  })

  router.put('/preferences', async (req, res) => {
    const input = preferencesSchema.parse(req.body)
    await db
      .insertInto('user_preferences')
      .values({ user_id: res.locals.userId, order_updates: input.orderUpdates, promotions: input.promotions })
      .onConflict((oc) =>
        oc.column('user_id').doUpdateSet({ order_updates: input.orderUpdates, promotions: input.promotions }),
      )
      .execute()
    res.json(await preferences(db, res.locals.userId))
  })

  router.get('/orders', async (_req, res) => {
    res.json({ items: await orderHistory(db, res.locals.userId) })
  })

  // The cart follows the account. The store sends the whole cart after each change.
  router.get('/cart', async (_req, res) => {
    res.json(await readCart(db, res.locals.userId))
  })

  router.put('/cart', async (req, res) => {
    res.json(await replaceCart(db, res.locals.userId, cartSchema.parse(req.body).items))
  })

  // On sign in, the cart built as a guest joins the saved one.
  router.post('/cart/merge', async (req, res) => {
    res.json(await mergeCart(db, res.locals.userId, cartSchema.parse(req.body).items))
  })

  return router
}

import express, { type RequestHandler } from 'express'
import { z } from 'zod'
import { sessionUser, type Auth } from './auth.js'
import { transaction, type Database } from './db/index.js'
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

interface AddressRow {
  id: number
  label: string
  recipient: string
  phone: string
  address: string
  district: string
  city: string
  province: string
  postal_code: string
  village: string | null
  region_code: string | null
  is_default: number
}

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
    isDefault: row.is_default === 1,
  }
}

export function listAddresses(db: Database, userId: string) {
  const rows = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(userId) as unknown as AddressRow[]
  return rows.map(toAddress)
}

/** The first address becomes the default. A new default replaces the old one. */
/** Region names for a village code, or a clear error when it is not a real village. */
export function requireVillage(db: Database, code: string): ResolvedVillage {
  const region = resolveVillage(db, code)
  if (!region) throw new HttpError(422, 'unknown_region', 'Desa atau kelurahan tidak ditemukan. Pilih lagi dari daftar.')
  return region
}

export function saveAddress(db: Database, userId: string, input: AddressInput, id?: number) {
  const region = requireVillage(db, input.regionCode)
  return transaction(db, () => {
    const count = (
      db.prepare('SELECT COUNT(*) AS n FROM addresses WHERE user_id = ?').get(userId) as { n: number }
    ).n
    if (!id && count >= MAX_ADDRESSES) {
      throw new HttpError(422, 'too_many_addresses', `Maksimal ${MAX_ADDRESSES} alamat.`)
    }
    const makeDefault = input.isDefault || count === 0
    if (makeDefault) db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId)

    const values = [
      input.label,
      input.recipient,
      input.phone,
      input.address,
      region.district,
      region.city,
      region.province,
      region.postalCode,
      region.village,
      region.regionCode,
    ] as const

    if (id) {
      const updated = db
        .prepare(
          `UPDATE addresses SET label = ?, recipient = ?, phone = ?, address = ?, district = ?, city = ?,
            province = ?, postal_code = ?, village = ?, region_code = ?, area_id = NULL,
            is_default = CASE WHEN ? THEN 1 ELSE is_default END
           WHERE id = ? AND user_id = ?`,
        )
        .run(...values, makeDefault ? 1 : 0, id, userId)
      if (updated.changes === 0) throw new HttpError(404, 'not_found', 'Alamat tidak ditemukan.')
      return id
    }

    const created = db
      .prepare(
        `INSERT INTO addresses (user_id, label, recipient, phone, address, district, city, province,
          postal_code, village, region_code, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(userId, ...values, makeDefault ? 1 : 0)
    return Number(created.lastInsertRowid)
  })
}

function deleteAddress(db: Database, userId: string, id: number) {
  return transaction(db, () => {
    const row = db
      .prepare('SELECT is_default FROM addresses WHERE id = ? AND user_id = ?')
      .get(id, userId) as { is_default: number } | undefined
    if (!row) throw new HttpError(404, 'not_found', 'Alamat tidak ditemukan.')
    db.prepare('DELETE FROM addresses WHERE id = ?').run(id)
    // Keep one default while any address remains.
    if (row.is_default) {
      db.prepare(
        'UPDATE addresses SET is_default = 1 WHERE id = (SELECT id FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1)',
      ).run(userId)
    }
  })
}

function preferences(db: Database, userId: string) {
  const row = db
    .prepare('SELECT order_updates, promotions FROM user_preferences WHERE user_id = ?')
    .get(userId) as { order_updates: number; promotions: number } | undefined
  return { orderUpdates: row ? row.order_updates === 1 : true, promotions: row?.promotions === 1 }
}

function orderHistory(db: Database, userId: string) {
  const orders = db
    .prepare(
      `SELECT id, order_number, status, total, created_at, shipping_method FROM orders
       WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    )
    .all(userId) as unknown as {
    id: number
    order_number: string
    status: string
    total: number
    created_at: string
    shipping_method: string
  }[]
  const items = db.prepare(
    'SELECT product_id, product_name, color, size, quantity, line_total FROM order_items WHERE order_id = ?',
  )
  return orders.map((order) => ({
    orderNumber: order.order_number,
    status: order.status,
    total: order.total,
    createdAt: order.created_at,
    shippingMethod: order.shipping_method,
    items: (
      items.all(order.id) as unknown as {
        product_id: string
        product_name: string
        color: string
        size: string
        quantity: number
        line_total: number
      }[]
    ).map((item) => ({
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

  router.get('/addresses', (_req, res) => {
    res.json({ items: listAddresses(db, res.locals.userId) })
  })

  router.post('/addresses', (req, res) => {
    const id = saveAddress(db, res.locals.userId, addressSchema.parse(req.body))
    res.status(201).json(listAddresses(db, res.locals.userId).find((item) => item.id === id))
  })

  router.put('/addresses/:id', (req, res) => {
    const id = saveAddress(db, res.locals.userId, addressSchema.parse(req.body), idParam.parse(req.params.id))
    res.json(listAddresses(db, res.locals.userId).find((item) => item.id === id))
  })

  router.delete('/addresses/:id', (req, res) => {
    deleteAddress(db, res.locals.userId, idParam.parse(req.params.id))
    res.status(204).end()
  })

  router.get('/preferences', (_req, res) => {
    res.json(preferences(db, res.locals.userId))
  })

  router.put('/preferences', (req, res) => {
    const input = preferencesSchema.parse(req.body)
    db.prepare(
      `INSERT INTO user_preferences (user_id, order_updates, promotions) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET order_updates = excluded.order_updates, promotions = excluded.promotions`,
    ).run(res.locals.userId, input.orderUpdates ? 1 : 0, input.promotions ? 1 : 0)
    res.json(preferences(db, res.locals.userId))
  })

  router.get('/orders', (_req, res) => {
    res.json({ items: orderHistory(db, res.locals.userId) })
  })

  return router
}

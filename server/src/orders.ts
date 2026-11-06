import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { transaction, type Database } from './db/index.js'
import { HttpError } from './errors.js'
import { shippingCost } from './pricing.js'

const MAX_QUANTITY = 10

export const orderSchema = z.object({
  customer: z.object({
    email: z.email('Email tidak valid.'),
    fullName: z.string().trim().min(3).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^(\+62|62|0)8[0-9]{7,12}$/, 'Nomor ponsel tidak valid.'),
    address: z.string().trim().min(10).max(500),
    city: z.string().trim().min(3).max(120),
    province: z.string().trim().min(3).max(120),
    postalCode: z
      .string()
      .trim()
      .regex(/^[0-9]{5}$/, 'Kode pos harus 5 angka.'),
    notes: z.string().trim().max(200).optional(),
    shippingMethod: z.enum(['reguler', 'ekspres']),
    paymentMethod: z.enum(['transfer', 'ewallet', 'cod']),
  }),
  // Only references are accepted. Prices always come from the database.
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(40),
        color: z.string().min(1).max(60),
        size: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
      }),
    )
    .min(1, 'Keranjang kosong.')
    .max(50),
})

export type OrderInput = z.infer<typeof orderSchema>

export interface OrderResult {
  orderNumber: string
  subtotal: number
  shippingCost: number
  total: number
}

function newOrderNumber() {
  return `DS-${randomBytes(5).toString('hex').toUpperCase()}`
}

/** The same variant sent twice must count against stock as one line. */
function mergeItems(items: OrderInput['items']) {
  const merged = new Map<string, OrderInput['items'][number]>()
  for (const item of items) {
    const key = `${item.productId}|${item.color}|${item.size}`
    const current = merged.get(key)
    merged.set(key, current ? { ...item, quantity: current.quantity + item.quantity } : item)
  }
  return [...merged.values()]
}

export function createOrder(db: Database, input: OrderInput, idempotencyKey?: string): OrderResult {
  if (idempotencyKey) {
    const previous = db
      .prepare(
        'SELECT order_number, subtotal, shipping_cost, total FROM orders WHERE idempotency_key = ?',
      )
      .get(idempotencyKey) as
      | { order_number: string; subtotal: number; shipping_cost: number; total: number }
      | undefined
    if (previous) {
      return {
        orderNumber: previous.order_number,
        subtotal: previous.subtotal,
        shippingCost: previous.shipping_cost,
        total: previous.total,
      }
    }
  }

  const items = mergeItems(input.items)
  const findProduct = db.prepare('SELECT name, price FROM products WHERE id = ?')
  const takeStock = db.prepare(
    'UPDATE variants SET stock = stock - ? WHERE product_id = ? AND color = ? AND size = ? AND stock >= ?',
  )
  const findVariant = db.prepare(
    'SELECT stock FROM variants WHERE product_id = ? AND color = ? AND size = ?',
  )

  return transaction(db, () => {
    const lines = items.map((item) => {
      const product = findProduct.get(item.productId) as
        | { name: string; price: number }
        | undefined
      const variant = findVariant.get(item.productId, item.color, item.size)
      if (!product || !variant) {
        throw new HttpError(422, 'unknown_variant', 'Ada produk yang tidak tersedia lagi.', {
          productId: item.productId,
        })
      }

      const taken = takeStock.run(
        item.quantity,
        item.productId,
        item.color,
        item.size,
        item.quantity,
      )
      if (taken.changes === 0) {
        throw new HttpError(
          409,
          'out_of_stock',
          `Stok ${product.name} (${item.color}, ${item.size}) tidak mencukupi.`,
          { productId: item.productId, color: item.color, size: item.size },
        )
      }

      return { ...item, name: product.name, unitPrice: product.price }
    })

    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    const shipping = shippingCost(subtotal, input.customer.shippingMethod)
    const total = subtotal + shipping
    const orderNumber = newOrderNumber()
    const { customer } = input

    const order = db
      .prepare(
        `INSERT INTO orders (order_number, idempotency_key, email, full_name, phone, address, city,
          province, postal_code, notes, shipping_method, payment_method, subtotal, shipping_cost, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        orderNumber,
        idempotencyKey ?? null,
        customer.email,
        customer.fullName,
        customer.phone,
        customer.address,
        customer.city,
        customer.province,
        customer.postalCode,
        customer.notes || null,
        customer.shippingMethod,
        customer.paymentMethod,
        subtotal,
        shipping,
        total,
      )

    const insertLine = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, color, size, quantity, unit_price, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const line of lines) {
      insertLine.run(
        order.lastInsertRowid,
        line.productId,
        line.name,
        line.color,
        line.size,
        line.quantity,
        line.unitPrice,
        line.unitPrice * line.quantity,
      )
    }

    return { orderNumber, subtotal, shippingCost: shipping, total }
  })
}

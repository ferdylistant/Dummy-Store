import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { transaction, type Database } from './db/index.js'
import { HttpError } from './errors.js'
import type { PaymentGateway, PaymentStatus } from './payments/midtrans.js'
import { shippingCost } from './pricing.js'

const MAX_QUANTITY = 10
export const PAYMENT_EXPIRY_HOURS = 24
/** Time after the payment deadline before an unpaid order is released. */
const EXPIRY_GRACE_MS = 5 * 60_000

export type OrderStatus = 'awaiting_payment' | 'paid' | 'expired' | 'cancelled' | 'refunded'

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

export const orderNumberSchema = z.string().regex(/^DS-[0-9A-F]{10}$/)

export type OrderInput = z.infer<typeof orderSchema>

export interface OrderResult {
  orderNumber: string
  status: OrderStatus
  subtotal: number
  shippingCost: number
  total: number
  payment: { token: string; redirectUrl: string; clientKey: string; scriptUrl: string } | null
}

interface OrderRow {
  id: number
  order_number: string
  status: OrderStatus
  subtotal: number
  shipping_cost: number
  total: number
  snap_token: string | null
  payment_url: string | null
  expires_at: string | null
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

function findOrder(db: Database, column: 'order_number' | 'idempotency_key', value: string) {
  return db
    .prepare(
      `SELECT id, order_number, status, subtotal, shipping_cost, total, snap_token, payment_url, expires_at
       FROM orders WHERE ${column} = ?`,
    )
    .get(value) as OrderRow | undefined
}

function toResult(row: OrderRow, gateway: PaymentGateway): OrderResult {
  return {
    orderNumber: row.order_number,
    status: row.status,
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    total: row.total,
    payment:
      row.status === 'awaiting_payment' && row.snap_token && row.payment_url
        ? {
            token: row.snap_token,
            redirectUrl: row.payment_url,
            clientKey: gateway.clientKey,
            scriptUrl: gateway.scriptUrl,
          }
        : null,
  }
}

/** Takes stock and saves the order in one transaction, before any payment call. */
function reserveOrder(db: Database, input: OrderInput, idempotencyKey?: string) {
  const items = mergeItems(input.items)
  const findProduct = db.prepare('SELECT name, price FROM products WHERE id = ?')
  const findVariant = db.prepare(
    'SELECT stock FROM variants WHERE product_id = ? AND color = ? AND size = ?',
  )
  const takeStock = db.prepare(
    'UPDATE variants SET stock = stock - ? WHERE product_id = ? AND color = ? AND size = ? AND stock >= ?',
  )

  return transaction(db, () => {
    const lines = items.map((item) => {
      const product = findProduct.get(item.productId) as { name: string; price: number } | undefined
      const variant = findVariant.get(item.productId, item.color, item.size)
      if (!product || !variant) {
        throw new HttpError(422, 'unknown_variant', 'Ada produk yang tidak tersedia lagi.', {
          productId: item.productId,
        })
      }

      const taken = takeStock.run(item.quantity, item.productId, item.color, item.size, item.quantity)
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
    const expiresAt = new Date(Date.now() + PAYMENT_EXPIRY_HOURS * 3_600_000).toISOString()
    const { customer } = input

    const order = db
      .prepare(
        `INSERT INTO orders (order_number, idempotency_key, status, email, full_name, phone, address,
          city, province, postal_code, notes, shipping_method, payment_method, subtotal,
          shipping_cost, total, expires_at)
        VALUES (?, ?, 'awaiting_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'midtrans', ?, ?, ?, ?)`,
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
        subtotal,
        shipping,
        total,
        expiresAt,
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

    return { id: Number(order.lastInsertRowid), orderNumber, subtotal, shipping, total, lines }
  })
}

/**
 * Ends an unpaid order and puts its stock back. Only an order still waiting
 * for payment can be released, so stock is never returned twice.
 */
function releaseOrder(db: Database, orderId: number, status: 'expired' | 'cancelled') {
  return transaction(db, () => {
    const updated = db
      .prepare(
        "UPDATE orders SET status = ?, idempotency_key = NULL WHERE id = ? AND status = 'awaiting_payment'",
      )
      .run(status, orderId)
    if (updated.changes === 0) return false

    const items = db
      .prepare('SELECT product_id, color, size, quantity FROM order_items WHERE order_id = ?')
      .all(orderId) as unknown as { product_id: string; color: string; size: string; quantity: number }[]
    const restock = db.prepare(
      'UPDATE variants SET stock = stock + ? WHERE product_id = ? AND color = ? AND size = ?',
    )
    for (const item of items) restock.run(item.quantity, item.product_id, item.color, item.size)
    return true
  })
}

export async function createOrder(
  db: Database,
  gateway: PaymentGateway,
  input: OrderInput,
  options: { siteUrl: string; idempotencyKey?: string },
): Promise<OrderResult> {
  if (options.idempotencyKey) {
    const previous = findOrder(db, 'idempotency_key', options.idempotencyKey)
    if (previous) return toResult(previous, gateway)
  }

  const order = reserveOrder(db, input, options.idempotencyKey)
  const { customer } = input

  try {
    const payment = await gateway.createTransaction({
      orderId: order.orderNumber,
      grossAmount: order.total,
      items: [
        ...order.lines.map((line) => ({
          id: `${line.productId}-${line.color}-${line.size}`,
          name: `${line.name} ${line.color} ${line.size === 'Satu ukuran' ? '' : line.size}`.trim(),
          price: line.unitPrice,
          quantity: line.quantity,
        })),
        ...(order.shipping > 0
          ? [{ id: 'ongkir', name: 'Ongkos kirim', price: order.shipping, quantity: 1 }]
          : []),
      ],
      customer: {
        name: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        postalCode: customer.postalCode,
      },
      expiryHours: PAYMENT_EXPIRY_HOURS,
      finishUrl: `${options.siteUrl}/checkout/berhasil`,
    })

    db.prepare('UPDATE orders SET snap_token = ?, payment_url = ? WHERE id = ?').run(
      payment.token,
      payment.redirectUrl,
      order.id,
    )
  } catch (error) {
    releaseOrder(db, order.id, 'cancelled')
    console.error('Midtrans transaction failed', error)
    throw new HttpError(
      502,
      'payment_unavailable',
      'Pembayaran sedang tidak bisa diproses. Pesanan tidak dibuat, coba lagi sebentar.',
    )
  }

  return toResult(findOrder(db, 'order_number', order.orderNumber)!, gateway)
}

function statusFromGateway(payment: PaymentStatus): OrderStatus | null {
  switch (payment.transactionStatus) {
    case 'settlement':
      return 'paid'
    case 'capture':
      return payment.fraudStatus === 'challenge' ? 'awaiting_payment' : 'paid'
    case 'pending':
      return 'awaiting_payment'
    case 'expire':
      return 'expired'
    case 'deny':
    case 'cancel':
    case 'failure':
      return 'cancelled'
    case 'refund':
    case 'partial_refund':
      return 'refunded'
    default:
      return null
  }
}

/** Applies a payment result. Repeated or out-of-order results change nothing. */
export function applyPaymentStatus(db: Database, payment: PaymentStatus) {
  const order = findOrder(db, 'order_number', payment.orderId)
  if (!order) return null

  if (payment.grossAmount !== order.total) {
    console.error(`Amount mismatch for ${order.order_number}: ${payment.grossAmount} vs ${order.total}`)
    throw new HttpError(422, 'amount_mismatch', 'Jumlah pembayaran tidak sesuai dengan pesanan.')
  }

  const next = statusFromGateway(payment)
  if (!next || next === order.status) return order.status

  if (order.status === 'awaiting_payment') {
    if (next === 'paid') {
      db.prepare(
        "UPDATE orders SET status = 'paid', paid_at = datetime('now'), payment_method = ? WHERE id = ? AND status = 'awaiting_payment'",
      ).run(payment.paymentType ?? 'midtrans', order.id)
    } else if (next === 'expired' || next === 'cancelled') {
      releaseOrder(db, order.id, next)
    }
  } else if (order.status === 'paid' && next === 'refunded') {
    db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(order.id)
  }

  return findOrder(db, 'order_number', order.order_number)!.status
}

/**
 * Status for the order page, checked with Midtrans while it is unpaid. This
 * also keeps local development working when notifications cannot reach it.
 */
export async function orderStatus(db: Database, gateway: PaymentGateway | null, orderNumber: string) {
  let order = findOrder(db, 'order_number', orderNumber)
  if (!order) return null

  if (order.status === 'awaiting_payment' && gateway) {
    let payment: PaymentStatus | null = null
    try {
      payment = await gateway.getStatus(orderNumber)
    } catch (error) {
      console.error('Midtrans status check failed', error)
    }
    if (payment) applyPaymentStatus(db, payment)

    order = findOrder(db, 'order_number', orderNumber)!
    const overdue = order.expires_at && Date.parse(order.expires_at) + EXPIRY_GRACE_MS < Date.now()
    if (order.status === 'awaiting_payment' && overdue && !payment) {
      releaseOrder(db, order.id, 'expired')
      order = findOrder(db, 'order_number', orderNumber)!
    }
  }

  return {
    orderNumber: order.order_number,
    status: order.status,
    total: order.total,
    expiresAt: order.expires_at,
    paymentUrl: order.status === 'awaiting_payment' ? order.payment_url : null,
  }
}

/** Releases orders left unpaid past their deadline. Runs on a timer. */
export async function expireOverdueOrders(db: Database, gateway: PaymentGateway | null) {
  const cutoff = new Date(Date.now() - EXPIRY_GRACE_MS).toISOString()
  const overdue = db
    .prepare("SELECT order_number FROM orders WHERE status = 'awaiting_payment' AND expires_at < ?")
    .all(cutoff) as unknown as { order_number: string }[]
  for (const { order_number } of overdue) await orderStatus(db, gateway, order_number)
  return overdue.length
}

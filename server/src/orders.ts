import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { sql, type Selectable } from 'kysely'
import type { Database, Schema } from './db/index.js'
import { HttpError } from './errors.js'
import type {
  PaymentGateway,
  PaymentInstructions,
  PaymentMethod,
  PaymentStatus,
} from './payments/midtrans.js'
import { chosenShipping, type RateProvider, type ShippingOption } from './shipping.js'
import { regionCodeSchema, type ResolvedVillage } from './regions.js'

const MAX_QUANTITY = 10
/** Transfers get a day. QR codes and e-wallets are paid on the spot, so stock is held for an hour. */
export function paymentExpiryMinutes(method: PaymentMethod) {
  return ['other_qris', 'gopay', 'shopeepay'].includes(method) ? 60 : 24 * 60
}
/** Time after the payment deadline before an unpaid order is released. */
const EXPIRY_GRACE_MS = 5 * 60_000

export type OrderStatus = 'awaiting_payment' | 'paid' | 'expired' | 'cancelled' | 'refunded'

/** Midtrans payment codes the store offers. */
export const PAYMENT_METHODS: readonly [PaymentMethod, ...PaymentMethod[]] = [
  'bca_va',
  'bni_va',
  'bri_va',
  'echannel',
  'permata_va',
  'other_qris',
  'gopay',
  'shopeepay',
  'credit_card',
] as const

export const orderSchema = z.object({
  customer: z.object({
    email: z.email('Email tidak valid.'),
    fullName: z.string().trim().min(3).max(120),
    phone: z
      .string()
      .trim()
      .regex(/^(\+62|62|0)8[0-9]{7,12}$/, 'Nomor ponsel tidak valid.'),
    address: z.string().trim().min(10).max(500),
    /** Village code. The order's region names and postal code come from it. */
    regionCode: regionCodeSchema,
    notes: z.string().trim().max(200).optional(),
    /** "reguler" or "ekspres" with flat rates, or a courier rate such as "jne:reg". */
    shippingMethod: z.string().regex(/^[a-z0-9_-]+(:[a-z0-9_-]+)?$/, 'Pilih pengiriman.').max(60),
    paymentMethod: z.enum(PAYMENT_METHODS),
  }),
  /** Signed in shoppers can keep the address for next time. */
  saveAddress: z.boolean().optional(),
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
  payment: {
    method: PaymentMethod
    instructions: PaymentInstructions
    clientKey: string
    scriptUrl: string
  } | null
}

type OrderRow = Pick<
  Selectable<Schema['orders']>,
  'id' | 'order_number' | 'status' | 'subtotal' | 'shipping_cost' | 'total' | 'payment_method' | 'payment_details' | 'expires_at'
>

function instructionsOf(row: OrderRow): PaymentInstructions | null {
  if (row.status !== 'awaiting_payment' || !row.payment_details) return null
  return row.payment_details as PaymentInstructions
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
    .selectFrom('orders')
    .select(['id', 'order_number', 'status', 'subtotal', 'shipping_cost', 'total', 'payment_method', 'payment_details', 'expires_at'])
    .where(column, '=', value)
    .executeTakeFirst()
}

function toResult(row: OrderRow, gateway: PaymentGateway): OrderResult {
  const instructions = instructionsOf(row)
  return {
    orderNumber: row.order_number,
    status: row.status as OrderStatus,
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    total: row.total,
    payment: instructions
      ? {
          method: row.payment_method as PaymentMethod,
          instructions,
          clientKey: gateway.clientKey,
          scriptUrl: gateway.scriptUrl,
        }
      : null,
  }
}

/** Takes stock and saves the order in one transaction, before any payment call. */
function reserveOrder(
  db: Database,
  input: OrderInput,
  region: ResolvedVillage,
  delivery: { option: ShippingOption; freeShippingMin: number },
  idempotencyKey?: string,
  userId?: string,
) {
  const items = mergeItems(input.items)

  return db.transaction().execute(async (trx) => {
    const lines = []
    for (const item of items) {
      const product = await trx
        .selectFrom('products')
        .select(['name', 'price'])
        .where('id', '=', item.productId)
        .executeTakeFirst()
      // Taking stock only where enough is left keeps two buyers from both getting the last one.
      const taken = product
        ? await trx
            .updateTable('variants')
            .set((eb) => ({ stock: eb('stock', '-', item.quantity) }))
            .where('product_id', '=', item.productId)
            .where('color', '=', item.color)
            .where('size', '=', item.size)
            .where('stock', '>=', item.quantity)
            .executeTakeFirst()
        : null
      if (!product || !taken || Number(taken.numUpdatedRows) === 0) {
        const exists =
          product &&
          (await trx
            .selectFrom('variants')
            .select('stock')
            .where('product_id', '=', item.productId)
            .where('color', '=', item.color)
            .where('size', '=', item.size)
            .executeTakeFirst())
        if (!product || !exists) {
          throw new HttpError(422, 'unknown_variant', 'Ada produk yang tidak tersedia lagi.', {
            productId: item.productId,
          })
        }
        throw new HttpError(409, 'out_of_stock', `Stok ${product.name} (${item.color}, ${item.size}) tidak mencukupi.`, {
          productId: item.productId,
          color: item.color,
          size: item.size,
        })
      }
      lines.push({ ...item, name: product.name, unitPrice: product.price })
    }

    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
    // Free shipping was decided on the quote. If prices moved below the minimum since, the courier price applies.
    const { option } = delivery
    const shipping = option.free && subtotal < delivery.freeShippingMin ? option.originalPrice : option.price
    const total = subtotal + shipping
    const orderNumber = newOrderNumber()
    const expiresAt = new Date(Date.now() + paymentExpiryMinutes(input.customer.paymentMethod) * 60_000)
    const { customer } = input

    const order = await trx
      .insertInto('orders')
      .values({
        order_number: orderNumber,
        idempotency_key: idempotencyKey ?? null,
        user_id: userId ?? null,
        status: 'awaiting_payment',
        email: customer.email,
        full_name: customer.fullName,
        phone: customer.phone,
        address: customer.address,
        district: region.district,
        city: region.city,
        province: region.province,
        postal_code: region.postalCode,
        village: region.village,
        region_code: region.regionCode,
        notes: customer.notes || null,
        // Flat rates keep their key. Courier rates are saved by name, since the id means nothing later.
        shipping_method: option.courier ? option.label : option.id,
        courier: option.courier,
        payment_method: customer.paymentMethod,
        subtotal,
        shipping_cost: shipping,
        total,
        expires_at: expiresAt,
      })
      .returning('id')
      .executeTakeFirstOrThrow()

    await trx
      .insertInto('order_items')
      .values(
        lines.map((line) => ({
          order_id: order.id,
          product_id: line.productId,
          product_name: line.name,
          color: line.color,
          size: line.size,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          line_total: line.unitPrice * line.quantity,
        })),
      )
      .execute()

    return { id: order.id, orderNumber, subtotal, shipping, total, lines }
  })
}

/**
 * Ends an unpaid order and puts its stock back. Only an order still waiting
 * for payment can be released, so stock is never returned twice.
 */
function releaseOrder(db: Database, orderId: number, status: 'expired' | 'cancelled') {
  return db.transaction().execute(async (trx) => {
    const updated = await trx
      .updateTable('orders')
      .set({ status, idempotency_key: null })
      .where('id', '=', orderId)
      .where('status', '=', 'awaiting_payment')
      .executeTakeFirst()
    if (Number(updated.numUpdatedRows) === 0) return false

    const items = await trx
      .selectFrom('order_items')
      .select(['product_id', 'color', 'size', 'quantity'])
      .where('order_id', '=', orderId)
      .execute()
    for (const item of items) {
      await trx
        .updateTable('variants')
        .set((eb) => ({ stock: eb('stock', '+', item.quantity) }))
        .where('product_id', '=', item.product_id)
        .where('color', '=', item.color)
        .where('size', '=', item.size)
        .execute()
    }
    return true
  })
}

export async function createOrder(
  db: Database,
  gateway: PaymentGateway,
  input: OrderInput,
  options: {
    siteUrl: string
    idempotencyKey?: string
    userId?: string
    region: ResolvedVillage
    shippingRates?: RateProvider | null
  },
): Promise<OrderResult> {
  if (options.idempotencyKey) {
    const previous = await findOrder(db, 'idempotency_key', options.idempotencyKey)
    if (previous) return toResult(previous, gateway)
  }

  const { region } = options
  // Priced before the transaction, so a slow courier API never holds stock locks.
  const { quote, option } = await chosenShipping(
    db,
    options.shippingRates,
    input.customer.regionCode,
    mergeItems(input.items),
    input.customer.shippingMethod,
  )
  const order = await reserveOrder(
    db,
    input,
    region,
    { option, freeShippingMin: quote.freeShippingMin },
    options.idempotencyKey,
    options.userId,
  )
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
        address: `${customer.address}, ${region.village}, ${region.district}`,
        city: region.city,
        postalCode: region.postalCode,
      },
      expiryMinutes: paymentExpiryMinutes(customer.paymentMethod),
      finishUrl: `${options.siteUrl}/checkout/berhasil?pesanan=${order.orderNumber}`,
      method: customer.paymentMethod,
    })

    await db
      .updateTable('orders')
      .set({ payment_details: JSON.stringify(payment) })
      .where('id', '=', order.id)
      .execute()
  } catch (error) {
    await releaseOrder(db, order.id, 'cancelled')
    console.error('Midtrans transaction failed', error)
    throw new HttpError(
      502,
      'payment_unavailable',
      'Pembayaran sedang tidak bisa diproses. Pesanan tidak dibuat, coba lagi sebentar.',
    )
  }

  return toResult((await findOrder(db, 'order_number', order.orderNumber))!, gateway)
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
export async function applyPaymentStatus(db: Database, payment: PaymentStatus) {
  const order = await findOrder(db, 'order_number', payment.orderId)
  if (!order) return null

  if (payment.grossAmount !== order.total) {
    console.error(`Amount mismatch for ${order.order_number}: ${payment.grossAmount} vs ${order.total}`)
    throw new HttpError(422, 'amount_mismatch', 'Jumlah pembayaran tidak sesuai dengan pesanan.')
  }

  const next = statusFromGateway(payment)
  if (!next || next === order.status) return order.status as OrderStatus

  if (order.status === 'awaiting_payment') {
    if (next === 'paid') {
      await db
        .updateTable('orders')
        .set({ status: 'paid', paid_at: sql`now()` })
        .where('id', '=', order.id)
        .where('status', '=', 'awaiting_payment')
        .execute()
    } else if (next === 'expired' || next === 'cancelled') {
      await releaseOrder(db, order.id, next)
    }
  } else if (order.status === 'paid' && next === 'refunded') {
    await db.updateTable('orders').set({ status: 'refunded' }).where('id', '=', order.id).execute()
  }

  return (await findOrder(db, 'order_number', order.order_number))!.status as OrderStatus
}

/**
 * Status for the order page, checked with Midtrans while it is unpaid. This
 * also keeps local development working when notifications cannot reach it.
 */
export async function orderStatus(db: Database, gateway: PaymentGateway | null, orderNumber: string) {
  let order = await findOrder(db, 'order_number', orderNumber)
  if (!order) return null

  if (order.status === 'awaiting_payment' && gateway) {
    let payment: PaymentStatus | null = null
    try {
      payment = await gateway.getStatus(orderNumber)
    } catch (error) {
      console.error('Midtrans status check failed', error)
    }
    if (payment) await applyPaymentStatus(db, payment)

    order = (await findOrder(db, 'order_number', orderNumber))!
    const overdue = order.expires_at && new Date(order.expires_at).getTime() + EXPIRY_GRACE_MS < Date.now()
    if (order.status === 'awaiting_payment' && overdue && !payment) {
      await releaseOrder(db, order.id, 'expired')
      order = (await findOrder(db, 'order_number', orderNumber))!
    }
  }

  return {
    orderNumber: order.order_number,
    status: order.status as OrderStatus,
    total: order.total,
    expiresAt: order.expires_at,
    paymentMethod: order.payment_method,
    payment: instructionsOf(order),
  }
}

/** Releases orders left unpaid past their deadline. Runs on a timer. */
export async function expireOverdueOrders(db: Database, gateway: PaymentGateway | null) {
  const cutoff = new Date(Date.now() - EXPIRY_GRACE_MS)
  const overdue = await db
    .selectFrom('orders')
    .select('order_number')
    .where('status', '=', 'awaiting_payment')
    .where('expires_at', '<', cutoff)
    .execute()
  for (const { order_number } of overdue) await orderStatus(db, gateway, order_number)
  return overdue.length
}

/** For the dashboard: cancels an order still waiting for payment and returns its stock. */
export async function cancelUnpaidOrder(db: Database, orderNumber: string) {
  const order = await findOrder(db, 'order_number', orderNumber)
  if (!order || order.status !== 'awaiting_payment') return false
  return releaseOrder(db, order.id, 'cancelled')
}

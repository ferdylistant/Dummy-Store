import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, describe, it } from 'node:test'
import { createApp } from './app.js'
import type { Auth } from './auth.js'
import { testAuth } from './testing/auth.js'
import { sql } from 'kysely'
import { openDatabase, type Database } from './db/index.js'
import { expireOverdueOrders } from './orders.js'
import {
  createMidtransGateway,
  notificationSignature,
  type PaymentGateway,
  type PaymentRequest,
  type PaymentStatus,
} from './payments/midtrans.js'

// Response bodies vary per endpoint, and each test asserts the fields it needs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

const SERVER_KEY = 'SB-Mid-server-test'
const customer = {
  email: 'budi@example.com',
  fullName: 'Budi Santoso',
  phone: '081234567890',
  address: 'Jalan Merdeka No. 10, RT 01',
  // Lebak Gede, Coblong, Kota Bandung, Jawa Barat 40132
  regionCode: '32.73.02.1002',
  shippingMethod: 'reguler',
  paymentMethod: 'bca_va',
}
const hoodie = { productId: 'p007', color: 'Hitam', size: 'L', quantity: 2 }
const mug = { productId: 'p019', color: 'Putih Tulang', size: 'Satu ukuran', quantity: 1 }

/** Real signature checks, with the two network calls replaced. */
function fakeGateway() {
  const real = createMidtransGateway({ serverKey: SERVER_KEY, clientKey: 'SB-Mid-client-test', isProduction: false })
  const requests: PaymentRequest[] = []
  const statuses = new Map<string, PaymentStatus>()
  const gateway: PaymentGateway & { fail: boolean } = {
    ...real,
    fail: false,
    async createTransaction(request) {
      requests.push(request)
      if (gateway.fail) throw new Error('Midtrans down')
      return { kind: 'va', bank: 'bca', number: `va-${request.orderId}` }
    },
    async getStatus(orderId) {
      return statuses.get(orderId) ?? null
    },
  }
  return { gateway, requests, statuses }
}

describe('payments', () => {
  let db: Database
  let server: Server
  let base: string
  let fake: ReturnType<typeof fakeGateway>
  let auth: Auth

  const stock = async (item: typeof hoodie) =>
    (
      await db
        .selectFrom('variants')
        .select('stock')
        .where('product_id', '=', item.productId)
        .where('color', '=', item.color)
        .where('size', '=', item.size)
        .executeTakeFirstOrThrow()
    ).stock
  const resetStock = () =>
    sql`UPDATE variants SET stock = 25 WHERE NOT (color = 'Navy' AND product_id = 'p007' AND size IN ('S', 'M'))`.execute(db)
  const status = async (orderNumber: string) =>
    (await db.selectFrom('orders').select('status').where('order_number', '=', orderNumber).executeTakeFirstOrThrow())
      .status

  const post = async (path: string, body: unknown, headers: Record<string, string> = {}) => {
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
    return { status: response.status, body: (await response.json()) as Json }
  }
  const notify = (orderId: string, transactionStatus: string, grossAmount: string, key = SERVER_KEY) =>
    post('/api/payments/midtrans/notification', {
      order_id: orderId,
      status_code: '200',
      gross_amount: grossAmount,
      transaction_status: transactionStatus,
      signature_key: notificationSignature(orderId, '200', grossAmount, key),
    })

  before(async () => {
    db = await openDatabase(':memory:')
    fake = fakeGateway()
    ;({ auth } = await testAuth(db))
    await new Promise<void>((resolve) => {
      server = createApp(db, {
        corsOrigins: ['http://localhost:3000'],
        siteUrl: 'http://localhost:3000',
        payments: fake.gateway,
        ordersPerMinute: 1000,
        auth,
      }).listen(0, () => resolve())
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  after(async () => {
    server.close()
    await db.destroy()
  })

  beforeEach(async () => {
    fake.gateway.fail = false
    fake.statuses.clear()
    fake.requests.length = 0
    await resetStock()
  })

  it('creates a payment for the server total', async () => {
    const { status: code, body } = await post('/api/orders', { customer, items: [hoodie, mug] })
    assert.equal(code, 201)
    assert.equal(body.status, 'awaiting_payment')
    assert.deepEqual(body.payment.instructions, { kind: 'va', bank: 'bca', number: `va-${body.orderNumber}` })
    assert.equal(body.payment.method, 'bca_va')
    assert.equal(body.payment.clientKey, 'SB-Mid-client-test')
    const request = fake.requests[0]
    assert.equal(request.grossAmount, body.total)
    const itemSum = request.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    assert.equal(itemSum, request.grossAmount, 'Midtrans rejects items that do not add up')
    assert.equal(request.expiryMinutes, 24 * 60)
    assert.equal(request.method, 'bca_va')
    assert.equal(request.finishUrl, `http://localhost:3000/checkout/berhasil?pesanan=${body.orderNumber}`)
  })

  it('holds stock for an hour when paying by QR', async () => {
    const { body } = await post('/api/orders', { customer: { ...customer, paymentMethod: 'other_qris' }, items: [mug] })
    assert.equal(fake.requests[0].expiryMinutes, 60)
    const minutes = (Date.parse(body.expiresAt ?? (await (await fetch(`${base}/api/orders/${body.orderNumber}`)).json() as Json).expiresAt) - Date.now()) / 60_000
    assert.ok(minutes > 58 && minutes <= 60, String(minutes))
  })

  it('lists shipping as its own item', async () => {
    await post('/api/orders', { customer, items: [mug] })
    const shipping = fake.requests[0].items.find((item) => item.id === 'ongkir')
    assert.equal(shipping?.price, 20000)
  })

  it('returns stock and allows a retry when Midtrans fails', async () => {
    fake.gateway.fail = true
    const headers = { 'Idempotency-Key': 'gagal-lalu-ulang' }
    const failed = await post('/api/orders', { customer, items: [hoodie] }, headers)
    assert.equal(failed.status, 502)
    assert.equal(await stock(hoodie), 25)

    fake.gateway.fail = false
    const retried = await post('/api/orders', { customer, items: [hoodie] }, headers)
    assert.equal(retried.status, 201)
    assert.equal(await stock(hoodie), 23)
  })

  it('returns the same payment for a repeated request', async () => {
    const headers = { 'Idempotency-Key': 'satu-pesanan-saja' }
    const first = await post('/api/orders', { customer, items: [hoodie] }, headers)
    const second = await post('/api/orders', { customer, items: [hoodie] }, headers)
    assert.deepEqual(second.body.payment.instructions, first.body.payment.instructions)
    assert.equal(fake.requests.length, 1)
  })

  it('rejects a notification with a forged signature', async () => {
    const { body } = await post('/api/orders', { customer, items: [hoodie] })
    const forged = await notify(body.orderNumber, 'settlement', `${body.total}.00`, 'kunci-palsu')
    assert.equal(forged.status, 403)
    assert.equal(await status(body.orderNumber), 'awaiting_payment')
  })

  it('marks an order paid from a verified notification', async () => {
    const { body } = await post('/api/orders', { customer, items: [hoodie] })
    fake.statuses.set(body.orderNumber, {
      orderId: body.orderNumber,
      transactionStatus: 'settlement',
      grossAmount: body.total,
      paymentType: 'bank_transfer',
    })
    const first = await notify(body.orderNumber, 'settlement', `${body.total}.00`)
    const again = await notify(body.orderNumber, 'settlement', `${body.total}.00`)
    assert.equal(first.body.status, 'paid')
    assert.equal(again.body.status, 'paid')
    assert.equal(await stock(hoodie), 23, 'paid stock stays taken')
  })

  it('trusts the status API over the notification body', async () => {
    const { body } = await post('/api/orders', { customer, items: [hoodie] })
    fake.statuses.set(body.orderNumber, {
      orderId: body.orderNumber,
      transactionStatus: 'pending',
      grossAmount: body.total,
    })
    const result = await notify(body.orderNumber, 'settlement', `${body.total}.00`)
    assert.equal(result.body.status, 'awaiting_payment')
  })

  it('returns stock once when payment expires', async () => {
    const { body } = await post('/api/orders', { customer, items: [hoodie] })
    fake.statuses.set(body.orderNumber, {
      orderId: body.orderNumber,
      transactionStatus: 'expire',
      grossAmount: body.total,
    })
    await notify(body.orderNumber, 'expire', `${body.total}.00`)
    await notify(body.orderNumber, 'expire', `${body.total}.00`)
    assert.equal(await status(body.orderNumber), 'expired')
    assert.equal(await stock(hoodie), 25)
  })

  it('refuses a payment for the wrong amount', async () => {
    const { body } = await post('/api/orders', { customer, items: [hoodie] })
    fake.statuses.set(body.orderNumber, {
      orderId: body.orderNumber,
      transactionStatus: 'settlement',
      grossAmount: 1000,
    })
    const result = await notify(body.orderNumber, 'settlement', '1000.00')
    assert.equal(result.status, 422)
    assert.equal(await status(body.orderNumber), 'awaiting_payment')
  })

  it('keeps a card payment under fraud review waiting', async () => {
    const { body } = await post('/api/orders', { customer, items: [hoodie] })
    fake.statuses.set(body.orderNumber, {
      orderId: body.orderNumber,
      transactionStatus: 'capture',
      fraudStatus: 'challenge',
      grossAmount: body.total,
    })
    const result = await notify(body.orderNumber, 'capture', `${body.total}.00`)
    assert.equal(result.body.status, 'awaiting_payment')
  })

  it('acknowledges notifications for unknown orders', async () => {
    const result = await notify('DS-TIDAKADA00', 'settlement', '1000.00')
    assert.equal(result.status, 200)
    assert.equal(result.body.status, 'ignored')
  })

  it('reports status without customer data and refreshes from Midtrans', async () => {
    const { body } = await post('/api/orders', { customer, items: [hoodie] })
    const waiting = (await (await fetch(`${base}/api/orders/${body.orderNumber}`)).json()) as Json
    assert.equal(waiting.status, 'awaiting_payment')
    assert.equal(waiting.payment.number, `va-${body.orderNumber}`)
    assert.equal(waiting.paymentMethod, 'bca_va')
    assert.equal(JSON.stringify(waiting).includes('budi'), false)

    fake.statuses.set(body.orderNumber, {
      orderId: body.orderNumber,
      transactionStatus: 'settlement',
      grossAmount: body.total,
    })
    const paid = (await (await fetch(`${base}/api/orders/${body.orderNumber}`)).json()) as Json
    assert.equal(paid.status, 'paid')
    assert.equal(paid.payment, null)
  })

  it('answers 404 for a malformed or unknown order number', async () => {
    assert.equal((await fetch(`${base}/api/orders/bukan-nomor`)).status, 404)
    assert.equal((await fetch(`${base}/api/orders/DS-0000000000`)).status, 404)
  })

  it('releases unpaid orders after the deadline', async () => {
    const { body } = await post('/api/orders', { customer, items: [hoodie] })
    await db.updateTable('orders').set({ expires_at: '2000-01-01T00:00:00.000Z' }).where('order_number', '=', body.orderNumber).execute()
    assert.equal(await expireOverdueOrders(db, fake.gateway), 1)
    assert.equal(await status(body.orderNumber), 'expired')
    assert.equal(await stock(hoodie), 25)
  })

  it('refuses orders when Midtrans is not configured', async () => {
    const bare = await new Promise<Server>((resolve) => {
      const instance = createApp(db, { corsOrigins: [], auth }).listen(0, () => resolve(instance))
    })
    const response = await fetch(`http://127.0.0.1:${(bare.address() as AddressInfo).port}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, items: [hoodie] }),
    })
    assert.equal(response.status, 503)
    assert.equal(await stock(hoodie), 25, 'nothing is reserved')
    bare.close()
  })
})

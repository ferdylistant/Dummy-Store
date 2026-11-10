import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, describe, it } from 'node:test'
import { createApp } from './app.js'
import type { Auth } from './auth.js'
import { shopperCookie, testAuth } from './testing/auth.js'
import { sql } from 'kysely'
import { openDatabase, type Database } from './db/index.js'
import { createMidtransGateway, type PaymentGateway } from './payments/midtrans.js'

/** Accepts every payment request, so these tests can focus on orders. */
function testGateway(): PaymentGateway {
  const real = createMidtransGateway({ serverKey: 'test', clientKey: 'test', isProduction: false })
  return {
    ...real,
    createTransaction: async (request) => ({ kind: 'va', bank: 'bca', number: request.orderId }),
    getStatus: async () => null,
  }
}

// Response bodies vary per endpoint, and each test asserts the fields it needs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

const ORIGIN = 'http://localhost:3000'

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

const hoodie = { productId: 'p007', color: 'Hitam', size: 'L', quantity: 1 }
const mug = { productId: 'p019', color: 'Putih Tulang', size: 'Satu ukuran', quantity: 1 }

describe('API', () => {
  let db: Database
  let server: Server
  let base: string
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
  const orderCount = async () =>
    Number((await db.selectFrom('orders').select((eb) => eb.fn.countAll().as('count')).executeTakeFirstOrThrow()).count)

  const get = async (path: string) => {
    const response = await fetch(base + path)
    return { status: response.status, body: (await response.json()) as Json }
  }
  // Ordering needs an account, so every order here is placed signed in.
  let shopper = ''
  const order = async (body: unknown, headers: Record<string, string> = {}) => {
    const response = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: shopper, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
    return { status: response.status, body: (await response.json()) as Json }
  }

  before(async () => {
    db = await openDatabase(':memory:')
    ;({ auth } = await testAuth(db))
    await new Promise<void>((resolve) => {
      server = createApp(db, { corsOrigins: [ORIGIN], ordersPerMinute: 1000, payments: testGateway(), auth }).listen(0, () =>
        resolve(),
      )
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    shopper = await shopperCookie(db, base)
  })

  after(async () => {
    server.close()
    await db.destroy()
  })

  beforeEach(async () => {
    await resetStock()
  })

  describe('catalog', () => {
    it('lists categories in order', async () => {
      const { body } = await get('/api/categories')
      assert.deepEqual(
        body.items.map((item: { slug: string }) => item.slug),
        ['baju', 'celana', 'bandana', 'merchandise'],
      )
    })

    it('paginates products', async () => {
      const { body } = await get('/api/products')
      assert.equal(body.total, 22)
      assert.equal(body.items.length, 12)
      assert.equal(body.pageCount, 2)
    })

    it('filters by category, size, and price', async () => {
      const { body } = await get('/api/products?category=celana&sizes=32&priceMax=300000')
      assert.ok(body.total > 0)
      for (const product of body.items) {
        assert.equal(product.category, 'celana')
        assert.ok(product.sizes.includes('32'))
        assert.ok(product.price <= 300000)
      }
    })

    it('sorts by price', async () => {
      const { body } = await get('/api/products?sort=termurah&pageSize=100')
      const prices = body.items.map((item: { price: number }) => item.price)
      assert.deepEqual(prices, [...prices].sort((a, b) => a - b))
    })

    it('reports sold out variants from stock', async () => {
      const { body } = await get('/api/products/hoodie-fleece')
      assert.deepEqual(body.soldOut, ['Navy|S', 'Navy|M'])
    })

    it('returns 404 for an unknown product', async () => {
      const { status, body } = await get('/api/products/tidak-ada')
      assert.equal(status, 404)
      assert.equal(body.error.code, 'not_found')
    })

    it('rejects an invalid query', async () => {
      const { status } = await get('/api/products?sort=acak')
      assert.equal(status, 422)
    })

    it('returns related products from the same category', async () => {
      const { body } = await get('/api/products/hoodie-fleece/related')
      assert.equal(body.items.length, 4)
      assert.ok(body.items.every((item: { category: string }) => item.category === 'baju'))
    })
  })

  describe('orders', () => {
    it('calculates totals from the database', async () => {
      const { status, body } = await order({ customer, items: [hoodie] })
      assert.equal(status, 201)
      assert.match(body.orderNumber, /^DS-[0-9A-F]{10}$/)
      assert.equal(body.subtotal, 319000)
      assert.equal(body.shippingCost, 0)
      assert.equal(body.total, 319000)
    })

    it('ignores prices sent by the browser', async () => {
      const { body } = await order({
        customer,
        items: [{ ...hoodie, price: 1, unitPrice: 1 }],
        subtotal: 1,
        total: 1,
      })
      assert.equal(body.total, 319000)
    })

    it('charges shipping below the free shipping minimum', async () => {
      const { body } = await order({ customer, items: [mug] })
      assert.equal(body.subtotal, 79000)
      assert.equal(body.shippingCost, 20000)
      assert.equal(body.total, 99000)
    })

    it('always charges express shipping', async () => {
      const { body } = await order({
        customer: { ...customer, shippingMethod: 'ekspres' },
        items: [hoodie],
      })
      assert.equal(body.shippingCost, 35000)
    })

    it('reduces stock', async () => {
      await order({ customer, items: [{ ...hoodie, quantity: 3 }] })
      assert.equal(await stock(hoodie), 22)
    })

    it('refuses a sold out variant', async () => {
      const { status, body } = await order({
        customer,
        items: [{ ...hoodie, color: 'Navy', size: 'S' }],
      })
      assert.equal(status, 409)
      assert.equal(body.error.code, 'out_of_stock')
    })

    it('counts duplicate lines against stock together', async () => {
      await sql`UPDATE variants SET stock = 5 WHERE product_id = 'p007' AND color = 'Hitam' AND size = 'L'`.execute(db)
      const { status } = await order({
        customer,
        items: [
          { ...hoodie, quantity: 3 },
          { ...hoodie, quantity: 3 },
        ],
      })
      assert.equal(status, 409)
      assert.equal(await stock(hoodie), 5)
    })

    it('rolls back everything when one line fails', async () => {
      const before = await orderCount()
      const { status } = await order({
        customer,
        items: [hoodie, { ...hoodie, color: 'Navy', size: 'S' }],
      })
      assert.equal(status, 409)
      assert.equal(await stock(hoodie), 25)
      assert.equal(await orderCount(), before)
    })

    it('refuses an unknown variant', async () => {
      const { status, body } = await order({ customer, items: [{ ...hoodie, size: 'ZZZ' }] })
      assert.equal(status, 422)
      assert.equal(body.error.code, 'unknown_variant')
    })

    it('validates the customer', async () => {
      const { status, body } = await order({
        customer: { ...customer, email: 'bukan-email', regionCode: '32.73' },
        items: [hoodie],
      })
      assert.equal(status, 422)
      assert.deepEqual(
        body.error.details.map((detail: { field: string }) => detail.field).sort(),
        ['customer.email', 'customer.regionCode'],
      )
    })

    it('refuses a village code that does not exist', async () => {
      const { status, body } = await order({ customer: { ...customer, regionCode: '32.73.02.9999' }, items: [hoodie] })
      assert.equal(status, 422)
      assert.equal(body.error.code, 'unknown_region')
    })

    it('limits quantity and refuses an empty cart', async () => {
      assert.equal((await order({ customer, items: [{ ...hoodie, quantity: 11 }] })).status, 422)
      assert.equal((await order({ customer, items: [] })).status, 422)
    })

    it('creates one order for a repeated request', async () => {
      const headers = { 'Idempotency-Key': 'percobaan-pertama' }
      const before = await orderCount()
      const first = await order({ customer, items: [hoodie] }, headers)
      const second = await order({ customer, items: [hoodie] }, headers)
      assert.equal(first.body.orderNumber, second.body.orderNumber)
      assert.equal(await orderCount(), before + 1)
      assert.equal(await stock(hoodie), 24)
    })

    it('answers malformed JSON with a client error', async () => {
      const { status, body } = await order('{bukan json')
      assert.equal(status, 400)
      assert.equal(body.error.code, 'bad_request')
    })
  })

  describe('protection', () => {
    it('allows only configured origins', async () => {
      const allowed = await fetch(`${base}/api/categories`, { headers: { Origin: ORIGIN } })
      const other = await fetch(`${base}/api/categories`, {
        headers: { Origin: 'https://evil.example' },
      })
      assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN)
      assert.equal(other.headers.get('access-control-allow-origin'), null)
    })

    it('hides the framework and sets security headers', async () => {
      const response = await fetch(`${base}/health`)
      assert.equal(response.headers.get('x-powered-by'), null)
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    })

    it('needs an account to order, and uses its email', async () => {
      const before = await stock(hoodie)
      const guest = await order({ customer, items: [hoodie] }, { Cookie: '' })
      assert.equal(guest.status, 401)
      assert.equal(guest.body.error.code, 'login_required')
      assert.equal(await stock(hoodie), before, 'nothing is reserved for a guest')

      const signed = await order({ customer: { ...customer, email: 'orang.lain@example.com' }, items: [hoodie] })
      assert.equal(signed.status, 201)
      const saved = await db.selectFrom('orders').select(['email', 'user_id']).where('order_number', '=', signed.body.orderNumber).executeTakeFirstOrThrow()
      assert.equal(saved.email, 'budi@example.com', 'the account email, not what the form sent')
      assert.ok(saved.user_id)
    })

    it('limits repeated orders', async () => {
      const limited = createApp(db, { corsOrigins: [ORIGIN], ordersPerMinute: 1, payments: testGateway(), auth })
      const limitedServer = await new Promise<Server>((resolve) => {
        const instance = limited.listen(0, () => resolve(instance))
      })
      const url = `http://127.0.0.1:${(limitedServer.address() as AddressInfo).port}/api/orders`
      const send = () =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: shopper },
          body: JSON.stringify({ customer, items: [hoodie] }),
        })
      assert.equal((await send()).status, 201)
      assert.equal((await send()).status, 429)
      limitedServer.close()
    })

    it('rejects a body over the size limit', async () => {
      const { status } = await order({ customer, items: [hoodie], padding: 'x'.repeat(40000) })
      assert.equal(status, 413)
    })
  })
})

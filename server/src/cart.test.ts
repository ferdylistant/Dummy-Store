import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from './app.js'
import { ensureAdmin } from './auth.js'
import { openDatabase, type Database } from './db/index.js'
import { createMidtransGateway } from './payments/midtrans.js'
import { shopperCookie, TEST_ORIGIN, testAuth } from './testing/auth.js'

// Response bodies vary per endpoint, and each test asserts the fields it needs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

describe('saved carts', () => {
  let db: Database
  let server: Server
  let base: string
  let budi = ''
  let sari = ''
  let adminCookie = ''
  /** Two variants with plenty of stock, and one with little. */
  let a: { productId: string; color: string; size: string }
  let b: { productId: string; color: string; size: string }
  let scarce: { productId: string; color: string; size: string; stock: number }

  async function call(path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
    const response = await fetch(base + path, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: {
        Origin: TEST_ORIGIN,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.cookie ? { Cookie: init.cookie } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    const text = await response.text()
    return { status: response.status, body: (text ? JSON.parse(text) : null) as Json }
  }
  const put = (cookie: string, items: unknown[]) => call('/api/me/cart', { method: 'PUT', cookie, body: { items } })
  const quantities = (body: Json) => body.items.map((item: Json) => [item.productId, item.color, item.size, item.quantity])

  before(async () => {
    db = await openDatabase(':memory:')
    const { auth, adminAuth } = await testAuth(db)
    await ensureAdmin(auth, { email: 'admin@example.com', password: 'password' })
    const real = createMidtransGateway({ serverKey: 'test', clientKey: 'test', isProduction: false })
    const payments = {
      ...real,
      createTransaction: async (request: { orderId: string }) => ({ kind: 'va' as const, bank: 'bca' as const, number: request.orderId }),
      getStatus: async () => null,
    }
    await new Promise<void>((resolve) => {
      server = createApp(db, { corsOrigins: [TEST_ORIGIN], auth, adminAuth, payments, ordersPerMinute: 1000 }).listen(0, () => resolve())
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    budi = await shopperCookie(db, base, 'budi@example.com')
    sari = await shopperCookie(db, base, 'sari@example.com')
    const signIn = await fetch(`${base}/api/admin-auth/sign-in/email`, {
      method: 'POST',
      headers: { Origin: TEST_ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'password' }),
    })
    adminCookie = signIn.headers.getSetCookie().map((line) => line.split(';')[0]).join('; ')

    const variants = await db.selectFrom('variants').select(['product_id', 'color', 'size', 'stock']).where('stock', '>=', 20).orderBy('product_id').limit(2).execute()
    ;[a, b] = variants.map((row) => ({ productId: row.product_id, color: row.color, size: row.size }))
    const low = await db.selectFrom('variants').select(['product_id', 'color', 'size']).where('product_id', '!=', a.productId).where('product_id', '!=', b.productId).limit(1).executeTakeFirstOrThrow()
    await db.updateTable('variants').set({ stock: 3 }).where('product_id', '=', low.product_id).where('color', '=', low.color).where('size', '=', low.size).execute()
    scarce = { productId: low.product_id, color: low.color, size: low.size, stock: 3 }
  })

  after(async () => {
    server.close()
    await db.destroy()
  })

  it('belongs to a signed in shopper only', async () => {
    assert.equal((await call('/api/me/cart')).status, 401)
    assert.equal((await put('', [])).status, 401)
    assert.equal((await call('/api/me/cart/merge', { body: { items: [] } })).status, 401)
    assert.deepEqual((await call('/api/me/cart', { cookie: budi })).body.items, [])
  })

  it('keeps the whole cart in order, and checks what it is sent', async () => {
    const saved = await put(budi, [
      { ...b, quantity: 2 },
      { ...a, quantity: 1 },
      { ...b, quantity: 3 },
      { productId: 'tidak-ada', color: 'Hitam', size: 'M', quantity: 1 },
    ])
    assert.equal(saved.status, 200)
    assert.deepEqual(quantities(saved.body), [
      [b.productId, b.color, b.size, 5],
      [a.productId, a.color, a.size, 1],
    ], 'repeats add up, unknown variants are dropped, order kept')
    assert.ok(saved.body.updatedAt)

    // Another device reads the same cart.
    assert.deepEqual(quantities((await call('/api/me/cart', { cookie: budi })).body), quantities(saved.body))
    // Another shopper sees none of it.
    assert.deepEqual((await call('/api/me/cart', { cookie: sari })).body.items, [])

    assert.equal((await put(budi, [{ ...a, quantity: 11 }])).status, 422, 'more than ten')
    assert.equal((await put(budi, [{ ...a, quantity: 0 }])).status, 422)
    assert.equal((await put(budi, Array.from({ length: 51 }, () => ({ ...a, quantity: 1 })))).status, 422, 'too many lines')
    assert.deepEqual(quantities((await put(budi, [{ ...scarce, quantity: 8 }])).body), [[scarce.productId, scarce.color, scarce.size, 3]], 'capped at stock')
    assert.deepEqual((await put(budi, [])).body.items, [], 'emptied')
  })

  it('joins a guest cart into the saved one on sign in', async () => {
    await put(sari, [{ ...a, quantity: 4 }])
    const merged = await call('/api/me/cart/merge', { cookie: sari, body: { items: [{ ...a, quantity: 9 }, { ...scarce, quantity: 5 }, { ...b, quantity: 1 }] } })
    assert.equal(merged.status, 200)
    assert.deepEqual(quantities(merged.body), [
      [a.productId, a.color, a.size, 10],
      [scarce.productId, scarce.color, scarce.size, 3],
      [b.productId, b.color, b.size, 1],
    ], 'saved lines first, sums capped at ten and at stock')
    // An empty guest cart changes nothing.
    assert.deepEqual(quantities((await call('/api/me/cart/merge', { cookie: sari, body: { items: [] } })).body), quantities(merged.body))
  })

  it('drops ordered lines and keeps the rest', async () => {
    await put(budi, [{ ...a, quantity: 1 }, { ...b, quantity: 2 }])
    const order = await call('/api/orders', {
      cookie: budi,
      body: {
        customer: {
          email: 'budi@example.com',
          fullName: 'Budi Santoso',
          phone: '081234567890',
          address: 'Jalan Merdeka No. 10, RT 01',
          regionCode: '32.73.02.1002',
          shippingMethod: 'reguler',
          paymentMethod: 'bca_va',
        },
        items: [{ ...a, quantity: 1 }],
      },
    })
    assert.equal(order.status, 201, JSON.stringify(order.body))
    assert.deepEqual(quantities((await call('/api/me/cart', { cookie: budi })).body), [[b.productId, b.color, b.size, 2]])
  })

  it('shows the cart on the customer page in the dashboard', async () => {
    const user = await db.selectFrom('user' as never).select('id' as never).where('email' as never, '=', 'budi@example.com' as never).executeTakeFirstOrThrow()
    const detail = await call(`/api/admin/customers/${(user as { id: string }).id}`, { cookie: adminCookie })
    assert.equal(detail.status, 200)
    const { cart } = detail.body
    assert.equal(cart.items.length, 1)
    const [line] = cart.items
    assert.equal(line.productId, b.productId)
    assert.equal(line.quantity, 2)
    assert.equal(line.lineTotal, line.price * 2)
    assert.equal(typeof line.stock, 'number')
    assert.equal(typeof line.name, 'string')
    assert.equal(cart.quantity, 2)
    assert.equal(cart.subtotal, line.lineTotal)
    assert.ok(cart.updatedAt)
  })
})

import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, beforeEach, describe, it } from 'node:test'
import { createApp } from './app.js'
import { openDatabase, type Database } from './db/index.js'
import { createMidtransGateway, type PaymentGateway } from './payments/midtrans.js'
import { saveSettings } from './settings.js'
import type { CourierRate, RateProvider } from './shipping.js'
import { testAuth } from './testing/auth.js'

// Each test asserts the fields it needs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

function testGateway(): PaymentGateway {
  const real = createMidtransGateway({ serverKey: 'test', clientKey: 'test', isProduction: false })
  return { ...real, createTransaction: async (request) => ({ kind: 'va', bank: 'bca', number: request.orderId }), getStatus: async () => null }
}

const RATES: CourierRate[] = [
  { id: 'jne:yes', courier: 'JNE', service: 'YES', description: 'Besok sampai', etd: '1 hari', price: 38_000 },
  { id: 'sicepat:reg', courier: 'SiCepat', service: 'REG', description: 'Reguler', etd: '2 - 3 hari', price: 14_000 },
  { id: 'jne:reg', courier: 'JNE', service: 'REG', description: 'Reguler', etd: '2 - 3 hari', price: 17_000 },
]

// Lebak Gede, Coblong, Kota Bandung 40132 and Gubeng, Kota Surabaya.
const BANDUNG = '32.73.02.1002'
const SURABAYA = '35.78.08.1001'

const mug = { productId: 'p019', color: 'Putih Tulang', size: 'Satu ukuran', quantity: 1 }
const hoodie = { productId: 'p007', color: 'Hitam', size: 'L', quantity: 1 }

describe('shipping rates', () => {
  let db: Database
  let server: Server
  let base: string
  const calls: Parameters<RateProvider['rates']>[0][] = []
  let failing = false

  const provider: RateProvider = {
    async rates(input) {
      calls.push(input)
      if (failing) throw new Error('Biteship down')
      return RATES
    },
  }

  const post = async (path: string, body: unknown) => {
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: response.status, body: (await response.json()) as Json }
  }
  const quote = (items: (typeof mug)[], regionCode = BANDUNG) =>
    post('/api/shipping/rates', { regionCode, items: items.map(({ productId, quantity }) => ({ productId, quantity })) })
  const order = (items: (typeof mug)[], shippingMethod: string) =>
    post('/api/orders', {
      customer: {
        email: 'budi@example.com',
        fullName: 'Budi Santoso',
        phone: '081234567890',
        address: 'Jalan Merdeka No. 10, RT 01',
        regionCode: BANDUNG,
        shippingMethod,
        paymentMethod: 'bca_va',
      },
      items,
    })
  const price = async (id: string) =>
    (await db.selectFrom('products').select('price').where('id', '=', id).executeTakeFirstOrThrow()).price

  before(async () => {
    db = await openDatabase(':memory:')
    const { auth } = await testAuth(db)
    await new Promise<void>((resolve) => {
      server = createApp(db, { corsOrigins: [], ordersPerMinute: 1000, payments: testGateway(), auth, shippingRates: provider }).listen(0, () => resolve())
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  after(async () => {
    server.close()
    await db.destroy()
  })

  beforeEach(async () => {
    calls.length = 0
    failing = false
    await saveSettings(db, 'origin', { name: '', phone: '', address: '', regionCode: '' })
    await db.updateTable('variants').set({ stock: 25 }).execute()
  })

  it('uses the flat rates until the shop origin is set', async () => {
    const { status, body } = await quote([mug])
    assert.equal(status, 200)
    assert.equal(body.mode, 'flat')
    assert.equal(body.reason, 'no_origin')
    assert.deepEqual(body.options.map((option: Json) => option.id), ['reguler', 'ekspres'])
    assert.equal(calls.length, 0)
  })

  it('asks couriers from the origin postal code with weights from the database', async () => {
    await saveSettings(db, 'origin', { name: 'Gudang', phone: '', address: 'Jalan Gudang 1', regionCode: SURABAYA })
    const { body } = await quote([{ ...mug, quantity: 2 }])
    assert.equal(body.mode, 'live')
    assert.equal(body.origin, 'Kota Surabaya')
    assert.equal(calls[0].destinationPostalCode, '40132')
    assert.match(calls[0].originPostalCode, /^60\d{3}$/)
    const weight = (await db.selectFrom('products').select('weight_grams').where('id', '=', 'p019').executeTakeFirstOrThrow()).weight_grams
    assert.deepEqual(calls[0].items.map(({ value, weight: grams, quantity }) => ({ value, grams, quantity })), [{ value: await price('p019'), grams: weight, quantity: 2 }])
    assert.equal(body.weightGrams, weight * 2)
    assert.deepEqual(body.options.map((option: Json) => option.id), ['sicepat:reg', 'jne:reg', 'jne:yes'], 'cheapest first')
    assert.equal(body.options[0].free, (await price('p019')) * 2 >= body.freeShippingMin)
  })

  it('makes only the cheapest courier free once the cart reaches the minimum', async () => {
    await saveSettings(db, 'origin', { name: '', phone: '', address: '', regionCode: SURABAYA })
    const store = (await (await fetch(`${base}/api/settings`)).json()) as Json
    assert.ok((await price('p007')) >= store.freeShippingMin, 'hoodie alone reaches the minimum')
    const { body } = await quote([hoodie])
    assert.deepEqual(
      body.options.map((option: Json) => [option.id, option.price, option.free]),
      [
        ['sicepat:reg', 0, true],
        ['jne:reg', 17_000, false],
        ['jne:yes', 38_000, false],
      ],
    )
  })

  it('falls back to the flat rates when couriers fail', async () => {
    await saveSettings(db, 'origin', { name: '', phone: '', address: '', regionCode: SURABAYA })
    failing = true
    const { body } = await quote([mug])
    assert.equal(body.mode, 'flat')
    assert.equal(body.reason, 'unavailable')
  })

  it('charges the courier price the server asked for', async () => {
    await saveSettings(db, 'origin', { name: '', phone: '', address: '', regionCode: SURABAYA })
    const { status, body } = await order([mug], 'jne:yes')
    assert.equal(status, 201, JSON.stringify(body))
    assert.equal(body.shippingCost, 38_000)
    assert.equal(body.total, (await price('p019')) + 38_000)
    const saved = await db
      .selectFrom('orders')
      .select(['shipping_method', 'courier'])
      .where('order_number', '=', body.orderNumber)
      .executeTakeFirstOrThrow()
    assert.deepEqual(saved, { shipping_method: 'JNE YES', courier: 'JNE' })
  })

  it('gives free shipping on the cheapest courier at checkout too', async () => {
    await saveSettings(db, 'origin', { name: '', phone: '', address: '', regionCode: SURABAYA })
    const free = await order([hoodie], 'sicepat:reg')
    assert.equal(free.body.shippingCost, 0)
    const paid = await order([hoodie], 'jne:reg')
    assert.equal(paid.body.shippingCost, 17_000)
  })

  it('refuses a courier that was not offered, and the flat rate once couriers are live', async () => {
    await saveSettings(db, 'origin', { name: '', phone: '', address: '', regionCode: SURABAYA })
    const before = await db.selectFrom('orders').select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow()
    for (const method of ['gratis:ongkir', 'reguler']) {
      const { status, body } = await order([mug], method)
      assert.equal(status, 409, method)
      assert.equal(body.error.code, 'shipping_changed')
    }
    const afterCount = await db.selectFrom('orders').select((eb) => eb.fn.countAll().as('n')).executeTakeFirstOrThrow()
    assert.equal(Number(afterCount.n), Number(before.n), 'no order and no stock taken')
  })

  it('keeps flat rate checkout working without an origin', async () => {
    const { status, body } = await order([mug], 'ekspres')
    assert.equal(status, 201)
    const store = (await (await fetch(`${base}/api/settings`)).json()) as Json
    assert.equal(body.shippingCost, store.flatRates.ekspres)
  })

  it('rejects an unknown village', async () => {
    const { status } = await quote([mug], '99.99.99.9999')
    assert.equal(status, 422)
  })
})

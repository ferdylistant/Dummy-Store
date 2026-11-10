import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import sharp from 'sharp'
import { createApp } from './app.js'
import { ensureAdmin } from './auth.js'
import { openDatabase, type Database } from './db/index.js'
import { createMidtransGateway } from './payments/midtrans.js'
import { TEST_ORIGIN, testAuth } from './testing/auth.js'

// Response bodies vary per endpoint, and each test asserts the fields it needs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

const customer = {
  email: 'pembeli@example.com',
  fullName: 'Budi Santoso',
  phone: '081234567890',
  address: 'Jalan Merdeka No. 10, RT 01',
  regionCode: '32.73.02.1002',
  shippingMethod: 'reguler',
  paymentMethod: 'bca_va',
}

describe('admin', () => {
  let db: Database
  let server: Server
  let base: string
  let adminCookie = ''
  let customerCookie = ''

  async function call(path: string, init: { method?: string; body?: unknown; cookie?: string; raw?: Buffer; type?: string } = {}) {
    const response = await fetch(base + path, {
      method: init.method ?? (init.body !== undefined || init.raw ? 'POST' : 'GET'),
      headers: {
        Origin: TEST_ORIGIN,
        ...(init.raw ? { 'Content-Type': init.type ?? 'image/png' } : init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.cookie ? { Cookie: init.cookie } : {}),
      },
      body: init.raw ? new Uint8Array(init.raw) : init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
    const text = await response.text()
    let body: Json = text
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      // Pictures come back as bytes.
    }
    return { status: response.status, headers: response.headers, body }
  }
  const admin = (path: string, init: Parameters<typeof call>[1] = {}) => call(path, { ...init, cookie: adminCookie })

  async function signIn(email: string, password: string, path = '/api/admin-auth') {
    const response = await fetch(`${base}${path}/sign-in/email`, {
      method: 'POST',
      headers: { Origin: TEST_ORIGIN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    assert.equal(response.status, 200, `sign in ${email}`)
    return response.headers.getSetCookie().map((line) => line.split(';')[0]).join('; ')
  }

  const png = (color: string, width = 900, height = 1200) =>
    sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer()

  async function product(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      name: 'Kaos Uji',
      slug: `kaos-uji-${Math.random().toString(36).slice(2, 8)}`,
      category: 'baju',
      price: 150_000,
      compareAtPrice: null,
      description: 'Kaos katun untuk pengujian dashboard.',
      details: ['Katun 24s'],
      material: 'Katun',
      colors: [{ name: 'Hitam', hex: '#111111' }],
      sizes: ['M', 'L'],
      stock: { 'Hitam|M': 4, 'Hitam|L': 0 },
      weightGrams: 210,
      isNew: true,
      featured: false,
      isActive: true,
      art: 'tee',
      railKind: null,
      images: [],
      railMediaId: null,
      ...overrides,
    }
  }

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
    adminCookie = await signIn('admin@example.com', 'password')

    // A shopper who tries to make themselves admin while signing up.
    const signUp = await call('/api/auth/sign-up/email', {
      body: { name: 'Pelanggan', email: 'pelanggan@example.com', password: 'rahasia-panjang-123', role: 'admin' },
    })
    assert.ok(signUp.status === 200 || signUp.status === 400)
    const { sql } = await import('kysely')
    await sql`UPDATE "user" SET "emailVerified" = true WHERE email = 'pelanggan@example.com'`.execute(db)
    customerCookie = await signIn('pelanggan@example.com', 'rahasia-panjang-123', '/api/auth')
  })

  after(async () => {
    server.close()
    await db.destroy()
  })

  it('keeps guests and shoppers out', async () => {
    assert.equal((await call('/api/admin/overview')).status, 401)
    const shopper = await call('/api/admin/overview', { cookie: customerCookie })
    assert.equal(shopper.status, 401, 'a store session never opens the admin API')
    assert.equal((await admin('/api/admin/overview')).status, 200)
  })

  it('keeps the dashboard and store sessions apart', async () => {
    const send = (path: string, body: unknown) =>
      fetch(base + path, { method: 'POST', headers: { Origin: TEST_ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

    // A shopper cannot sign in to the dashboard, and gets no cookie trying.
    const shopper = await send('/api/admin-auth/sign-in/email', { email: 'pelanggan@example.com', password: 'rahasia-panjang-123' })
    assert.equal(shopper.status, 403, 'the role sent while signing up was ignored')
    assert.equal(((await shopper.json()) as { code?: string }).code, 'NOT_ADMIN')
    assert.equal(shopper.headers.getSetCookie().length, 0)

    // Nobody signs up through the dashboard.
    const signUp = await send('/api/admin-auth/sign-up/email', { name: 'X', email: 'x@example.com', password: 'rahasia-panjang-123' })
    assert.notEqual(signUp.status, 200)

    // The admin signed in to the store is still a guest in the dashboard, and the other way round.
    const storeAdmin = await signIn('admin@example.com', 'password', '/api/auth')
    assert.match(storeAdmin, /^ds\./)
    assert.match(adminCookie, /^dsa\./)
    assert.equal((await call('/api/admin/overview', { cookie: storeAdmin })).status, 401)
    assert.equal((await call('/api/me/addresses', { cookie: adminCookie })).status, 401)
    assert.equal((await call('/api/me/addresses', { cookie: storeAdmin })).status, 200)

    // Signing out of the store leaves the dashboard signed in.
    await fetch(`${base}/api/auth/sign-out`, { method: 'POST', headers: { Origin: TEST_ORIGIN, Cookie: storeAdmin } })
    assert.equal((await admin('/api/admin/overview')).status, 200)
  })

  it('stores uploaded pictures as WebP and serves them for a year', async () => {
    const upload = await admin('/api/admin/media', { raw: await png('#ff0000', 3000, 4000) })
    assert.equal(upload.status, 201)
    assert.ok(upload.body.width <= 1600 && upload.body.height <= 2000, 'large pictures are scaled down')
    const picture = await call(`/api/media/${upload.body.id}`)
    assert.equal(picture.headers.get('content-type'), 'image/webp')
    assert.match(picture.headers.get('cache-control')!, /immutable/)
    assert.equal(picture.headers.get('cross-origin-resource-policy'), 'cross-origin')

    const notImage = await admin('/api/admin/media', { raw: Buffer.from('bukan gambar'), type: 'image/png' })
    assert.equal(notImage.status, 422)
    assert.equal((await call('/api/admin/media', { raw: await png('#00ff00') })).status, 401)
  })

  it('creates a product with pictures, variants, and a sale price', async () => {
    const first = await admin('/api/admin/media', { raw: await png('#123456') })
    const second = await admin('/api/admin/media', { raw: await png('#654321') })
    const input = await product({
      price: 120_000,
      compareAtPrice: 160_000,
      images: [
        { mediaId: second.body.id, alt: 'Tampak belakang' },
        { mediaId: first.body.id, alt: 'Tampak depan' },
      ],
    })
    const created = await admin('/api/admin/products', { body: input })
    assert.equal(created.status, 201)

    const shown = (await call(`/api/products/${input.slug}`)).body
    assert.deepEqual(
      shown.images.map((image: Json) => image.alt),
      ['Tampak belakang', 'Tampak depan'],
      'pictures keep their order',
    )
    assert.match(shown.images[0].url, /\/api\/media\/[0-9a-f]{32}$/)
    assert.equal(shown.compareAtPrice, 160_000)
    assert.equal(shown.weightGrams, 210)
    assert.deepEqual(shown.soldOut, ['Hitam|L'])

    const sale = (await call('/api/home')).body.sale
    assert.ok(sale.some((item: Json) => item.slug === input.slug), 'discounted products fill the sale list')
  })

  it('keeps front, back, and side rail cut-outs, and drops the others without a front', async () => {
    const [front, back, side] = await Promise.all(
      ['#aa0000', '#00aa00', '#0000aa'].map(async (color) => (await admin('/api/admin/media', { raw: await png(color, 400, 620) })).body.id),
    )
    const input = await product({ railKind: 'tee', railMediaId: front, railBackMediaId: back, railSideMediaId: side, railHasHanger: true })
    const created = await admin('/api/admin/products', { body: input })
    assert.equal(created.status, 201)

    const shown = (await call(`/api/products/${input.slug}`)).body
    assert.ok(shown.railImage.endsWith(front))
    assert.ok(shown.railBackImage.endsWith(back))
    assert.ok(shown.railSideImage.endsWith(side))
    assert.equal(shown.railHasHanger, true, 'photos taken on a hanger tell the rail to draw none')
    const detail = (await admin(`/api/admin/products/${created.body.id}`)).body
    assert.deepEqual([detail.railMediaId, detail.railBackMediaId, detail.railSideMediaId], [front, back, side])

    // Older dashboards that send only the front leave no back or side behind.
    await admin(`/api/admin/products/${created.body.id}`, { method: 'PUT', body: { ...input, railMediaId: null } })
    const cleared = (await admin(`/api/admin/products/${created.body.id}`)).body
    assert.deepEqual([cleared.railMediaId, cleared.railBackMediaId, cleared.railSideMediaId], [null, null, null])
    const store = (await call(`/api/products/${input.slug}`)).body
    assert.equal(store.railBackImage, undefined)
    assert.equal(store.railHasHanger, undefined, 'no photo, so the drawn hanger is back')
  })

  it('explains invalid products', async () => {
    const cheaperStrike = await admin('/api/admin/products', { body: await product({ price: 200_000, compareAtPrice: 150_000 }) })
    assert.equal(cheaperStrike.status, 422)
    const slugTaken = await admin('/api/admin/products', { body: await product({ slug: 'hoodie-fleece' }) })
    assert.equal(slugTaken.status, 409)
    const noCategory = await admin('/api/admin/products', { body: await product({ category: 'tidak-ada' }) })
    assert.equal(noCategory.status, 422)
    const unknownPicture = await admin('/api/admin/products', {
      body: await product({ images: [{ mediaId: 'a'.repeat(32), alt: '' }] }),
    })
    assert.equal(unknownPicture.status, 422)
  })

  it('replaces variants when sizes change, and hides inactive products', async () => {
    const input = await product()
    const { id } = (await admin('/api/admin/products', { body: input })).body
    const edited = await admin(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: { ...input, sizes: ['S'], stock: { 'Hitam|S': 9 }, isActive: false },
    })
    assert.equal(edited.status, 200)
    const variants = await db.selectFrom('variants').select(['size', 'stock']).where('product_id', '=', id).execute()
    assert.deepEqual(variants, [{ size: 'S', stock: 9 }])
    assert.equal((await call(`/api/products/${input.slug}`)).status, 404, 'inactive products leave the store')
    const detail = (await admin(`/api/admin/products/${id}`)).body
    assert.equal(detail.isActive, false)
    assert.deepEqual(detail.stock, { 'Hitam|S': 9 })
  })

  it('archives ordered products and deletes the rest', async () => {
    const unused = (await admin('/api/admin/products', { body: await product() })).body.id
    const removed = await admin(`/api/admin/products/${unused}`, { method: 'DELETE' })
    assert.deepEqual(removed.body, { archived: false })

    const order = await call('/api/orders', {
      body: { customer, items: [{ productId: 'p019', color: 'Putih Tulang', size: 'Satu ukuran', quantity: 1 }] },
    })
    assert.equal(order.status, 201)
    const archived = await admin('/api/admin/products/p019', { method: 'DELETE' })
    assert.deepEqual(archived.body, { archived: true })
    assert.equal((await call('/api/products/mug-keramik')).status, 404)
    await db.updateTable('products').set({ is_active: true }).where('id', '=', 'p019').execute()
  })

  it('manages categories and their cover product', async () => {
    const created = await admin('/api/admin/categories', {
      body: {
        slug: 'aksesori',
        name: 'Aksesori',
        description: 'Pelengkap gaya harian.',
        intro: 'Aksesori kecil untuk melengkapi tampilan.',
        art: 'cap',
        artColor: '#334455',
        coverProductId: 'p016',
      },
    })
    assert.equal(created.status, 201)
    const home = (await call('/api/home')).body
    const tile = home.categories.find((category: Json) => category.slug === 'aksesori')
    assert.equal(tile.cover.id, 'p016')
    assert.equal((await admin('/api/admin/categories/baju', { method: 'DELETE' })).status, 409, 'a category with products stays')
    assert.equal((await admin('/api/admin/categories/aksesori', { method: 'DELETE' })).status, 204)
  })

  it('applies store settings to the store and to order totals', async () => {
    const settings = (await admin('/api/admin/settings')).body
    const saved = await admin('/api/admin/settings/store', {
      method: 'PUT',
      body: {
        ...settings.store,
        email: 'cs@toko.example',
        announcement: { enabled: true, text: 'Bebas ongkir mulai {minimum}' },
        freeShippingMin: 50_000,
        flatRates: { reguler: 15_000, ekspres: 30_000 },
      },
    })
    assert.equal(saved.status, 200)
    const shown = (await call('/api/settings')).body
    assert.equal(shown.email, 'cs@toko.example')
    assert.equal(shown.announcement, 'Bebas ongkir mulai Rp 50.000')

    // The mug costs 79,000, above the new minimum, so regular shipping is free.
    const free = await call('/api/orders', {
      body: { customer, items: [{ productId: 'p019', color: 'Putih Tulang', size: 'Satu ukuran', quantity: 1 }] },
    })
    assert.equal(free.body.shippingCost, 0)
    const express = await call('/api/orders', {
      body: {
        customer: { ...customer, shippingMethod: 'ekspres' },
        items: [{ productId: 'p019', color: 'Putih Tulang', size: 'Satu ukuran', quantity: 1 }],
      },
    })
    assert.equal(express.body.shippingCost, 30_000)

    const invalid = await admin('/api/admin/settings/store', { method: 'PUT', body: { ...settings.store, email: 'bukan email' } })
    assert.equal(invalid.status, 422)
    const origin = await admin('/api/admin/settings/origin', {
      method: 'PUT',
      body: { name: 'Gudang', phone: '081234567890', address: 'Jalan Gudang 1', regionCode: '32.73.02.1004' },
    })
    assert.equal(origin.status, 200)
    assert.equal((await call('/api/settings')).body.origin, undefined, 'the origin address stays private')
  })

  it('arranges the home page', async () => {
    const saved = await admin('/api/admin/settings/home', {
      method: 'PUT',
      body: { rail: ['p007', 'p001'], railFeatured: 'p001', featured: ['p019'], newArrivals: [], sale: [] },
    })
    assert.equal(saved.status, 200)
    const home = (await call('/api/home')).body
    assert.deepEqual(home.rail.map((item: Json) => item.id), ['p007', 'p001'])
    assert.equal(home.railFeatured, 'p001')
    assert.deepEqual(home.featured.map((item: Json) => item.id), ['p019'])
    assert.ok(home.newArrivals.length > 0, 'an empty list falls back to new products')
  })

  it('lists, ships, and cancels orders', async () => {
    const placed = await call('/api/orders', {
      body: { customer, items: [{ productId: 'p007', color: 'Hitam', size: 'L', quantity: 2 }] },
    })
    const number = placed.body.orderNumber
    const list = (await admin(`/api/admin/orders?q=${number}`)).body
    assert.equal(list.items.length, 1)
    assert.equal(list.items[0].itemCount, 2)
    const detail = (await admin(`/api/admin/orders/${number}`)).body
    assert.equal(detail.address.village, 'Lebak Gede')
    assert.equal(detail.items[0].name, 'Hoodie Fleece')

    const unpaid = await admin(`/api/admin/orders/${number}/fulfillment`, {
      method: 'PUT',
      body: { fulfillmentStatus: 'shipped', courier: 'JNE', trackingNumber: 'JNE123' },
    })
    assert.equal(unpaid.status, 409, 'unpaid orders cannot ship')

    const stockBefore = await db.selectFrom('variants').select('stock').where('product_id', '=', 'p007').where('color', '=', 'Hitam').where('size', '=', 'L').executeTakeFirstOrThrow()
    assert.equal((await admin(`/api/admin/orders/${number}/cancel`, { body: {} })).status, 200)
    const stockAfter = await db.selectFrom('variants').select('stock').where('product_id', '=', 'p007').where('color', '=', 'Hitam').where('size', '=', 'L').executeTakeFirstOrThrow()
    assert.equal(stockAfter.stock, stockBefore.stock + 2, 'cancelling returns the stock')

    const paid = await call('/api/orders', {
      body: { customer, items: [{ productId: 'p007', color: 'Hitam', size: 'L', quantity: 1 }] },
    })
    await db.updateTable('orders').set({ status: 'paid', paid_at: new Date() }).where('order_number', '=', paid.body.orderNumber).execute()
    const noTracking = await admin(`/api/admin/orders/${paid.body.orderNumber}/fulfillment`, {
      method: 'PUT',
      body: { fulfillmentStatus: 'shipped', courier: 'JNE', trackingNumber: null },
    })
    assert.equal(noTracking.status, 422)
    const shipped = await admin(`/api/admin/orders/${paid.body.orderNumber}/fulfillment`, {
      method: 'PUT',
      body: { fulfillmentStatus: 'shipped', courier: 'JNE', trackingNumber: 'JNE123' },
    })
    assert.equal(shipped.status, 200)
    const overview = (await admin('/api/admin/overview')).body
    assert.ok(overview.revenue.total >= paid.body.total)
    assert.equal(overview.fulfillment.shipped, 1)
    assert.equal((await admin(`/api/admin/orders/${paid.body.orderNumber}/cancel`, { body: {} })).status, 409)
  })

  it('lists customers without the admin', async () => {
    const customers = (await admin('/api/admin/customers')).body.items
    assert.ok(customers.some((item: Json) => item.email === 'pelanggan@example.com'))
    assert.ok(!customers.some((item: Json) => item.email === 'admin@example.com'))
  })
})

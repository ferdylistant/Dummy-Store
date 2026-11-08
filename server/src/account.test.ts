import assert from 'node:assert/strict'
import type { Server } from 'node:http'
import { createServer, type AddressInfo } from 'node:net'
import { after, before, describe, it } from 'node:test'
import { createApp } from './app.js'
import { openDatabase, type Database } from './db/index.js'
import type { Email } from './mail.js'
import { createMidtransGateway } from './payments/midtrans.js'
import type { RegionProvider } from './regions.js'
import { TEST_ORIGIN, testAuth } from './testing/auth.js'

// Response bodies vary per endpoint, and each test asserts the fields it needs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

const PASSWORD = 'rahasia-panjang-123'
const address = {
  label: 'Rumah',
  recipient: 'Budi Santoso',
  phone: '081234567890',
  address: 'Jalan Merdeka No. 10, RT 01',
  district: 'Coblong',
  city: 'Kota Bandung',
  province: 'Jawa Barat',
  postalCode: '40132',
  areaId: 'IDNP9IDNC22IDND1234',
}

const regions: RegionProvider = {
  async search(query) {
    return query.includes('coblong')
      ? [{ id: 'IDNP9IDNC22IDND1234', province: 'Jawa Barat', city: 'Kota Bandung', district: 'Coblong', postalCode: '40132' }]
      : []
  },
}

describe('accounts', () => {
  let db: Database
  let server: Server
  let base: string
  let mails: Email[]

  /** Sends requests like the storefront: from its origin, with the session cookie. */
  function client() {
    let cookie = ''
    return {
      get cookie() {
        return cookie
      },
      async call(
        path: string,
        init: { method?: string; body?: unknown; redirect?: 'manual' | 'follow'; headers?: Record<string, string> } = {},
      ) {
        const response = await fetch(path.startsWith('http') ? path : base + path, {
          method: init.method ?? (init.body ? 'POST' : 'GET'),
          redirect: init.redirect ?? 'follow',
          headers: {
            Origin: TEST_ORIGIN,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...(cookie ? { Cookie: cookie } : {}),
            ...init.headers,
          },
          body: init.body ? JSON.stringify(init.body) : undefined,
        })
        const setCookies = response.headers.getSetCookie()
        if (setCookies.length) {
          const jar = new Map(cookie.split('; ').filter(Boolean).map((part) => part.split('=') as [string, string]))
          for (const line of setCookies) {
            const [pair] = line.split(';')
            const [name, ...value] = pair.split('=')
            jar.set(name, value.join('='))
          }
          cookie = [...jar].filter(([, value]) => value).map(([name, value]) => `${name}=${value}`).join('; ')
        }
        const text = await response.text()
        return { status: response.status, headers: response.headers, body: (text ? JSON.parse(text) : null) as Json }
      },
    }
  }

  const linkIn = (email: Email) => {
    const url = email.text.match(/https?:\/\/\S+/)?.[0]
    assert.ok(url, 'email contains a link')
    return url
  }

  async function verifiedUser(email: string) {
    const user = client()
    await user.call('/api/auth/sign-up/email', {
      body: { name: 'Budi Santoso', email, password: PASSWORD, callbackURL: `${TEST_ORIGIN}/akun` },
    })
    const mail = mails.findLast((item) => item.to === email)!
    await user.call(linkIn(mail), { redirect: 'manual' })
    return user
  }

  before(async () => {
    db = openDatabase(':memory:')
    // Email links need the final URL, so find a free port before creating auth.
    const port = await new Promise<number>((resolve) => {
      const probe = createServer().listen(0, () => {
        const value = (probe.address() as AddressInfo).port
        probe.close(() => resolve(value))
      })
    })
    const created = await testAuth(db, `http://127.0.0.1:${port}`)
    mails = created.mails
    const real = createMidtransGateway({ serverKey: 'test', clientKey: 'test', isProduction: false })
    const payments = {
      ...real,
      createTransaction: async (request: { orderId: string }) => ({ kind: 'va' as const, bank: 'bca' as const, number: request.orderId }),
      getStatus: async () => null,
    }
    await new Promise<void>((resolve) => {
      server = createApp(db, {
        corsOrigins: [TEST_ORIGIN],
        auth: created.auth,
        payments,
        regions,
        ordersPerMinute: 1000,
      }).listen(port, () => resolve())
    })
    base = `http://127.0.0.1:${port}`
  })

  after(() => {
    server.close()
    db.close()
  })

  it('requires email confirmation before signing in', async () => {
    const user = client()
    const signUp = await user.call('/api/auth/sign-up/email', {
      body: { name: 'Sari', email: 'sari@example.com', password: PASSWORD, callbackURL: `${TEST_ORIGIN}/akun` },
    })
    assert.equal(signUp.status, 200)
    assert.equal(mails.at(-1)?.to, 'sari@example.com')
    assert.match(mails.at(-1)!.subject, /Konfirmasi email/)

    // Signing in early sends a fresh link, so the storefront always passes where it should land.
    const early = await user.call('/api/auth/sign-in/email', {
      body: { email: 'sari@example.com', password: PASSWORD, callbackURL: `${TEST_ORIGIN}/akun` },
    })
    assert.equal(early.status, 403)
    assert.equal(mails.filter((item) => item.to === 'sari@example.com').length, 2)

    const verified = await user.call(linkIn(mails.at(-1)!), { redirect: 'manual' })
    assert.equal(verified.status, 302)
    assert.equal(verified.headers.get('location'), `${TEST_ORIGIN}/akun`)
    const session = await user.call('/api/auth/get-session')
    assert.equal(session.body.user.email, 'sari@example.com')
    assert.equal(session.body.user.emailVerified, true)
  })

  it('rejects a short password and a wrong one', async () => {
    const user = client()
    const short = await user.call('/api/auth/sign-up/email', {
      body: { name: 'Rina', email: 'rina@example.com', password: '123' },
    })
    assert.equal(short.status, 400)
    await verifiedUser('dina@example.com')
    const wrong = await client().call('/api/auth/sign-in/email', {
      body: { email: 'dina@example.com', password: 'salah-sekali-123' },
    })
    assert.equal(wrong.status, 401)
  })

  it('keeps account routes private', async () => {
    assert.equal((await client().call('/api/me/addresses')).status, 401)
    assert.equal((await client().call('/api/me/orders')).status, 401)
  })

  it('manages saved addresses with one default', async () => {
    const user = await verifiedUser('alamat@example.com')
    const first = await user.call('/api/me/addresses', { body: address })
    assert.equal(first.status, 201)
    assert.equal(first.body.isDefault, true, 'the first address becomes the default')

    const second = await user.call('/api/me/addresses', { body: { ...address, label: 'Kantor', isDefault: true } })
    const list = (await user.call('/api/me/addresses')).body.items
    assert.equal(list.length, 2)
    assert.equal(list.filter((item: Json) => item.isDefault).length, 1)
    assert.equal(list[0].id, second.body.id)

    const updated = await user.call(`/api/me/addresses/${first.body.id}`, {
      method: 'PUT',
      body: { ...address, label: 'Rumah Ibu' },
    })
    assert.equal(updated.body.label, 'Rumah Ibu')

    await user.call(`/api/me/addresses/${second.body.id}`, { method: 'DELETE' })
    const remaining = (await user.call('/api/me/addresses')).body.items
    assert.equal(remaining.length, 1)
    assert.equal(remaining[0].isDefault, true, 'deleting the default promotes another')

    const invalid = await user.call('/api/me/addresses', { body: { ...address, postalCode: '12' } })
    assert.equal(invalid.status, 422)
  })

  it("never shows or changes another user's address", async () => {
    const owner = await verifiedUser('pemilik@example.com')
    const other = await verifiedUser('lain@example.com')
    const created = await owner.call('/api/me/addresses', { body: address })
    assert.equal((await other.call('/api/me/addresses')).body.items.length, 0)
    const edit = await other.call(`/api/me/addresses/${created.body.id}`, { method: 'PUT', body: address })
    assert.equal(edit.status, 404)
    const remove = await other.call(`/api/me/addresses/${created.body.id}`, { method: 'DELETE' })
    assert.equal(remove.status, 404)
  })

  it('stores notification preferences', async () => {
    const user = await verifiedUser('notif@example.com')
    assert.deepEqual((await user.call('/api/me/preferences')).body, { orderUpdates: true, promotions: false })
    const saved = await user.call('/api/me/preferences', {
      method: 'PUT',
      body: { orderUpdates: false, promotions: true },
    })
    assert.deepEqual(saved.body, { orderUpdates: false, promotions: true })
  })

  it('links orders to the signed in shopper and can save the address', async () => {
    const user = await verifiedUser('pembeli@example.com')
    const order = await user.call('/api/orders', {
      body: {
        customer: {
          email: 'pembeli@example.com',
          fullName: 'Budi Santoso',
          phone: '081234567890',
          address: 'Jalan Merdeka No. 10, RT 01',
          district: 'Coblong',
          city: 'Kota Bandung',
          province: 'Jawa Barat',
          postalCode: '40132',
          areaId: 'IDNP9IDNC22IDND1234',
          shippingMethod: 'reguler',
          paymentMethod: 'gopay',
        },
        items: [{ productId: 'p019', color: 'Putih Tulang', size: 'Satu ukuran', quantity: 1 }],
        saveAddress: true,
      },
    })
    assert.equal(order.status, 201)
    const history = (await user.call('/api/me/orders')).body.items
    assert.equal(history[0].orderNumber, order.body.orderNumber)
    assert.equal(history[0].items[0].name, 'Mug Keramik')
    const saved = (await user.call('/api/me/addresses')).body.items
    assert.equal(saved[0].district, 'Coblong')
    assert.equal(saved[0].areaId, 'IDNP9IDNC22IDND1234')

    const guestOrders = await client().call('/api/me/orders')
    assert.equal(guestOrders.status, 401)
  })

  it('resets a password through the emailed link', async () => {
    await verifiedUser('lupa@example.com')
    const guest = client()
    const request = await guest.call('/api/auth/request-password-reset', {
      body: { email: 'lupa@example.com', redirectTo: `${TEST_ORIGIN}/atur-ulang-password` },
    })
    assert.equal(request.status, 200)
    const mail = mails.findLast((item) => item.to === 'lupa@example.com')!
    assert.match(mail.subject, /Atur ulang password/)
    const landing = await guest.call(linkIn(mail), { redirect: 'manual' })
    const token = new URL(landing.headers.get('location')!).searchParams.get('token')
    assert.ok(token)
    const reset = await guest.call('/api/auth/reset-password', {
      body: { newPassword: 'password-baru-456', token },
    })
    assert.equal(reset.status, 200)
    const signIn = await client().call('/api/auth/sign-in/email', {
      body: { email: 'lupa@example.com', password: 'password-baru-456' },
    })
    assert.equal(signIn.status, 200)
  })

  it('searches regions and reports what is configured', async () => {
    const found = await client().call('/api/regions?q=coblong')
    assert.equal(found.body.items[0].postalCode, '40132')
    assert.equal((await client().call('/api/regions?q=ab')).status, 422)
    const config = await client().call('/api/config')
    assert.deepEqual(config.body, { payments: true, regions: true, google: false })
  })

  it('lists sessions with their device and a real IP, and signs them out', async () => {
    await verifiedUser('sesi@example.com')
    const laptop = client()
    const phone = client()
    const tablet = client()
    const desktopAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36'
    const phoneAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1'
    const signIn = (who: ReturnType<typeof client>, agent: string) =>
      who.call('/api/auth/sign-in/email', {
        body: { email: 'sesi@example.com', password: PASSWORD },
        // A client cannot choose the IP recorded for its session.
        headers: { 'User-Agent': agent, 'X-Forwarded-For': '203.0.113.9' },
      })
    assert.equal((await signIn(laptop, desktopAgent)).status, 200)
    assert.equal((await signIn(phone, phoneAgent)).status, 200)
    assert.equal((await signIn(tablet, phoneAgent)).status, 200)

    const sessions = (await laptop.call('/api/auth/list-sessions')).body as Json[]
    const mine = sessions.filter((item) => item.userAgent === desktopAgent || item.userAgent === phoneAgent)
    assert.equal(mine.length, 3)
    for (const item of mine) {
      assert.equal(item.ipAddress, '127.0.0.1')
      assert.ok(item.token, 'each session carries the token used to revoke it')
    }

    const phoneSession = (await phone.call('/api/auth/get-session')).body.session
    const revoked = await laptop.call('/api/auth/revoke-session', { body: { token: phoneSession.token } })
    assert.equal(revoked.status, 200)
    assert.equal((await phone.call('/api/auth/get-session')).body, null)
    assert.ok((await tablet.call('/api/auth/get-session')).body.session)

    await laptop.call('/api/auth/revoke-other-sessions', { body: {} })
    assert.equal((await tablet.call('/api/auth/get-session')).body, null)
    assert.ok((await laptop.call('/api/auth/get-session')).body.session, 'this device stays signed in')
  })

  it('refuses a payment method the store does not offer', async () => {
    const order = await client().call('/api/orders', {
      body: {
        customer: { ...address, email: 'x@example.com', fullName: 'Budi', shippingMethod: 'reguler', paymentMethod: 'cod' },
        items: [{ productId: 'p019', color: 'Putih Tulang', size: 'Satu ukuran', quantity: 1 }],
      },
    })
    assert.equal(order.status, 422)
  })
})

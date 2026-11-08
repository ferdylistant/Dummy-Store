import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { createMidtransGateway, instructionsFrom, type PaymentMethod } from './payments/midtrans.js'

const realFetch = globalThis.fetch
const gateway = createMidtransGateway({ serverKey: 'SB-Mid-server-x', clientKey: 'SB-Mid-client-x', isProduction: false })

function request(method: PaymentMethod) {
  return {
    orderId: 'DS-0123456789',
    grossAmount: 99000,
    items: [{ id: 'p019', name: 'Mug Keramik', price: 99000, quantity: 1 }],
    customer: {
      name: 'Budi',
      email: 'budi@example.com',
      phone: '081234567890',
      address: 'Jalan Merdeka No. 10',
      city: 'Bandung',
      postalCode: '40132',
    },
    expiryMinutes: 60,
    finishUrl: 'http://localhost:3000/checkout/berhasil?pesanan=DS-0123456789',
    method,
  }
}

/** Replaces fetch once and records what was sent. */
function reply(body: object, status = 200) {
  const sent: { url: string; body: Record<string, unknown> }[] = []
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) })
    return new Response(JSON.stringify(body), { status })
  }) as typeof fetch
  return sent
}

describe('Midtrans Core API', () => {
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('charges a BCA virtual account and returns its number', async () => {
    const sent = reply({ status_code: '201', va_numbers: [{ bank: 'bca', va_number: '812785002530231' }] })
    const result = await gateway.createTransaction(request('bca_va'))
    assert.equal(sent[0].url, 'https://api.sandbox.midtrans.com/v2/charge')
    assert.deepEqual(sent[0].body.bank_transfer, { bank: 'bca' })
    assert.deepEqual(sent[0].body.custom_expiry, { expiry_duration: 60, unit: 'minute' })
    assert.deepEqual(result, { kind: 'va', bank: 'bca', number: '812785002530231' })
  })

  it('maps every method to what the store shows', () => {
    assert.deepEqual(instructionsFrom('permata_va', { permata_va_number: '8500' }), {
      kind: 'va',
      bank: 'permata',
      number: '8500',
    })
    assert.deepEqual(instructionsFrom('echannel', { bill_key: '778347787706', biller_code: '70012' }), {
      kind: 'bill',
      billerCode: '70012',
      billKey: '778347787706',
    })
    assert.deepEqual(
      instructionsFrom('other_qris', {
        qr_string: '000201',
        actions: [{ name: 'generate-qr-code', url: 'https://qr.test' }],
      }),
      { kind: 'qr', provider: 'qris', qrString: '000201', qrUrl: 'https://qr.test', appUrl: null },
    )
    assert.deepEqual(
      instructionsFrom('gopay', {
        actions: [
          { name: 'generate-qr-code', url: 'https://qr.test' },
          { name: 'deeplink-redirect', url: 'gojek://pay' },
        ],
      }),
      { kind: 'qr', provider: 'gopay', qrString: null, qrUrl: 'https://qr.test', appUrl: 'gojek://pay' },
    )
    assert.deepEqual(instructionsFrom('shopeepay', { actions: [{ name: 'deeplink-redirect', url: 'https://shopee.test' }] }), {
      kind: 'app',
      provider: 'shopeepay',
      appUrl: 'https://shopee.test',
    })
    assert.throws(() => instructionsFrom('bni_va', {}), /no payment details/)
  })

  it('treats a refused charge as a failure', async () => {
    reply({ status_code: '402', status_message: 'Payment channel is not activated.' })
    await assert.rejects(gateway.createTransaction(request('bri_va')), /402: Payment channel is not activated/)
  })

  it('sends cards through Snap for 3D Secure', async () => {
    const sent = reply({ token: 'snap-token', redirect_url: 'https://app.sandbox.midtrans.com/snap/v4/x' })
    const result = await gateway.createTransaction(request('credit_card'))
    assert.equal(sent[0].url, 'https://app.sandbox.midtrans.com/snap/v1/transactions')
    assert.deepEqual(sent[0].body.enabled_payments, ['credit_card'])
    assert.equal(result.kind, 'snap')
  })
})

import { createHash, timingSafeEqual } from 'node:crypto'

const TIMEOUT_MS = 10_000

export interface PaymentItem {
  id: string
  name: string
  price: number
  quantity: number
}

export interface PaymentRequest {
  orderId: string
  grossAmount: number
  items: PaymentItem[]
  customer: {
    name: string
    email: string
    phone: string
    address: string
    city: string
    postalCode: string
  }
  expiryMinutes: number
  finishUrl: string
  /** The method the shopper chose in the store. */
  method: PaymentMethod
}

export type PaymentMethod =
  | 'bca_va'
  | 'bni_va'
  | 'bri_va'
  | 'echannel'
  | 'permata_va'
  | 'other_qris'
  | 'gopay'
  | 'shopeepay'
  | 'credit_card'

/**
 * What the store shows the shopper to pay. Cards still go through Snap,
 * because the bank's 3D Secure page has to be hosted by Midtrans.
 */
export type PaymentInstructions =
  | { kind: 'va'; bank: 'bca' | 'bni' | 'bri' | 'permata'; number: string }
  | { kind: 'bill'; billerCode: string; billKey: string }
  | { kind: 'qr'; provider: 'qris' | 'gopay'; qrString: string | null; qrUrl: string | null; appUrl: string | null }
  | { kind: 'app'; provider: 'shopeepay'; appUrl: string }
  | { kind: 'snap'; token: string; redirectUrl: string }

export interface PaymentStatus {
  orderId: string
  transactionStatus: string
  fraudStatus?: string
  grossAmount: number
  paymentType?: string
}

/** The fields Midtrans sends to the notification URL. */
export interface PaymentNotification {
  order_id: string
  status_code: string
  gross_amount: string
  signature_key: string
  transaction_status?: string
  fraud_status?: string
  payment_type?: string
}

export interface PaymentGateway {
  clientKey: string
  scriptUrl: string
  createTransaction(request: PaymentRequest): Promise<PaymentInstructions>
  /** Returns null when Midtrans has no transaction yet, before the shopper picks a method. */
  getStatus(orderId: string): Promise<PaymentStatus | null>
  verifySignature(notification: PaymentNotification): boolean
}

export function notificationSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
) {
  return createHash('sha512').update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest('hex')
}

/** Midtrans limits item names to 50 characters. */
function clip(value: string, length = 50) {
  return value.length > length ? value.slice(0, length) : value
}

interface ChargeResponse {
  status_code?: string
  status_message?: string
  va_numbers?: { bank: string; va_number: string }[]
  permata_va_number?: string
  bill_key?: string
  biller_code?: string
  qr_string?: string
  actions?: { name: string; url: string }[]
}

function chargeBody(request: PaymentRequest) {
  switch (request.method) {
    case 'bca_va':
      return { payment_type: 'bank_transfer', bank_transfer: { bank: 'bca' } }
    case 'bni_va':
      return { payment_type: 'bank_transfer', bank_transfer: { bank: 'bni' } }
    case 'bri_va':
      return { payment_type: 'bank_transfer', bank_transfer: { bank: 'bri' } }
    case 'permata_va':
      return { payment_type: 'permata' }
    case 'echannel':
      return { payment_type: 'echannel', echannel: { bill_info1: 'Pembayaran:', bill_info2: 'Dummy Store' } }
    case 'other_qris':
      return { payment_type: 'qris', qris: { acquirer: 'gopay' } }
    case 'gopay':
      return { payment_type: 'gopay', gopay: { enable_callback: true, callback_url: request.finishUrl } }
    case 'shopeepay':
      return { payment_type: 'shopeepay', shopeepay: { callback_url: request.finishUrl } }
    default:
      throw new Error(`Unsupported method ${request.method}`)
  }
}

/** Turns a Core API charge reply into what the store shows. */
export function instructionsFrom(method: PaymentMethod, body: ChargeResponse): PaymentInstructions {
  const action = (name: string) => body.actions?.find((item) => item.name === name)?.url ?? null
  switch (method) {
    case 'bca_va':
    case 'bni_va':
    case 'bri_va': {
      const number = body.va_numbers?.[0]?.va_number
      if (!number) break
      return { kind: 'va', bank: method.slice(0, 3) as 'bca' | 'bni' | 'bri', number }
    }
    case 'permata_va':
      if (!body.permata_va_number) break
      return { kind: 'va', bank: 'permata', number: body.permata_va_number }
    case 'echannel':
      if (!body.bill_key || !body.biller_code) break
      return { kind: 'bill', billerCode: body.biller_code, billKey: body.bill_key }
    case 'other_qris':
    case 'gopay': {
      const qrUrl = action('generate-qr-code')
      if (!body.qr_string && !qrUrl) break
      return {
        kind: 'qr',
        provider: method === 'gopay' ? 'gopay' : 'qris',
        qrString: body.qr_string ?? null,
        qrUrl,
        appUrl: action('deeplink-redirect'),
      }
    }
    case 'shopeepay': {
      const appUrl = action('deeplink-redirect')
      if (!appUrl) break
      return { kind: 'app', provider: 'shopeepay', appUrl }
    }
  }
  throw new Error(`Midtrans charge for ${method} returned no payment details`)
}

export function createMidtransGateway(options: {
  serverKey: string
  clientKey: string
  isProduction: boolean
}): PaymentGateway {
  const snapBase = options.isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com'
  const apiBase = options.isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com'
  const authorization = `Basic ${Buffer.from(`${options.serverKey}:`).toString('base64')}`
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: authorization,
  }

  /** Sends a request to Midtrans and fails on anything but success or pending. */
  async function call<T>(url: string, payload: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify(payload),
    })
    const body = (await response.json().catch(() => ({}))) as T & {
      status_code?: string
      status_message?: string
      error_messages?: string[]
    }
    const code = Number(body.status_code ?? response.status)
    if (!response.ok || code >= 300) {
      const detail = body.error_messages?.join('; ') ?? body.status_message ?? ''
      throw new Error(`Midtrans ${code}: ${detail}`)
    }
    return body
  }

  return {
    clientKey: options.clientKey,
    scriptUrl: `${snapBase}/snap/snap.js`,

    async createTransaction(request) {
      const { customer } = request
      const common = {
        transaction_details: { order_id: request.orderId, gross_amount: request.grossAmount },
        item_details: request.items.map((item) => ({
          id: clip(item.id),
          name: clip(item.name),
          price: item.price,
          quantity: item.quantity,
        })),
        customer_details: {
          first_name: clip(customer.name, 255),
          email: customer.email,
          phone: customer.phone,
          shipping_address: {
            first_name: clip(customer.name, 255),
            phone: customer.phone,
            address: clip(customer.address, 200),
            city: clip(customer.city, 100),
            postal_code: customer.postalCode,
            country_code: 'IDN',
          },
        },
      }

      if (request.method === 'credit_card') {
        const body = await call<{ token?: string; redirect_url?: string }>(`${snapBase}/snap/v1/transactions`, {
          ...common,
          expiry: { unit: 'minutes', duration: request.expiryMinutes },
          enabled_payments: ['credit_card'],
          credit_card: { secure: true },
          callbacks: { finish: request.finishUrl },
        })
        if (!body.token || !body.redirect_url) throw new Error('Midtrans Snap returned no token')
        return { kind: 'snap', token: body.token, redirectUrl: body.redirect_url }
      }

      const body = await call<ChargeResponse>(`${apiBase}/v2/charge`, {
        ...common,
        ...chargeBody(request),
        custom_expiry: { expiry_duration: request.expiryMinutes, unit: 'minute' },
      })
      return instructionsFrom(request.method, body)
    },

    async getStatus(orderId) {
      const response = await fetch(`${apiBase}/v2/${encodeURIComponent(orderId)}/status`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const body = (await response.json().catch(() => ({}))) as {
        status_code?: string
        transaction_status?: string
        fraud_status?: string
        gross_amount?: string
        payment_type?: string
        status_message?: string
      }
      if (response.status === 404 || body.status_code === '404') return null
      if (!response.ok || !body.transaction_status) {
        throw new Error(`Midtrans status ${response.status}: ${body.status_message ?? ''}`)
      }
      return {
        orderId,
        transactionStatus: body.transaction_status,
        fraudStatus: body.fraud_status,
        grossAmount: Number(body.gross_amount),
        paymentType: body.payment_type,
      }
    },

    verifySignature(notification) {
      const expected = Buffer.from(
        notificationSignature(
          notification.order_id,
          notification.status_code,
          notification.gross_amount,
          options.serverKey,
        ),
      )
      const received = Buffer.from(notification.signature_key)
      return expected.length === received.length && timingSafeEqual(expected, received)
    },
  }
}

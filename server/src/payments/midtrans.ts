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
  expiryHours: number
  finishUrl: string
  /** Opens Snap straight on the method the shopper chose in the store. */
  enabledPayments: string[]
}

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
  createTransaction(request: PaymentRequest): Promise<{ token: string; redirectUrl: string }>
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

  return {
    clientKey: options.clientKey,
    scriptUrl: `${snapBase}/snap/snap.js`,

    async createTransaction(request) {
      const { customer } = request
      const response = await fetch(`${snapBase}/snap/v1/transactions`, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({
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
          expiry: { unit: 'hours', duration: request.expiryHours },
          enabled_payments: request.enabledPayments,
          callbacks: { finish: request.finishUrl },
        }),
      })

      const body = (await response.json().catch(() => ({}))) as {
        token?: string
        redirect_url?: string
        error_messages?: string[]
      }
      if (!response.ok || !body.token || !body.redirect_url) {
        throw new Error(`Midtrans ${response.status}: ${(body.error_messages ?? []).join('; ')}`)
      }
      return { token: body.token, redirectUrl: body.redirect_url }
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

import type { CartItem } from '@/features/cart/store'
import type { CheckoutValues } from '@/features/checkout/schema'
import { apiGet, apiPost } from './api'

export type OrderStatus = 'awaiting_payment' | 'paid' | 'expired' | 'cancelled' | 'refunded'

export interface OrderRequest {
  customer: CheckoutValues
  items: CartItem[]
  /** Signed in shoppers can keep this address for next time. */
  saveAddress?: boolean
}

/** What the store shows the shopper to pay. Mirrors server/src/payments/midtrans.ts. */
export type PaymentInstructions =
  | { kind: 'va'; bank: 'bca' | 'bni' | 'bri' | 'permata'; number: string }
  | { kind: 'bill'; billerCode: string; billKey: string }
  | { kind: 'qr'; provider: 'qris' | 'gopay'; qrString: string | null; qrUrl: string | null; appUrl: string | null }
  | { kind: 'app'; provider: 'shopeepay'; appUrl: string }
  | { kind: 'snap'; token: string; redirectUrl: string }

export interface OrderResult {
  orderNumber: string
  status: OrderStatus
  subtotal: number
  shippingCost: number
  total: number
  /** How to pay, while the order waits for payment. */
  payment: {
    method: string
    instructions: PaymentInstructions
    clientKey: string
    scriptUrl: string
  } | null
}

export interface OrderStatusView {
  orderNumber: string
  status: OrderStatus
  total: number
  expiresAt: string | null
  paymentMethod: string
  payment: PaymentInstructions | null
}

/**
 * Sends product references only. The API works out prices, stock, and totals
 * from its own data. The key stops a retry from creating a second order.
 */
export function createOrder(order: OrderRequest, idempotencyKey: string) {
  return apiPost<OrderResult>('/orders', order, { 'Idempotency-Key': idempotencyKey })
}

export function getOrderStatus(orderNumber: string) {
  return apiGet<OrderStatusView>(`/orders/${encodeURIComponent(orderNumber)}`)
}

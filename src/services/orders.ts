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

export interface OrderResult {
  orderNumber: string
  status: OrderStatus
  subtotal: number
  shippingCost: number
  total: number
  /** Snap details while the order waits for payment. */
  payment: { token: string; redirectUrl: string; clientKey: string; scriptUrl: string } | null
}

export interface OrderStatusView {
  orderNumber: string
  status: OrderStatus
  total: number
  expiresAt: string | null
  paymentUrl: string | null
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

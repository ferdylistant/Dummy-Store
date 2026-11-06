import type { CartItem } from '@/features/cart/store'
import type { CheckoutValues } from '@/features/checkout/schema'
import { apiPost } from './api'

export interface OrderRequest {
  customer: CheckoutValues
  items: CartItem[]
}

export interface OrderResult {
  orderNumber: string
  subtotal: number
  shippingCost: number
  total: number
}

/**
 * Sends product references only. The API works out prices, stock, and totals
 * from its own data. The key stops a retry from creating a second order.
 */
export function createOrder(order: OrderRequest, idempotencyKey: string) {
  return apiPost<OrderResult>('/orders', order, { 'Idempotency-Key': idempotencyKey })
}

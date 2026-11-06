import type { CheckoutValues } from '@/features/checkout/schema'
import type { CartItem } from '@/features/cart/store'

export interface OrderRequest {
  customer: CheckoutValues
  items: CartItem[]
}

export interface OrderResult {
  orderNumber: string
}

/*
 * Mock only. The Express API must recalculate prices, stock, and totals from
 * its own data, because anything sent from the browser can be manipulated.
 */
export async function createOrder(order: OrderRequest): Promise<OrderResult> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  const suffix = Date.now().toString(36).toUpperCase().slice(-6)
  return { orderNumber: `DS-${order.items.length}${suffix}` }
}

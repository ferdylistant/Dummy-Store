export const FREE_SHIPPING_MIN = 300000

export const SHIPPING_COST = {
  reguler: 20000,
  ekspres: 35000,
} as const

export type ShippingMethod = keyof typeof SHIPPING_COST

export function shippingCost(subtotal: number, method: ShippingMethod) {
  if (method === 'reguler' && subtotal >= FREE_SHIPPING_MIN) return 0
  return SHIPPING_COST[method]
}

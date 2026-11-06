export const FREE_SHIPPING_MIN = 300000
export const RETURN_DAYS = 14

export const SHIPPING_OPTIONS = {
  reguler: { label: 'Reguler', eta: '2 sampai 5 hari kerja', cost: 20000 },
  ekspres: { label: 'Ekspres', eta: '1 sampai 2 hari kerja', cost: 35000 },
} as const

export type ShippingMethod = keyof typeof SHIPPING_OPTIONS

/** Display estimate only. The backend must calculate the final amount. */
export function shippingCost(subtotal: number, method: ShippingMethod) {
  if (method === 'reguler' && subtotal >= FREE_SHIPPING_MIN) return 0
  return SHIPPING_OPTIONS[method].cost
}

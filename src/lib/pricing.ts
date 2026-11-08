import type { StoreSettings } from '@/services/store'

export const SHIPPING_OPTIONS = {
  reguler: { label: 'Reguler', eta: '2 sampai 5 hari kerja' },
  ekspres: { label: 'Ekspres', eta: '1 sampai 2 hari kerja' },
} as const

export type ShippingMethod = keyof typeof SHIPPING_OPTIONS

type Rates = Pick<StoreSettings, 'freeShippingMin' | 'flatRates'>

/** Display estimate only. The API decides the amount charged, from the same settings. */
export function shippingCost(subtotal: number, method: ShippingMethod, store: Rates) {
  if (method === 'reguler' && subtotal >= store.freeShippingMin) return 0
  return store.flatRates[method]
}

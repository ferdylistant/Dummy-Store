import type { Settings } from './settings.js'

export type ShippingMethod = 'reguler' | 'ekspres'

/** Flat rates and the free shipping minimum come from the store settings. */
export function shippingCost(subtotal: number, method: ShippingMethod, store: Settings['store']) {
  if (method === 'reguler' && subtotal >= store.freeShippingMin) return 0
  return store.flatRates[method]
}

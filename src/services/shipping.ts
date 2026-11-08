import { apiPost } from './api'

/** Mirrors ShippingOption in server/src/shipping.ts. */
export interface ShippingOption {
  /** "reguler", "ekspres", or a courier rate such as "jne:reg". */
  id: string
  label: string
  courier: string | null
  description: string
  etd: string
  /** What the shopper pays, after free shipping. */
  price: number
  originalPrice: number
  free: boolean
}

export interface ShippingQuote {
  /** live: courier rates from the shop. flat: the store's fixed rates. */
  mode: 'live' | 'flat'
  reason?: 'no_provider' | 'no_origin' | 'unavailable' | 'no_rates'
  /** The city the parcel leaves from, when couriers priced it. */
  origin: string | null
  subtotal: number
  weightGrams: number
  freeShippingMin: number
  options: ShippingOption[]
}

/** Shipping choices for the cart to a village, priced by the API. */
export function getShippingQuote(regionCode: string, items: { productId: string; quantity: number }[]) {
  return apiPost<ShippingQuote>('/shipping/rates', { regionCode, items })
}

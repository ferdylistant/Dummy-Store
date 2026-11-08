import { z } from 'zod'
import type { Database } from './db/index.js'
import { HttpError } from './errors.js'
import { resolveVillage } from './regions.js'
import { getSettings, type Settings } from './settings.js'

/** One line of the parcel, as couriers price it. */
export interface RateItem {
  name: string
  value: number
  weight: number
  quantity: number
}

export interface CourierRate {
  /** "jne:reg". Stable for the same courier service. */
  id: string
  courier: string
  service: string
  description: string
  /** "1 - 2 hari". Empty when the courier gives none. */
  etd: string
  price: number
}

export interface RateProvider {
  rates(input: { originPostalCode: string; destinationPostalCode: string; items: RateItem[] }): Promise<CourierRate[]>
}

/** Couriers asked for a price. Each must be active in the Biteship account. */
export const DEFAULT_COURIERS = 'jne,jnt,sicepat,anteraja,pos,tiki,ninja,lion,idexpress,sap'

const CACHE_MS = 10 * 60_000
const CACHE_LIMIT = 500

const durationUnit: Record<string, string> = { days: 'hari', hours: 'jam', day: 'hari', hour: 'jam' }

/** Live rates from Biteship. Answers are kept ten minutes, since checkout asks again on submit. */
export function createBiteshipRates(apiKey: string, couriers = DEFAULT_COURIERS): RateProvider {
  const cache = new Map<string, { at: number; rates: CourierRate[] }>()

  return {
    async rates({ originPostalCode, destinationPostalCode, items }) {
      const key = JSON.stringify([originPostalCode, destinationPostalCode, items])
      const cached = cache.get(key)
      if (cached && Date.now() - cached.at < CACHE_MS) return cached.rates

      const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
        method: 'POST',
        headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_postal_code: Number(originPostalCode),
          destination_postal_code: Number(destinationPostalCode),
          couriers,
          items: items.map((item) => ({ ...item, weight: Math.max(1, item.weight) })),
        }),
        signal: AbortSignal.timeout(10_000),
      })
      const body = (await response.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
        pricing?: {
          courier_name?: string
          courier_code?: string
          courier_service_name?: string
          courier_service_code?: string
          description?: string
          shipment_duration_range?: string
          shipment_duration_unit?: string
          price?: number
        }[]
      }
      if (!response.ok || body.success === false) throw new Error(`Biteship ${response.status}: ${body.error ?? ''}`)

      const rates = (body.pricing ?? [])
        .filter((rate) => rate.courier_code && rate.courier_service_code && typeof rate.price === 'number')
        .map((rate) => ({
          id: `${rate.courier_code}:${rate.courier_service_code}`.toLowerCase(),
          courier: rate.courier_name ?? rate.courier_code!.toUpperCase(),
          service: rate.courier_service_name ?? rate.courier_service_code!,
          description: rate.description ?? '',
          etd: rate.shipment_duration_range
            ? `${rate.shipment_duration_range} ${durationUnit[rate.shipment_duration_unit ?? 'days'] ?? rate.shipment_duration_unit}`
            : '',
          price: Math.round(rate.price!),
        }))

      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
      cache.set(key, { at: Date.now(), rates })
      return rates
    },
  }
}

export interface ShippingOption {
  id: string
  /** "JNE Reguler" or "Reguler". */
  label: string
  courier: string | null
  description: string
  etd: string
  /** What the shopper pays, after free shipping. */
  price: number
  /** The courier's price before free shipping. */
  originalPrice: number
  free: boolean
}

export interface ShippingQuote {
  /** live: courier rates from the shop's origin. flat: the store's fixed rates. */
  mode: 'live' | 'flat'
  /** Why the flat rates are used, for the dashboard and logs. */
  reason?: 'no_provider' | 'no_origin' | 'unavailable' | 'no_rates'
  origin: string | null
  subtotal: number
  weightGrams: number
  freeShippingMin: number
  options: ShippingOption[]
}

export const FLAT_OPTIONS = {
  reguler: { label: 'Reguler', etd: '2 sampai 5 hari kerja' },
  ekspres: { label: 'Ekspres', etd: '1 sampai 2 hari kerja' },
} as const

export const shippingItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(40),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .min(1)
  .max(50)

function flatOptions(subtotal: number, store: Settings['store']): ShippingOption[] {
  return (['reguler', 'ekspres'] as const).map((method) => {
    const originalPrice = store.flatRates[method]
    const free = method === 'reguler' && subtotal >= store.freeShippingMin
    return {
      id: method,
      label: FLAT_OPTIONS[method].label,
      courier: null,
      description: '',
      etd: FLAT_OPTIONS[method].etd,
      price: free ? 0 : originalPrice,
      originalPrice,
      free,
    }
  })
}

/**
 * Shipping choices for a cart going to a village. Prices and weights come
 * from the database, never from the browser. Courier rates need the shop's
 * origin from the dashboard and a Biteship key. Without them, or when
 * Biteship fails, the store's flat rates apply so checkout keeps working.
 * Free shipping makes the cheapest courier free once the cart reaches the minimum.
 */
export async function quoteShipping(
  db: Database,
  provider: RateProvider | null | undefined,
  regionCode: string,
  items: { productId: string; quantity: number }[],
): Promise<ShippingQuote> {
  const ids = [...new Set(items.map((item) => item.productId))]
  const products = await db
    .selectFrom('products')
    .select(['id', 'name', 'price', 'weight_grams'])
    .where('id', 'in', ids)
    .where('is_active', '=', true)
    .execute()
  const byId = new Map(products.map((product) => [product.id, product]))
  const parcel = items
    .map((item) => ({ product: byId.get(item.productId), quantity: item.quantity }))
    .filter((line): line is { product: (typeof products)[number]; quantity: number } => Boolean(line.product))
  const subtotal = parcel.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const weightGrams = parcel.reduce((sum, line) => sum + line.product.weight_grams * line.quantity, 0)

  const [store, origin, destination] = await Promise.all([
    getSettings(db, 'store'),
    getSettings(db, 'origin'),
    resolveVillage(db, regionCode),
  ])
  if (!destination) throw new HttpError(422, 'invalid_region', 'Pilih desa atau kelurahan tujuan.')

  const base = { subtotal, weightGrams, freeShippingMin: store.freeShippingMin }
  const flat = (reason: ShippingQuote['reason'], from: string | null = null): ShippingQuote => ({
    mode: 'flat',
    reason,
    origin: from,
    ...base,
    options: flatOptions(subtotal, store),
  })

  if (!provider) return flat('no_provider')
  const from = origin.regionCode ? await resolveVillage(db, origin.regionCode) : null
  if (!from) return flat('no_origin')

  let rates: CourierRate[]
  try {
    rates = await provider.rates({
      originPostalCode: from.postalCode,
      destinationPostalCode: destination.postalCode,
      items: parcel.map((line) => ({
        name: line.product.name,
        value: line.product.price,
        weight: line.product.weight_grams,
        quantity: line.quantity,
      })),
    })
  } catch (error) {
    console.warn(`Ongkir kurir gagal, memakai tarif tetap. ${(error as Error).message}`)
    return flat('unavailable', from.city)
  }
  if (rates.length === 0) return flat('no_rates', from.city)

  const sorted = [...rates].sort((a, b) => a.price - b.price)
  const freeId = subtotal >= store.freeShippingMin ? sorted[0].id : null
  return {
    mode: 'live',
    origin: from.city,
    ...base,
    options: sorted.map((rate) => ({
      id: rate.id,
      label: `${rate.courier} ${rate.service}`,
      courier: rate.courier,
      description: rate.description,
      etd: rate.etd,
      price: rate.id === freeId ? 0 : rate.price,
      originalPrice: rate.price,
      free: rate.id === freeId,
    })),
  }
}

/** The option the shopper chose, priced again on the server. */
export async function chosenShipping(
  db: Database,
  provider: RateProvider | null | undefined,
  regionCode: string,
  items: { productId: string; quantity: number }[],
  method: string,
) {
  const quote = await quoteShipping(db, provider, regionCode, items)
  const option = quote.options.find((item) => item.id === method)
  if (!option) {
    throw new HttpError(409, 'shipping_changed', 'Pilihan pengiriman berubah. Pilih ulang pengiriman, lalu bayar lagi.')
  }
  return { quote, option }
}

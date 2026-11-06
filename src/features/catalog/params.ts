import type { ProductQuery, SortKey } from '@/types/catalog'

export type RawParams = Record<string, string | string[] | undefined>

export const PRICE_RANGES = [
  { value: '0-100000', label: 'Di bawah Rp 100.000', min: 0, max: 100000 },
  { value: '100000-250000', label: 'Rp 100.000 sampai Rp 250.000', min: 100000, max: 250000 },
  { value: '250000-', label: 'Di atas Rp 250.000', min: 250000, max: undefined },
]

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rekomendasi', label: 'Rekomendasi' },
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'termurah', label: 'Harga terendah' },
  { value: 'termahal', label: 'Harga tertinggi' },
]

export interface CatalogFilters {
  q: string
  sizes: string[]
  colors: string[]
  price: string
  sort: SortKey
  page: number
}

function single(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? ''
}

function list(value: string | string[] | undefined) {
  return single(value).split(',').filter(Boolean)
}

export function parseCatalogParams(raw: RawParams): CatalogFilters {
  const sort = single(raw.urut) as SortKey
  const price = single(raw.harga)
  const page = Number.parseInt(single(raw.halaman), 10)
  return {
    q: single(raw.q).trim().slice(0, 80),
    sizes: list(raw.ukuran),
    colors: list(raw.warna),
    price: PRICE_RANGES.some((range) => range.value === price) ? price : '',
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : 'rekomendasi',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export function toProductQuery(filters: CatalogFilters): ProductQuery {
  const range = PRICE_RANGES.find((item) => item.value === filters.price)
  return {
    q: filters.q,
    sizes: filters.sizes,
    colors: filters.colors,
    priceMin: range?.min,
    priceMax: range?.max,
    sort: filters.sort,
    page: filters.page,
  }
}

export function hasActiveFilters(filters: CatalogFilters) {
  return Boolean(
    filters.q ||
      filters.sizes.length ||
      filters.colors.length ||
      filters.price ||
      filters.sort !== 'rekomendasi',
  )
}

/** Any filter change returns to the first page, unless a page is set. */
export function catalogHref(
  basePath: string,
  filters: CatalogFilters,
  changes: Partial<CatalogFilters> = {},
) {
  const next = { ...filters, page: 1, ...changes }
  const params = new URLSearchParams()
  if (next.q) params.set('q', next.q)
  if (next.sizes.length) params.set('ukuran', next.sizes.join(','))
  if (next.colors.length) params.set('warna', next.colors.join(','))
  if (next.price) params.set('harga', next.price)
  if (next.sort !== 'rekomendasi') params.set('urut', next.sort)
  if (next.page > 1) params.set('halaman', String(next.page))
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

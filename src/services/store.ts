import { cache } from 'react'
import type { Category, Product } from '@/types/catalog'
import { apiGet } from './api'

/** What the dashboard sets for the whole store. */
export interface StoreSettings {
  name: string
  tagline: string
  email: string
  phone: string
  logoUrl: string | null
  /** The line above the header, already filled in. Null hides it. */
  announcement: string | null
  freeShippingMin: number
  flatRates: { reguler: number; ekspres: number }
  returnDays: number
}

/** Used when the API cannot be reached, so the store still renders. */
export const DEFAULT_STORE: StoreSettings = {
  name: 'Dummy Store',
  tagline: 'Baju, celana, bandana, dan merchandise',
  email: 'halo@dummystore.example',
  phone: '',
  logoUrl: null,
  announcement: 'Gratis ongkir reguler untuk belanja mulai Rp 300.000',
  freeShippingMin: 300_000,
  flatRates: { reguler: 20_000, ekspres: 35_000 },
  returnDays: 14,
}

export const getStoreSettings = cache(async (): Promise<StoreSettings> => {
  try {
    return await apiGet<StoreSettings>('/settings')
  } catch {
    return DEFAULT_STORE
  }
})

/** Categories for menus. An unreachable API leaves the menus with the fixed links only. */
export const getNavigationCategories = cache(async (): Promise<Pick<Category, 'slug' | 'name'>[]> => {
  try {
    const { items } = await apiGet<{ items: Category[] }>('/categories')
    return items.map(({ slug, name }) => ({ slug, name }))
  } catch {
    return []
  }
})

export interface HomeContent {
  rail: Product[]
  railFeatured: string | null
  featured: Product[]
  newArrivals: Product[]
  sale: Product[]
  categories: (Category & { cover: Product | null })[]
}

export const getHome = () => apiGet<HomeContent>('/home')

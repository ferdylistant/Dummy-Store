export type CategorySlug = 'baju' | 'celana' | 'bandana' | 'merchandise'

export type SortKey = 'rekomendasi' | 'terbaru' | 'termurah' | 'termahal'

export interface Category {
  slug: CategorySlug
  name: string
  description: string
  intro: string
  art: string
  artColor: string
}

export interface ProductColor {
  name: string
  hex: string
}

export interface Product {
  id: string
  slug: string
  name: string
  category: CategorySlug
  art: string
  /** Price in whole Rupiah. */
  price: number
  compareAtPrice?: number
  description: string
  details: string[]
  material: string
  colors: ProductColor[]
  sizes: string[]
  /** Variants without stock, as "Color|Size". */
  soldOut?: string[]
  isNew?: boolean
  featured?: boolean
  railKind?: string
  image?: string
}

export interface ProductQuery {
  category?: CategorySlug
  q?: string
  sizes?: string[]
  colors?: string[]
  priceMin?: number
  priceMax?: number
  sort?: SortKey
  page?: number
  pageSize?: number
  ids?: string[]
  featured?: boolean
  isNew?: boolean
  rail?: boolean
}

export type CategorySlug = 'baju' | 'celana' | 'bandana' | 'merchandise'

export type ProductArtKind =
  | 'tee'
  | 'shirt'
  | 'hoodie'
  | 'sweater'
  | 'jacket'
  | 'pants'
  | 'shorts'
  | 'bandana'
  | 'cap'
  | 'tote'
  | 'mug'
  | 'sticker'
  | 'pin'
  | 'socks'

export type RailKind = 'tee' | 'knit' | 'hoodie' | 'shirt' | 'jacket' | 'coat'

export interface Category {
  slug: CategorySlug
  name: string
  /** Short line for cards and meta descriptions. */
  description: string
  /** Longer intro shown on the category page. */
  intro: string
  art: ProductArtKind
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
  art: ProductArtKind
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
  /** Shown on the home page clothing rail. */
  railKind?: RailKind
  /** Real product photo. The illustration is used when this is empty. */
  image?: string
}

export type SortKey = 'rekomendasi' | 'terbaru' | 'termurah' | 'termahal'

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
}

export interface ProductPage {
  items: Product[]
  total: number
  page: number
  pageCount: number
}

export interface ProductFacets {
  sizes: string[]
  colors: ProductColor[]
}

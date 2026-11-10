/** Categories are managed in the dashboard, so any slug may exist. */
export type CategorySlug = string

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
  /** The product pictured on the category tile, when one is chosen in the dashboard. */
  coverProductId?: string
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
  /** Photos from the dashboard, in display order. */
  images: ProductImage[]
  /** Cut-out picture for the hanging rail on the home page. */
  railImage?: string
  /** Back of the rail cut-out. The front is reused without it. */
  railBackImage?: string
  /** Side-on rail cut-out, shown while the piece rests on the rail. */
  railSideImage?: string
  weightGrams: number
}

export interface ProductImage {
  url: string
  alt: string
  width: number
  height: number
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

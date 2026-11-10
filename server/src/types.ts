/** Categories are managed in the dashboard, so any slug may exist. */
export type CategorySlug = string

export type SortKey = 'rekomendasi' | 'terbaru' | 'termurah' | 'termahal'

export interface Category {
  slug: CategorySlug
  name: string
  description: string
  intro: string
  art: string
  artColor: string
  /** The product pictured on the category tile, when one is chosen. */
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
  /** Photos in display order. Empty means the illustration is shown. */
  images: ProductImage[]
  /** Cut-out picture for the hanging rail. */
  railImage?: string
  /** Back of the rail cut-out. The front is reused without it. */
  railBackImage?: string
  /** Side-on rail cut-out, shown while the piece rests on the rail. */
  railSideImage?: string
  /** The rail photos already show a hanger. */
  railHasHanger?: boolean
  weightGrams: number
}

export interface ProductImage {
  url: string
  alt: string
  width: number
  height: number
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

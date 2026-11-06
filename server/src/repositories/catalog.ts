import type { Database } from '../db/index.js'
import type { Category, Product, ProductColor, ProductQuery, SortKey } from '../types.js'

const DEFAULT_PAGE_SIZE = 12
const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL']

interface ProductRow {
  id: string
  slug: string
  name: string
  category: Product['category']
  art: string
  rail_kind: string | null
  price: number
  compare_at_price: number | null
  description: string
  details: string
  material: string
  colors: string
  sizes: string
  is_new: number
  featured: number
  image: string | null
}

export function listCategories(db: Database): Category[] {
  const rows = db.prepare('SELECT * FROM categories ORDER BY position').all() as unknown as (Omit<
    Category,
    'artColor'
  > & { art_color: string })[]
  return rows.map(({ art_color, ...category }) => ({ ...category, artColor: art_color }))
}

export function findCategory(db: Database, slug: string) {
  return listCategories(db).find((category) => category.slug === slug)
}

/** Stock lives on variants, so sold out variants are read from there. */
function soldOutByProduct(db: Database) {
  const rows = db
    .prepare('SELECT product_id, color, size FROM variants WHERE stock = 0')
    .all() as unknown as { product_id: string; color: string; size: string }[]

  const soldOut = new Map<string, string[]>()
  for (const row of rows) {
    soldOut.set(row.product_id, [...(soldOut.get(row.product_id) ?? []), `${row.color}|${row.size}`])
  }
  return soldOut
}

function toProduct(row: ProductRow, soldOut: Map<string, string[]>): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    art: row.art,
    railKind: row.rail_kind ?? undefined,
    price: row.price,
    compareAtPrice: row.compare_at_price ?? undefined,
    description: row.description,
    details: JSON.parse(row.details) as string[],
    material: row.material,
    colors: JSON.parse(row.colors) as ProductColor[],
    sizes: JSON.parse(row.sizes) as string[],
    soldOut: soldOut.get(row.id),
    isNew: row.is_new === 1 || undefined,
    featured: row.featured === 1 || undefined,
    image: row.image ?? undefined,
  }
}

export function allProducts(db: Database): Product[] {
  const rows = db.prepare('SELECT * FROM products ORDER BY position').all() as unknown as ProductRow[]
  const soldOut = soldOutByProduct(db)
  return rows.map((row) => toProduct(row, soldOut))
}

export function findProductBySlug(db: Database, slug: string) {
  return allProducts(db).find((product) => product.slug === slug)
}

/*
 * Filtering runs in memory, which is fine for a catalog of a few thousand
 * products. Move it into SQL if the catalog grows past that.
 */
export function queryProducts(db: Database, query: ProductQuery) {
  const keyword = query.q?.trim().toLowerCase()

  const matches = allProducts(db).filter((product) => {
    if (query.ids && !query.ids.includes(product.id)) return false
    if (query.category && product.category !== query.category) return false
    if (query.featured && !product.featured) return false
    if (query.isNew && !product.isNew) return false
    if (query.rail && !product.railKind) return false
    if (keyword) {
      const haystack = `${product.name} ${product.description} ${product.material}`.toLowerCase()
      if (!haystack.includes(keyword)) return false
    }
    if (query.sizes?.length && !product.sizes.some((size) => query.sizes?.includes(size))) {
      return false
    }
    if (
      query.colors?.length &&
      !product.colors.some((color) => query.colors?.includes(color.name))
    ) {
      return false
    }
    if (query.priceMin !== undefined && product.price < query.priceMin) return false
    if (query.priceMax !== undefined && product.price > query.priceMax) return false
    return true
  })

  const sorted = sortProducts(matches, query.sort)
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = Math.min(Math.max(1, query.page ?? 1), pageCount)

  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: sorted.length,
    page,
    pageCount,
  }
}

export function relatedProducts(db: Database, product: Product, limit: number) {
  return allProducts(db)
    .filter((other) => other.category === product.category && other.id !== product.id)
    .slice(0, limit)
}

export function productFacets(db: Database, category?: string) {
  const products = allProducts(db)
  const scope = category ? products.filter((product) => product.category === category) : products

  const sizes = [...new Set(scope.flatMap((product) => product.sizes))]
    .filter((size) => size !== 'Satu ukuran')
    .sort(compareSizes)

  const colors = new Map<string, ProductColor>()
  for (const product of scope) {
    for (const color of product.colors) colors.set(color.name, color)
  }

  return {
    sizes,
    colors: [...colors.values()].sort((a, b) => a.name.localeCompare(b.name, 'id')),
  }
}

function sortProducts(items: Product[], sort: SortKey | undefined) {
  const sorted = [...items]
  switch (sort) {
    case 'terbaru':
      return sorted.sort((a, b) => Number(b.isNew ?? false) - Number(a.isNew ?? false))
    case 'termurah':
      return sorted.sort((a, b) => a.price - b.price)
    case 'termahal':
      return sorted.sort((a, b) => b.price - a.price)
    default:
      return sorted.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false))
  }
}

function compareSizes(a: string, b: string) {
  const letterA = SIZE_ORDER.indexOf(a)
  const letterB = SIZE_ORDER.indexOf(b)
  if (letterA >= 0 && letterB >= 0) return letterA - letterB
  if (letterA >= 0) return -1
  if (letterB >= 0) return 1
  return Number(a) - Number(b)
}

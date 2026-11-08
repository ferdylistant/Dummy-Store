import type { Selectable } from 'kysely'
import type { Database, Schema } from '../db/index.js'
import type { Category, Product, ProductColor, ProductQuery, SortKey } from '../types.js'

const DEFAULT_PAGE_SIZE = 12
const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL']

type ProductRow = Selectable<Schema['products']>

export async function listCategories(db: Database): Promise<Category[]> {
  const rows = await db.selectFrom('categories').selectAll().orderBy('position').execute()
  return rows.map(({ art_color, slug, name, description, intro, art }) => ({
    name,
    description,
    intro,
    art,
    slug: slug as Category['slug'],
    artColor: art_color,
  }))
}

export async function findCategory(db: Database, slug: string) {
  return (await listCategories(db)).find((category) => category.slug === slug)
}

/** Stock lives on variants, so sold out variants are read from there. */
async function soldOutByProduct(db: Database) {
  const rows = await db.selectFrom('variants').select(['product_id', 'color', 'size']).where('stock', '=', 0).execute()

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
    category: row.category as Product['category'],
    art: row.art,
    railKind: row.rail_kind ?? undefined,
    price: row.price,
    compareAtPrice: row.compare_at_price ?? undefined,
    description: row.description,
    details: row.details,
    material: row.material,
    colors: row.colors as ProductColor[],
    sizes: row.sizes,
    soldOut: soldOut.get(row.id),
    isNew: row.is_new || undefined,
    featured: row.featured || undefined,
    image: row.image ?? undefined,
  }
}

export async function allProducts(db: Database): Promise<Product[]> {
  const [rows, soldOut] = await Promise.all([
    db.selectFrom('products').selectAll().orderBy('position').execute(),
    soldOutByProduct(db),
  ])
  return rows.map((row) => toProduct(row, soldOut))
}

export async function findProductBySlug(db: Database, slug: string) {
  return (await allProducts(db)).find((product) => product.slug === slug)
}

/*
 * Filtering runs in memory, which is fine for a catalog of a few thousand
 * products. Move it into SQL if the catalog grows past that.
 */
export async function queryProducts(db: Database, query: ProductQuery) {
  const keyword = query.q?.trim().toLowerCase()

  const matches = (await allProducts(db)).filter((product) => {
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

export async function relatedProducts(db: Database, product: Product, limit: number) {
  return (await allProducts(db))
    .filter((other) => other.category === product.category && other.id !== product.id)
    .slice(0, limit)
}

export async function productFacets(db: Database, category?: string) {
  const products = await allProducts(db)
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

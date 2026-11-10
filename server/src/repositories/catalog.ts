import type { Selectable } from 'kysely'
import type { Database, Schema } from '../db/index.js'
import { getSettings } from '../settings.js'
import type { Category, Product, ProductColor, ProductQuery, SortKey } from '../types.js'

const DEFAULT_PAGE_SIZE = 12
const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL']

type ProductRow = Selectable<Schema['products']>

/** Builds the public address of a stored picture. Set by the app from its own URL. */
export type MediaUrl = (id: string) => string

export async function listCategories(db: Database): Promise<Category[]> {
  const rows = await db.selectFrom('categories').selectAll().orderBy('position').execute()
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    intro: row.intro,
    art: row.art,
    artColor: row.art_color,
    coverProductId: row.cover_product_id ?? undefined,
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

async function imagesByProduct(db: Database, mediaUrl: MediaUrl) {
  const rows = await db
    .selectFrom('product_images')
    .innerJoin('media', 'media.id', 'product_images.media_id')
    .select(['product_images.product_id', 'product_images.media_id', 'product_images.alt', 'media.width', 'media.height'])
    .orderBy('product_images.position')
    .execute()
  const images = new Map<string, Product['images']>()
  for (const row of rows) {
    images.set(row.product_id, [
      ...(images.get(row.product_id) ?? []),
      { url: mediaUrl(row.media_id), alt: row.alt, width: row.width, height: row.height },
    ])
  }
  return images
}

function toProduct(
  row: ProductRow,
  soldOut: Map<string, string[]>,
  images: Map<string, Product['images']>,
  mediaUrl: MediaUrl,
): Product {
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
    details: row.details,
    material: row.material,
    colors: row.colors as ProductColor[],
    sizes: row.sizes,
    soldOut: soldOut.get(row.id),
    isNew: row.is_new || undefined,
    featured: row.featured || undefined,
    image: row.image ?? undefined,
    images: images.get(row.id) ?? [],
    railImage: row.rail_media_id ? mediaUrl(row.rail_media_id) : undefined,
    railBackImage: row.rail_media_id && row.rail_back_media_id ? mediaUrl(row.rail_back_media_id) : undefined,
    railSideImage: row.rail_media_id && row.rail_side_media_id ? mediaUrl(row.rail_side_media_id) : undefined,
    railHasHanger: (Boolean(row.rail_media_id) && row.rail_has_hanger) || undefined,
    weightGrams: row.weight_grams,
  }
}

/** Products in catalog order. The store sees active ones only. */
export async function allProducts(
  db: Database,
  mediaUrl: MediaUrl,
  options: { includeInactive?: boolean } = {},
): Promise<Product[]> {
  let query = db.selectFrom('products').selectAll().orderBy('position').orderBy('created_at')
  if (!options.includeInactive) query = query.where('is_active', '=', true)
  const [rows, soldOut, images] = await Promise.all([query.execute(), soldOutByProduct(db), imagesByProduct(db, mediaUrl)])
  return rows.map((row) => toProduct(row, soldOut, images, mediaUrl))
}

export async function findProductBySlug(db: Database, mediaUrl: MediaUrl, slug: string) {
  return (await allProducts(db, mediaUrl)).find((product) => product.slug === slug)
}

/*
 * Filtering runs in memory, which is fine for a catalog of a few thousand
 * products. Move it into SQL if the catalog grows past that.
 */
export async function queryProducts(db: Database, mediaUrl: MediaUrl, query: ProductQuery) {
  const keyword = query.q?.trim().toLowerCase()

  const matches = (await allProducts(db, mediaUrl)).filter((product) => {
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
    if (query.colors?.length && !product.colors.some((color) => query.colors?.includes(color.name))) {
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

export async function relatedProducts(db: Database, mediaUrl: MediaUrl, product: Product, limit: number) {
  return (await allProducts(db, mediaUrl))
    .filter((other) => other.category === product.category && other.id !== product.id)
    .slice(0, limit)
}

export async function productFacets(db: Database, mediaUrl: MediaUrl, category?: string) {
  const products = await allProducts(db, mediaUrl)
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

const isOnSale = (product: Product) => product.compareAtPrice !== undefined && product.compareAtPrice > product.price

/**
 * The home page, as arranged in the dashboard. A list left empty there falls
 * back to the product flags, so a new store still shows something.
 */
export async function homeContent(db: Database, mediaUrl: MediaUrl) {
  const [home, products, categories] = await Promise.all([
    getSettings(db, 'home'),
    allProducts(db, mediaUrl),
    listCategories(db),
  ])
  const byId = new Map(products.map((product) => [product.id, product]))
  const pick = (ids: string[], fallback: (product: Product) => boolean, limit: number) =>
    ids.length
      ? ids.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product))
      : products.filter(fallback).slice(0, limit)

  const rail = pick(home.rail, (product) => Boolean(product.railKind || product.railImage), 8)
  return {
    rail,
    railFeatured: home.railFeatured && rail.some((product) => product.id === home.railFeatured) ? home.railFeatured : null,
    featured: pick(home.featured, (product) => Boolean(product.featured), 8),
    newArrivals: pick(home.newArrivals, (product) => Boolean(product.isNew), 4),
    sale: pick(home.sale, isOnSale, 8),
    categories: categories.map((category) => ({
      ...category,
      cover: category.coverProductId ? (byId.get(category.coverProductId) ?? null) : null,
    })),
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

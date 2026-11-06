import type {
  Category,
  CategorySlug,
  Product,
  ProductColor,
  ProductFacets,
  ProductPage,
  ProductQuery,
} from '@/types/catalog'
import { categories, products } from './mock/catalog'

/*
 * All catalog reads go through this file. When the Express API is ready, only
 * these function bodies change; pages and components keep the same contract.
 */

const DEFAULT_PAGE_SIZE = 12
const SIZE_ORDER = ['S', 'M', 'L', 'XL', 'XXL']

export async function getCategories(): Promise<Category[]> {
  return categories
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return categories.find((category) => category.slug === slug)
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return products.find((product) => product.slug === slug)
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  return products.filter((product) => ids.includes(product.id))
}

export async function getAllProducts(): Promise<Product[]> {
  return products
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return products.filter((product) => product.featured).slice(0, limit)
}

export async function getNewProducts(limit = 4): Promise<Product[]> {
  return products.filter((product) => product.isNew).slice(0, limit)
}

export async function getRailProducts(limit = 8): Promise<Product[]> {
  return products.filter((product) => product.railKind).slice(0, limit)
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  return products
    .filter((other) => other.category === product.category && other.id !== product.id)
    .slice(0, limit)
}

export async function getProducts(query: ProductQuery = {}): Promise<ProductPage> {
  const keyword = query.q?.trim().toLowerCase()

  const matches = products.filter((product) => {
    if (query.category && product.category !== query.category) return false
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

export async function getFacets(category?: CategorySlug): Promise<ProductFacets> {
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

function sortProducts(items: Product[], sort: ProductQuery['sort']) {
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

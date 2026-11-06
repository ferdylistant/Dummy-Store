import type {
  Category,
  CategorySlug,
  Product,
  ProductFacets,
  ProductPage,
  ProductQuery,
} from '@/types/catalog'
import { ApiError, apiGet } from './api'

const ALL_PRODUCTS = 500

interface ListResponse<T> {
  items: T[]
}

function toSearch(params: Record<string, string | number | boolean | string[] | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','))
    } else {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

/** A missing record is an expected result. Anything else is a real failure. */
async function orUndefined<T>(read: Promise<T>) {
  try {
    return await read
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return undefined
    throw error
  }
}

async function listProducts(params: Parameters<typeof toSearch>[0]) {
  const page = await apiGet<ProductPage>(`/products${toSearch(params)}`)
  return page.items
}

export async function getCategories(): Promise<Category[]> {
  const { items } = await apiGet<ListResponse<Category>>('/categories')
  return items
}

export function getCategory(slug: string): Promise<Category | undefined> {
  return orUndefined(apiGet<Category>(`/categories/${encodeURIComponent(slug)}`))
}

export function getProductBySlug(slug: string): Promise<Product | undefined> {
  return orUndefined(apiGet<Product>(`/products/${encodeURIComponent(slug)}`))
}

export function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return Promise.resolve([])
  return listProducts({ ids, pageSize: ALL_PRODUCTS })
}

export function getAllProducts(): Promise<Product[]> {
  return listProducts({ pageSize: ALL_PRODUCTS })
}

export function getFeaturedProducts(limit = 8): Promise<Product[]> {
  return listProducts({ featured: true, pageSize: limit })
}

export function getNewProducts(limit = 4): Promise<Product[]> {
  return listProducts({ isNew: true, pageSize: limit })
}

export function getRailProducts(limit = 8): Promise<Product[]> {
  return listProducts({ rail: true, pageSize: limit })
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const { items } = await apiGet<ListResponse<Product>>(
    `/products/${encodeURIComponent(product.slug)}/related?limit=${limit}`,
  )
  return items
}

export function getProducts(query: ProductQuery = {}): Promise<ProductPage> {
  return apiGet<ProductPage>(`/products${toSearch({ ...query })}`)
}

export function getFacets(category?: CategorySlug): Promise<ProductFacets> {
  return apiGet<ProductFacets>(`/products/facets${toSearch({ category })}`)
}

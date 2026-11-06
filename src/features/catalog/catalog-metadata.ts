import type { Metadata } from 'next'
import { SHARE_IMAGE } from '@/lib/seo'
import { catalogHref, hasActiveFilters, type CatalogFilters } from './params'

/**
 * Filtered views stay crawlable for link discovery but out of the index, so
 * only the clean category URLs and their pagination compete in search.
 */
export function catalogMetadata({
  title,
  description,
  basePath,
  filters,
}: {
  title: string
  description: string
  basePath: string
  filters: CatalogFilters
}): Metadata {
  const filtered = hasActiveFilters(filters)
  const paged = !filtered && filters.page > 1
  const canonical = paged ? catalogHref(basePath, filters, { page: filters.page }) : basePath
  const fullTitle = paged ? `${title}, Halaman ${filters.page}` : title

  return {
    title: fullTitle,
    description,
    alternates: { canonical },
    openGraph: { title: fullTitle, description, url: canonical, images: [SHARE_IMAGE] },
    robots: filtered ? { index: false, follow: true } : undefined,
  }
}

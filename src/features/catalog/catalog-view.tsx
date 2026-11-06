import { SearchX, X } from 'lucide-react'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { buttonClasses } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { ProductCard } from '@/features/products/product-card'
import { itemListJsonLd, type BreadcrumbItem } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { getCategories, getFacets, getProducts } from '@/services/products'
import type { CategorySlug } from '@/types/catalog'
import { FilterDrawer, ResultsFade, SortTabs } from './catalog-controls'
import { FilterPanel } from './filter-panel'
import {
  catalogHref,
  PRICE_RANGES,
  SORT_OPTIONS,
  toProductQuery,
  type CatalogFilters,
} from './params'

export async function CatalogView({
  title,
  intro,
  basePath,
  category,
  breadcrumbs,
  filters,
}: {
  title: string
  intro: string
  basePath: string
  category?: CategorySlug
  breadcrumbs: BreadcrumbItem[]
  filters: CatalogFilters
}) {
  const [result, facets, categories] = await Promise.all([
    getProducts({ ...toProductQuery(filters), category }),
    getFacets(category),
    getCategories(),
  ])

  const chips = [
    ...(filters.q ? [{ label: `"${filters.q}"`, changes: { q: '' } }] : []),
    ...filters.sizes.map((size) => ({
      label: `Ukuran ${size}`,
      changes: { sizes: filters.sizes.filter((item) => item !== size) },
    })),
    ...filters.colors.map((color) => ({
      label: color,
      changes: { colors: filters.colors.filter((item) => item !== color) },
    })),
    ...(filters.price
      ? [
          {
            label: PRICE_RANGES.find((range) => range.value === filters.price)?.label ?? '',
            changes: { price: '' },
          },
        ]
      : []),
  ]

  const panel = (
    <FilterPanel
      basePath={basePath}
      filters={filters}
      facets={facets}
      categories={categories}
      activeCategory={category}
    />
  )

  return (
    <Container className="py-6 lg:py-8">
      <JsonLd data={itemListJsonLd(result.items)} />
      <Breadcrumbs items={breadcrumbs} />
      <header className="mt-4 mb-6 max-w-prose">
        <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">
          {filters.q ? `Hasil untuk "${filters.q}"` : title}
        </h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">{intro}</p>
      </header>

      <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8">
        <aside aria-labelledby="judul-filter" className="hidden lg:block">
          <h2 id="judul-filter" className="sr-only">
            Filter produk
          </h2>
          {panel}
        </aside>

        <div className="min-w-0">
          <h2 className="sr-only">Daftar produk</h2>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-muted-foreground">
              {result.total} produk
            </p>
            <FilterDrawer activeCount={chips.length} total={result.total}>
              {panel}
            </FilterDrawer>
            <SortTabs
                value={filters.sort}
                options={SORT_OPTIONS.map((option) => ({
                  ...option,
                  href: catalogHref(basePath, filters, { sort: option.value }),
                }))}
              />
          </div>

          {chips.length > 0 && (
            <ul aria-label="Filter aktif" className="mb-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <Link
                    rel="nofollow"
                    scroll={false}
                    href={catalogHref(basePath, filters, chip.changes)}
                    aria-label={`Hapus filter ${chip.label}`}
                    className="inline-flex min-h-9 items-center gap-1 rounded-md bg-secondary px-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/70"
                  >
                    {chip.label}
                    <X aria-hidden="true" className="size-4" />
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={basePath}
                  scroll={false}
                  className="inline-flex min-h-9 items-center px-2 text-sm font-medium"
                >
                  <span className="link-stitch">Hapus semua</span>
                </Link>
              </li>
            </ul>
          )}

          <ResultsFade signature={catalogHref(basePath, filters, { page: filters.page })}>
            {result.items.length > 0 ? (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
                {result.items.map((product, index) => (
                  <li key={product.id}>
                    <ProductCard product={product} priority={index < 4} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
                <SearchX aria-hidden="true" className="size-10 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Produk tidak ditemukan</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Coba kata kunci lain atau hapus beberapa filter.
                </p>
                <Link href={basePath} className={buttonClasses({ variant: 'outline' })}>
                  Hapus Filter
                </Link>
              </div>
            )}
          </ResultsFade>

          {result.pageCount > 1 && (
            <nav aria-label="Halaman produk" className="mt-8">
              <ul className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: result.pageCount }, (_, index) => index + 1).map((page) => (
                  <li key={page}>
                    <Link
                      href={catalogHref(basePath, filters, { page })}
                      aria-current={page === result.page ? 'page' : undefined}
                      aria-label={`Halaman ${page}`}
                      className={cn(
                        'grid size-11 place-items-center rounded-full border text-sm font-medium',
                        page === result.page
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input hover:bg-muted',
                      )}
                    >
                      {page}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </Container>
  )
}

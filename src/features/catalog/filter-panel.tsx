import { Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Category, ProductFacets } from '@/types/catalog'
import { catalogHref, PRICE_RANGES, toggleValue, type CatalogFilters } from './params'

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border py-4 first:pt-0 last:border-b-0">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

const ROW = 'flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted'

export function FilterPanel({
  basePath,
  filters,
  facets,
  categories,
  activeCategory,
}: {
  basePath: string
  filters: CatalogFilters
  facets: ProductFacets
  categories: Category[]
  activeCategory?: string
}) {
  return (
    <div>
      <FilterGroup title="Kategori">
        <ul>
          <li>
            <Link
              href="/produk"
              aria-current={!activeCategory ? 'page' : undefined}
              className={cn(ROW, !activeCategory && 'bg-muted font-semibold')}
            >
              Semua produk
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/kategori/${category.slug}`}
                aria-current={activeCategory === category.slug ? 'page' : undefined}
                className={cn(ROW, activeCategory === category.slug && 'bg-muted font-semibold')}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </FilterGroup>

      {facets.sizes.length > 0 && (
        <FilterGroup title="Ukuran">
          <ul className="flex flex-wrap gap-2">
            {facets.sizes.map((size) => {
              const active = filters.sizes.includes(size)
              return (
                <li key={size}>
                  <Link
                    rel="nofollow"
                    scroll={false}
                    aria-pressed={active}
                    href={catalogHref(basePath, filters, {
                      sizes: toggleValue(filters.sizes, size),
                    })}
                    className={cn(
                      'grid h-11 min-w-11 place-items-center rounded-full border px-3 text-sm font-medium transition-colors duration-200',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input hover:bg-muted',
                    )}
                  >
                    {size}
                  </Link>
                </li>
              )
            })}
          </ul>
        </FilterGroup>
      )}

      <FilterGroup title="Warna">
        <ul>
          {facets.colors.map((color) => {
            const active = filters.colors.includes(color.name)
            return (
              <li key={color.name}>
                <Link
                  rel="nofollow"
                  scroll={false}
                  aria-pressed={active}
                  href={catalogHref(basePath, filters, {
                    colors: toggleValue(filters.colors, color.name),
                  })}
                  className={ROW}
                >
                  <span
                    aria-hidden="true"
                    className="size-5 rounded-full border border-input"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className={cn('flex-1', active && 'font-semibold')}>{color.name}</span>
                  {active && <Check aria-hidden="true" className="size-4" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </FilterGroup>

      <FilterGroup title="Harga">
        <ul>
          {PRICE_RANGES.map((range) => {
            const active = filters.price === range.value
            return (
              <li key={range.value}>
                <Link
                  rel="nofollow"
                  scroll={false}
                  aria-pressed={active}
                  href={catalogHref(basePath, filters, { price: active ? '' : range.value })}
                  className={ROW}
                >
                  <span className={cn('flex-1', active && 'font-semibold')}>{range.label}</span>
                  {active && <Check aria-hidden="true" className="size-4" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </FilterGroup>
    </div>
  )
}

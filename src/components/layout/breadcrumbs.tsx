import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { JsonLd } from '@/components/seo/json-ld'
import { breadcrumbJsonLd, type BreadcrumbItem } from '@/lib/seo'

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <li key={item.href} className="flex items-center gap-1">
                {index > 0 && <ChevronRight aria-hidden="true" className="size-4" />}
                {isLast ? (
                  <span aria-current="page" className="font-medium text-foreground">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="inline-block py-1 hover:text-foreground">
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}

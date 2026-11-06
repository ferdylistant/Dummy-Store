import { Container } from '@/components/ui/container'
import {
  BreadcrumbSkeleton,
  Skeleton,
  SkeletonLine,
  SkeletonRegion,
} from '@/components/ui/skeleton'
import { ProductCardSkeleton } from '@/features/products/product-skeletons'

function SidebarSkeleton() {
  return (
    <div>
      <section className="border-b border-border pb-4">
        <SkeletonLine row="mb-2 h-5" bar="h-3.5" className="w-16" />
        {[28, 16, 20, 20, 28].map((width, index) => (
          <div key={index} className="flex min-h-11 items-center px-2">
            <Skeleton className="h-3.5" style={{ width: `${width * 4}px` }} />
          </div>
        ))}
      </section>
      <section className="py-4">
        <SkeletonLine row="mb-2 h-5" bar="h-3.5" className="w-14" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((chip) => (
            <Skeleton key={chip} className="size-11 rounded-full" />
          ))}
        </div>
      </section>
    </div>
  )
}

/** Same structure as CatalogView. */
export function CatalogSkeleton() {
  return (
    <SkeletonRegion label="Memuat produk">
      <Container className="py-6 lg:py-8">
        <BreadcrumbSkeleton />
        <header className="mt-4 mb-6 max-w-prose">
          <SkeletonLine row="h-10 lg:h-12" bar="h-8 lg:h-10" className="w-56" />
          <div className="mt-2">
            <SkeletonLine row="h-[26px]" className="w-full" />
            <SkeletonLine row="h-[26px]" className="w-full sm:w-2/3" />
            <div className="sm:hidden">
              <SkeletonLine row="h-[26px]" className="w-1/2" />
            </div>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8">
          <div className="hidden lg:block">
            <SidebarSkeleton />
          </div>
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SkeletonLine row="h-5" bar="h-3.5" className="w-16" />
              <Skeleton className="h-11 w-28 rounded-full lg:hidden" />
              <Skeleton className="h-12 w-full rounded-full sm:w-96" />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
              {Array.from({ length: 12 }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </SkeletonRegion>
  )
}

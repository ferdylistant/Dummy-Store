import { Container } from '@/components/ui/container'
import {
  BreadcrumbSkeleton,
  Skeleton,
  SkeletonLine,
  SkeletonRegion,
} from '@/components/ui/skeleton'

/** Same structure as ProductCard. */
export function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/5] rounded-2xl" />
      <div className="pt-3">
        <div className="min-h-4" />
        <SkeletonLine row="h-5 md:h-6" className="w-3/4" />
        <SkeletonLine row="mt-0.5 h-5 md:h-6" className="w-1/2" />
        <div className="mt-2 flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <Skeleton key={dot} className="size-3 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

function OptionGroupSkeleton({ count, wide }: { count: number; wide?: boolean }) {
  return (
    <div className="mt-6">
      <SkeletonLine row={wide ? 'h-7' : 'h-5'} bar="h-3.5" className="w-20" />
      <div className="mt-2 flex flex-wrap gap-2">
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={index} className={wide ? 'h-11 w-14 rounded-full' : 'size-11 rounded-full'} />
        ))}
      </div>
    </div>
  )
}

/** Same structure as ProductView and its page. */
export function ProductDetailSkeleton() {
  return (
    <SkeletonRegion label="Memuat produk">
      <Container className="py-6 lg:py-8">
        <BreadcrumbSkeleton />
        <div className="mt-4 grid gap-6 pb-24 lg:grid-cols-2 lg:gap-12 lg:pb-0">
          <Skeleton className="aspect-[4/5] rounded-3xl" />
          <div>
            <SkeletonLine row="mt-1 h-10 lg:h-12" bar="h-8 lg:h-10" className="w-3/4" />
            <SkeletonLine row="mt-2 h-7 lg:h-8" bar="h-5 lg:h-6" className="w-40" />
            <div className="mt-4 max-w-prose">
              <SkeletonLine row="h-[26px]" className="w-full" />
              <SkeletonLine row="h-[26px]" className="w-5/6" />
            </div>
            <OptionGroupSkeleton count={3} />
            <OptionGroupSkeleton count={5} wide />
            <div className="mt-6">
              <SkeletonLine row="h-5" bar="h-3.5" className="w-16" />
              <Skeleton className="mt-2 h-[46px] w-[7.5rem] rounded-full" />
            </div>
            <Skeleton className="mt-6 hidden h-14 w-full rounded-full lg:block" />
          </div>
        </div>
      </Container>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-card p-3 lg:hidden">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-14 flex-1 rounded-full" />
      </div>
    </SkeletonRegion>
  )
}

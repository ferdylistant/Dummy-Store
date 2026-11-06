import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/skeleton'
import { SummarySkeleton } from '@/features/cart/cart-skeletons'

function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <SkeletonLine row="mb-1 h-5" bar="h-3.5" className="w-24" />
      <Skeleton className="h-11 rounded-xl" />
    </div>
  )
}

/** Same structure as the first checkout step. */
export function CheckoutSkeleton() {
  return (
    <SkeletonRegion label="Memuat checkout" className="grid gap-8 lg:grid-cols-3 lg:gap-12">
      <div className="min-w-0 lg:col-span-2">
        <div className="relative flex">
          <div className="absolute inset-x-[16.67%] top-5 border-t border-dashed border-input" />
          {[0, 1, 2].map((step) => (
            <div key={step} className="relative flex flex-1 flex-col items-center gap-2">
              <span className="grid size-10 place-items-center rounded-full border border-input bg-background" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>

        <Skeleton className="mt-6 h-[60px] rounded-xl lg:hidden" />

        <div className="mt-8">
          <SkeletonLine row="h-8 lg:h-9" bar="h-6 lg:h-7" className="w-36" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton className="md:col-span-2" />
            <div className="md:col-span-2">
              <SkeletonLine row="mb-1 h-5" bar="h-3.5" className="w-28" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </div>
      </div>

      <div className="hidden rounded-3xl bg-muted p-6 [--skeleton-bg:var(--color-border)] lg:block lg:self-start">
        <SummarySkeleton />
      </div>
    </SkeletonRegion>
  )
}

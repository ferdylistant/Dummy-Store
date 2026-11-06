'use client'

import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/skeleton'
import { useCart } from './store'

/** Same structure as CartLineItem. */
function CartLineSkeleton() {
  return (
    <li className="flex gap-3 py-4">
      <Skeleton className="aspect-[4/5] w-20 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <SkeletonLine className="w-2/3" />
            <SkeletonLine row="h-5" bar="h-3.5" className="w-1/3" />
          </div>
          <Skeleton className="mt-1 h-4 w-20" />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Skeleton className="h-[46px] w-[7.5rem] rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
      </div>
    </li>
  )
}

/** Shows one row per stored item, so the list keeps its final length. */
export function CartLinesSkeleton({ className }: { className?: string }) {
  const count = useCart((state) => state.items.length)

  return (
    <SkeletonRegion label="Memuat keranjang">
      <ul className={className}>
        {Array.from({ length: Math.max(count, 2) }, (_, index) => (
          <CartLineSkeleton key={index} />
        ))}
      </ul>
    </SkeletonRegion>
  )
}

/** Summary rows, matching OrderSummary. */
export function SummarySkeleton() {
  return (
    <div>
      <SkeletonLine row="mb-4 h-7" bar="h-5" className="w-40" />
      <div className="space-y-2">
        <SkeletonLine row="h-5" bar="h-3.5" className="w-full" />
        <SkeletonLine row="h-5" bar="h-3.5" className="w-full" />
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <SkeletonLine className="w-full" />
      </div>
    </div>
  )
}

export function CartPageSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
      <div className="lg:col-span-2">
        <CartLinesSkeleton className="divide-y divide-border rounded-xl border border-border bg-card px-4 md:px-6" />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 md:p-6 lg:self-start">
        <SummarySkeleton />
        <Skeleton className="mt-4 h-14 w-full rounded-full" />
      </div>
    </div>
  )
}

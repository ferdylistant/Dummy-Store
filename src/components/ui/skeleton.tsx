import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A placeholder block. Size it like the element it stands in for. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" style={style} className={cn('skeleton rounded-md', className)} />
}

/**
 * A line of text. The row keeps the real line height, so the page does not
 * shift when text arrives, and the bar inside stays thinner than the line.
 */
export function SkeletonLine({
  row = 'h-6',
  bar = 'h-4',
  className,
}: {
  row?: string
  bar?: string
  className?: string
}) {
  return (
    <div aria-hidden="true" className={cn('flex items-center', row)}>
      <div className={cn('skeleton rounded-md', bar, className)} />
    </div>
  )
}

/** Announces loading once, and hides the shapes from screen readers. */
export function SkeletonRegion({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div role="status" aria-label={label} className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function BreadcrumbSkeleton() {
  return (
    <div className="flex h-7 items-center gap-2">
      <Skeleton className="h-3.5 w-14" />
      <Skeleton className="h-3.5 w-24" />
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A paper garment tag with cut corners and a punched hole. */
export function PaperTag({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'relative block rounded-b-lg bg-background px-5 pt-7 pb-3 text-center text-foreground [clip-path:polygon(14px_0,calc(100%_-_14px)_0,100%_14px,100%_100%,0_100%,0_14px)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute top-2.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-muted ring-1 ring-input"
      />
      {children}
    </span>
  )
}

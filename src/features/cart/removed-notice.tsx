'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useCart } from './store'

const UNDO_WINDOW_MS = 6000

export function RemovedNotice({ className }: { className?: string }) {
  const removed = useCart((state) => state.lastRemoved)
  const undoRemove = useCart((state) => state.undoRemove)
  const dismissRemoved = useCart((state) => state.dismissRemoved)

  useEffect(() => {
    if (!removed) return
    const timer = window.setTimeout(dismissRemoved, UNDO_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [removed, dismissRemoved])

  return (
    <div role="status">
      {removed && (
        <p
          className={cn(
            'flex animate-in items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-1 text-sm text-secondary-foreground fade-in',
            className,
          )}
        >
          <span className="min-w-0">{removed.label} dihapus.</span>
          <button
            type="button"
            onClick={undoRemove}
            className="min-h-11 shrink-0 cursor-pointer px-1 font-semibold text-link underline underline-offset-4"
          >
            Batalkan
          </button>
        </p>
      )}
    </div>
  )
}

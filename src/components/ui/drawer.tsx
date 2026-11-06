'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Side panel built on the native <dialog>, which provides the focus trap,
 * Escape to close, and focus return without another dependency.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  side?: 'left' | 'right'
  footer?: ReactNode
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className={cn(
        'fixed inset-y-0 z-40 m-0 h-dvh max-h-dvh w-[min(100vw,28rem)] max-w-none bg-card text-card-foreground shadow-lg backdrop:bg-black/50',
        side === 'right'
          ? 'right-0 left-auto open:animate-in open:slide-in-from-right'
          : 'right-auto left-0 open:animate-in open:slide-in-from-left',
        'open:[animation-duration:250ms]',
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Tutup" onClick={onClose}>
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-border p-4">{footer}</div>}
      </div>
    </dialog>
  )
}

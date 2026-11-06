'use client'

import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const EXIT_MS = 170

const SIDES = {
  right:
    'inset-y-0 right-0 left-auto h-dvh max-h-dvh w-[min(100vw,28rem)] not-data-closing:slide-in-from-right data-closing:slide-out-to-right',
  left: 'inset-y-0 right-auto left-0 h-dvh max-h-dvh w-[min(100vw,28rem)] not-data-closing:slide-in-from-left data-closing:slide-out-to-left',
  top: 'inset-x-0 top-0 bottom-auto h-auto max-h-dvh w-full not-data-closing:slide-in-from-top data-closing:slide-out-to-top',
}

/**
 * Panel built on the native <dialog>, which provides the focus trap, Escape to
 * close, and focus return without another dependency.
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
  side?: keyof typeof SIDES
  footer?: ReactNode
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open) {
      delete dialog.dataset.closing
      if (!dialog.open) dialog.showModal()
      return
    }

    if (!dialog.open) return

    // A native close() is instant, so play the exit animation before calling it.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    dialog.dataset.closing = ''
    const timer = window.setTimeout(
      () => {
        delete dialog.dataset.closing
        dialog.close()
      },
      reduced ? 0 : EXIT_MS,
    )
    return () => window.clearTimeout(timer)
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className={cn(
        'fixed z-40 m-0 max-w-none bg-card text-card-foreground',
        'backdrop:bg-black/30 backdrop:backdrop-blur-sm backdrop:transition-opacity backdrop:duration-150 data-closing:backdrop:opacity-0',
        'not-data-closing:animate-in not-data-closing:[animation-duration:250ms]',
        'data-closing:animate-out data-closing:fill-mode-forwards data-closing:[animation-duration:170ms]',
        SIDES[side],
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 px-4 py-2">
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

'use client'

import { AlertTriangle, Info, type LucideIcon } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ConfirmOptions {
  title: string
  /** One short sentence under the title. */
  description?: string
  /** What happens if the admin goes ahead, one line each. */
  consequences?: string[]
  /** Leave out for a notice that only has a close button. */
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'info'
}

type Ask = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Ask | null>(null)

/** Asks before something that cannot be undone, in the store's own style. */
export function useConfirm() {
  const ask = useContext(ConfirmContext)
  if (!ask) throw new Error('useConfirm needs a ConfirmProvider')
  return ask
}

/**
 * One native dialog for the whole dashboard. The browser keeps focus
 * inside it, closes it with Esc, and returns focus to the button that
 * opened it.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const titleId = useId()
  const textId = useId()

  const ask = useCallback<Ask>((next) => {
    resolver.current?.(false)
    setOptions(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  useEffect(() => {
    const node = dialog.current
    if (!node || !options || node.open) return
    node.showModal()
    // The safe choice takes focus, so Enter never deletes by accident.
    cancelRef.current?.focus()
  }, [options])

  function finish(value: boolean) {
    resolver.current?.(value)
    resolver.current = null
    dialog.current?.close()
  }

  const tone = options?.tone ?? 'danger'
  const Icon: LucideIcon = tone === 'danger' ? AlertTriangle : Info

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      <dialog
        ref={dialog}
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={textId}
        onClose={() => {
          resolver.current?.(false)
          resolver.current = null
          setOptions(null)
        }}
        onClick={(event) => event.target === dialog.current && finish(false)}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] overflow-visible rounded-3xl bg-transparent p-0 text-foreground backdrop:bg-foreground/25 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 open:duration-200 motion-reduce:open:animate-none"
      >
        {options && (
          // A paper tag: a card with a punched hole, the store's signature shape.
          <div className="rounded-3xl bg-popover p-1.5 shadow-2xl">
            <div className="relative rounded-[1.375rem] border border-dashed border-input px-6 pt-10 pb-6">
              <span aria-hidden="true" className="absolute top-4 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-muted ring-1 ring-input" />
              <span className={cn('grid size-11 place-items-center rounded-full', tone === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground')}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h2 id={titleId} className="mt-4 text-xl font-semibold tracking-tight [overflow-wrap:anywhere]">
                {options.title}
              </h2>
              <div id={textId} className="mt-2 text-sm text-muted-foreground">
                {options.description && <p>{options.description}</p>}
                {options.consequences && options.consequences.length > 0 && (
                  <ul className="mt-3 grid gap-2 border-t border-dashed border-input pt-3">
                    {options.consequences.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-input" />
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={() => finish(false)}
                  className="h-11 cursor-pointer rounded-full border border-input px-5 text-sm font-medium transition-colors duration-200 hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {options.cancelLabel ?? (options.confirmLabel ? 'Batal' : 'Mengerti')}
                </button>
                {options.confirmLabel && (
                  <button
                    type="button"
                    onClick={() => finish(true)}
                    className={cn(
                      'h-11 cursor-pointer rounded-full px-5 text-sm font-semibold transition-[transform,background-color] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      tone === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary text-primary-foreground hover:bg-primary-hover',
                    )}
                  >
                    {options.confirmLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}

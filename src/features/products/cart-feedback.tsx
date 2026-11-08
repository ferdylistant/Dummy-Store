'use client'

import { X } from 'lucide-react'
import { AnimatePresence, m, useAnimationControls, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { buttonClasses } from '@/components/ui/button'
import { useCart } from '@/features/cart/store'
import { formatRupiah } from '@/lib/format'

export interface Flight {
  id: number
  from: { x: number; y: number }
  to: { x: number; y: number }
}

/** Where a flight should land: the bag icon in the header. */
export function cartTarget() {
  const target = document.querySelector('[data-cart-target]')
  if (!target) return null
  const rect = target.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** A small garment tag that arcs from the button into the header bag. */
export function CartFlight({ flight, onLanded }: { flight: Flight | null; onLanded: () => void }) {
  return (
    <AnimatePresence>
      {flight && (
        <m.span
          key={flight.id}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 z-50 text-foreground"
          initial={{ x: flight.from.x - 12, y: flight.from.y - 12, rotate: 0, scale: 1 }}
          animate={{
            x: [flight.from.x - 12, (flight.from.x + flight.to.x) / 2 - 12, flight.to.x - 12],
            y: [flight.from.y - 12, Math.min(flight.from.y, flight.to.y) - 90, flight.to.y - 12],
            rotate: [0, -25, 15],
            scale: [1, 1.1, 0.45],
          }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.65, ease: [0.3, 0, 0.4, 1], times: [0, 0.45, 1] }}
          onAnimationComplete={onLanded}
        >
          <svg viewBox="0 0 24 24" className="size-6 drop-shadow">
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M10.6 2.3a2 2 0 0 1 1.4-.6h8.3a2 2 0 0 1 2 2V12a2 2 0 0 1-.6 1.4l-8.3 8.3a2 2 0 0 1-2.8 0l-8-8a2 2 0 0 1 0-2.8ZM17 5.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3Z"
            />
          </svg>
        </m.span>
      )}
    </AnimatePresence>
  )
}

export interface AddedItem {
  id: number
  name: string
  color: string
  colorHex: string
  size: string
  quantity: number
  price: number
  /** Bottom edge of the header when the tag appears, so it hangs right under it. */
  top: number
  /** Counts adds while the tag is open. Each one nudges the tag instead of replacing it. */
  bump: number
}

/** A paper tag that drops from under the header to confirm the item is in the bag. */
export function AddedNotice({ item, onClose }: { item: AddedItem | null; onClose: () => void }) {
  const reduced = useReducedMotion()
  const openCart = useCart((state) => state.openCart)
  const tagRef = useRef<HTMLDivElement>(null)
  const nudge = useAnimationControls()
  const id = item?.id
  const bump = item?.bump ?? 0

  // Another add nudges the tag from where it hangs. Remounting would drop keyboard focus.
  useEffect(() => {
    if (bump > 0 && !reduced) {
      nudge.start({ rotate: [null, -4, 2, 0], transition: { duration: 0.5, ease: 'easeOut' } })
    }
  }, [bump, reduced, nudge])

  // The promo bar scrolls away and the header moves up, so the tag follows it.
  useEffect(() => {
    if (id === undefined) return
    const header = document.querySelector('header')
    const follow = () => {
      if (tagRef.current && header) {
        tagRef.current.style.top = `${Math.max(0, header.getBoundingClientRect().bottom)}px`
      }
    }
    window.addEventListener('scroll', follow, { passive: true })
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow)
      window.removeEventListener('resize', follow)
    }
  }, [id])

  return (
    // A zero-height layer. Each tag carries its own position, so one that is
    // leaving stays where it was instead of jumping when the item clears.
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0">
      <AnimatePresence>
        {item && (
          <m.div
            key={item.id}
            ref={tagRef}
            style={{ top: item.top, transformOrigin: '50% 0' }}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -24, rotate: 9 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{
              opacity: 0,
              y: reduced ? 0 : -12,
              transition: { type: 'tween', duration: 0.18, ease: 'easeIn' },
            }}
            // A spring on opacity overshoots and pulses, so only the swing is springy.
            transition={{ default: { type: 'spring', stiffness: 170, damping: 12 }, opacity: { duration: 0.15 } }}
            className="pointer-events-auto absolute inset-x-4 mx-auto flex max-w-sm flex-col items-center sm:right-6 sm:left-auto sm:mx-0 sm:w-96 lg:right-8"
          >
            <span aria-hidden="true" className="block h-4 w-px bg-input" />
            <m.div
              animate={nudge}
              style={{ transformOrigin: '50% 0' }}
              className="relative w-full rounded-b-2xl bg-card px-5 pt-7 pb-4 shadow-lg ring-1 ring-border [clip-path:polygon(18px_0,calc(100%_-_18px)_0,100%_18px,100%_100%,0_100%,0_18px)]">
              <span
                aria-hidden="true"
                className="absolute top-2.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-muted ring-1 ring-input"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pemberitahuan"
                className="absolute top-1 right-1 grid size-11 cursor-pointer place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
              <p className="text-xs font-semibold tracking-wide text-accent uppercase">Masuk keranjang</p>
              <div className="mt-2 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="size-9 shrink-0 rounded-full border border-input"
                  style={{ backgroundColor: item.colorHex }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.color}
                    {item.size === 'Satu ukuran' ? '' : `, ${item.size}`} · {item.quantity} x{' '}
                    {formatRupiah(item.price)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  openCart()
                }}
                className={buttonClasses({ variant: 'primary', className: 'mt-4 w-full' })}
              >
                Lihat Keranjang
              </button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

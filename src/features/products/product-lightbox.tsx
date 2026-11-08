'use client'

import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatRupiah } from '@/lib/format'
import { mediaSrc } from '@/lib/media'
import { useCalmMotion } from '@/lib/use-calm-motion'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/catalog'

const MAX_ZOOM = 4
const TAP_ZOOM = 2.5
const SWIPE_PX = 60

interface View {
  scale: number
  x: number
  y: number
}

const RESET: View = { scale: 1, x: 0, y: 0 }

/** Keeps a zoomed picture covering its frame, so no empty edge can be dragged in. */
function clamp(view: View, frame: DOMRect | undefined): View {
  if (!frame || view.scale <= 1) return RESET
  const maxX = ((view.scale - 1) * frame.width) / 2
  const maxY = ((view.scale - 1) * frame.height) / 2
  return {
    scale: view.scale,
    x: Math.max(-maxX, Math.min(maxX, view.x)),
    y: Math.max(-maxY, Math.min(maxY, view.y)),
  }
}

/**
 * Full screen photo viewer. Built on the native <dialog>, so focus stays
 * inside, Escape closes it, and the page behind does not scroll.
 * Tap or click zooms into that spot, drag moves around, pinch and the
 * wheel zoom, and a sideways swipe changes photo when not zoomed in.
 */
export function ProductLightbox({
  product,
  index,
  onIndexChange,
  onClose,
}: {
  product: Product
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ startX: number; startY: number; view: View; distance: number; moved: boolean } | null>(null)
  const [view, setView] = useState<View>(RESET)
  const [dragging, setDragging] = useState(false)
  const calm = useCalmMotion()
  const images = product.images
  const open = index !== null
  const current = index ?? 0
  const image = images[current]
  const zoomed = view.scale > 1

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const go = useCallback(
    (step: number) => {
      if (!images.length) return
      setView(RESET)
      onIndexChange((current + step + images.length) % images.length)
    },
    [current, images.length, onIndexChange],
  )

  const zoomTo = useCallback((scale: number, origin?: { x: number; y: number }) => {
    const frame = frameRef.current?.getBoundingClientRect()
    setView((previous) => {
      const next = Math.max(1, Math.min(MAX_ZOOM, scale))
      if (!frame || next === 1) return RESET
      // Zoom toward the point under the pointer, so that spot stays put.
      const px = origin ? origin.x - (frame.left + frame.width / 2) : 0
      const py = origin ? origin.y - (frame.top + frame.height / 2) : 0
      const ratio = next / previous.scale
      return clamp({ scale: next, x: px - (px - previous.x) * ratio, y: py - (py - previous.y) * ratio }, frame)
    })
  }, [])

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowRight') go(1)
    else if (event.key === 'ArrowLeft') go(-1)
    else if (event.key === '+' || event.key === '=') zoomTo(view.scale + 0.5)
    else if (event.key === '-') zoomTo(view.scale - 0.5)
    else if (event.key === '0') setView(RESET)
    else return
    event.preventDefault()
  }

  function onPointerDown(event: ReactPointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointers.current.values()]
    gesture.current = {
      startX: event.clientX,
      startY: event.clientY,
      view,
      distance: points.length === 2 ? Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) : 0,
      moved: false,
    }
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointers.current.values()]
    const start = gesture.current
    const dx = event.clientX - start.startX
    const dy = event.clientY - start.startY
    if (Math.hypot(dx, dy) > 6) start.moved = true

    if (points.length === 2 && start.distance) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      zoomTo(start.view.scale * (distance / start.distance), {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      })
    } else if (start.view.scale > 1) {
      setView(clamp({ ...start.view, x: start.view.x + dx, y: start.view.y + dy }, frameRef.current?.getBoundingClientRect()))
    }
  }

  function onPointerUp(event: ReactPointerEvent) {
    const start = gesture.current
    pointers.current.delete(event.pointerId)
    if (pointers.current.size > 0 || !start) return
    gesture.current = null
    setDragging(false)
    const dx = event.clientX - start.startX
    if (!start.moved) {
      // A tap or click zooms into that spot, or back out.
      if (view.scale > 1) setView(RESET)
      else zoomTo(TAP_ZOOM, { x: event.clientX, y: event.clientY })
    } else if (start.view.scale === 1 && Math.abs(dx) > SWIPE_PX) {
      go(dx < 0 ? 1 : -1)
    }
  }

  const scaleRef = useRef(1)
  useEffect(() => {
    scaleRef.current = view.scale
  }, [view.scale])

  // Wheel zoom needs a non-passive listener to stop the page from scrolling.
  useEffect(() => {
    const frame = frameRef.current
    if (!frame || !open) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      zoomTo(scaleRef.current * (event.deltaY < 0 ? 1.2 : 1 / 1.2), { x: event.clientX, y: event.clientY })
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [open, zoomTo])

  if (!images.length) return null

  return (
    <dialog
      ref={dialogRef}
      aria-label={`Foto ${product.name}`}
      onClose={() => {
        setView(RESET)
        onClose()
      }}
      onKeyDown={onKeyDown}
      className="m-0 h-dvh max-h-dvh w-screen max-w-none bg-background p-0 text-foreground backdrop:bg-background"
    >
      {open && image && (
        <div className="grid h-full grid-rows-[auto_1fr_auto] lg:grid-cols-[1fr_20rem] lg:grid-rows-[1fr_auto]">
          {/* The picture */}
          <div className="relative row-start-2 min-h-0 lg:row-start-1">
            <div
              ref={frameRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={cn(
                'relative mx-auto h-full w-full touch-none overflow-hidden select-none',
                zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
              )}
            >
              <div
                className={cn('absolute inset-0', !calm && !dragging && 'transition-transform duration-200 ease-out')}
                style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}
              >
                <Image
                  key={image.url}
                  src={mediaSrc(image.url)}
                  alt={image.alt || `${product.name}, foto ${current + 1}`}
                  fill
                  sizes="(min-width: 1024px) 75vw, 100vw"
                  quality={90}
                  priority
                  draggable={false}
                  className="object-contain p-4 lg:p-10"
                />
              </div>
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Foto sebelumnya"
                  className="absolute top-1/2 left-3 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-background/90 shadow-sm ring-1 ring-border backdrop-blur hover:bg-muted"
                >
                  <ChevronLeft aria-hidden="true" className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Foto berikutnya"
                  className="absolute top-1/2 right-3 grid size-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-background/90 shadow-sm ring-1 ring-border backdrop-blur hover:bg-muted"
                >
                  <ChevronRight aria-hidden="true" className="size-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-background/90 p-1 shadow-sm ring-1 ring-border backdrop-blur">
              <button
                type="button"
                onClick={() => zoomTo(view.scale - 0.5)}
                disabled={!zoomed}
                aria-label="Perkecil"
                className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus aria-hidden="true" className="size-5" />
              </button>
              <span className="min-w-12 text-center text-sm font-medium tabular-nums" aria-hidden="true">
                {Math.round(view.scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => zoomTo(view.scale + 0.5)}
                disabled={view.scale >= MAX_ZOOM}
                aria-label="Perbesar"
                className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="size-5" />
              </button>
            </div>
          </div>

          {/* The hang tag beside the picture: what this photo shows */}
          <aside className="row-start-1 flex items-start justify-between gap-4 border-b border-border p-4 lg:col-start-2 lg:row-span-2 lg:flex-col lg:justify-start lg:border-b-0 lg:border-l lg:bg-muted lg:p-8">
            <div className="min-w-0 lg:w-full">
              <p className="text-xs font-semibold tracking-wide text-accent uppercase" aria-live="polite">
                Foto {current + 1} dari {images.length}
              </p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-tight lg:text-2xl lg:whitespace-normal">
                {product.name}
              </h2>
              <p className="text-sm font-medium tabular-nums lg:mt-1 lg:text-base">{formatRupiah(product.price)}</p>

              <div className="mt-6 hidden rounded-2xl bg-background p-1.5 lg:block">
                <div className="relative rounded-xl border border-dashed border-input px-4 pt-6 pb-4">
                  <span aria-hidden="true" className="absolute top-2 left-1/2 size-2 -translate-x-1/2 rounded-full bg-muted ring-1 ring-input" />
                  {image.alt && <p className="text-sm leading-relaxed">{image.alt}</p>}
                  <dl className={cn('grid gap-2 text-sm', image.alt && 'mt-3 border-t border-dashed border-input pt-3')}>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Warna</dt>
                      <dd className="text-right">{product.colors.map((color) => color.name).join(', ')}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Ukuran</dt>
                      <dd className="text-right">{product.sizes.join(', ')}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Bahan</dt>
                      <dd className="text-right">{product.material}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <ul className="mt-6 hidden space-y-1 text-xs text-muted-foreground lg:block" aria-label="Petunjuk">
                <li>Klik foto untuk memperbesar bagian itu, lalu geser.</li>
                <li>Tombol panah untuk pindah foto, + dan − untuk zoom.</li>
                <li>Esc untuk menutup.</li>
              </ul>
            </div>
            <form method="dialog" className="lg:order-first lg:self-end">
              <button
                type="submit"
                autoFocus
                aria-label="Tutup galeri"
                className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-muted hover:bg-input/40 lg:bg-background"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </form>
          </aside>

          {/* Thumbnails hang from a rail, the open one lower than the rest */}
          {images.length > 1 && (
            <nav aria-label="Pilih foto" className="row-start-3 border-t border-border px-4 pb-4 lg:row-start-2">
              <ul className="relative mx-auto flex max-w-3xl justify-center gap-3 overflow-x-auto pt-0 pb-1 [scrollbar-width:none]">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-input" />
                {images.map((item, itemIndex) => {
                  const active = itemIndex === current
                  return (
                    <li key={item.url} className="flex shrink-0 flex-col items-center">
                      <span
                        aria-hidden="true"
                        className={cn('block w-px bg-input transition-[height] duration-200', active ? 'h-5' : 'h-2')}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setView(RESET)
                          onIndexChange(itemIndex)
                        }}
                        aria-label={`Foto ${itemIndex + 1}${item.alt ? `: ${item.alt}` : ''}`}
                        aria-current={active ? 'true' : undefined}
                        className={cn(
                          'relative size-14 cursor-pointer overflow-hidden rounded-lg bg-muted ring-offset-2 transition-[box-shadow,opacity] duration-200 lg:size-16',
                          active ? 'ring-2 ring-foreground' : 'opacity-70 hover:opacity-100',
                        )}
                      >
                        <Image src={mediaSrc(item.url)} alt="" fill sizes="64px" className="object-cover" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          )}
        </div>
      )}
    </dialog>
  )
}

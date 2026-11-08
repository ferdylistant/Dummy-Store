'use client'

import { Expand } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, type ReactNode } from 'react'
import { mediaSrc } from '@/lib/media'
import { useCalmMotion } from '@/lib/use-calm-motion'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/catalog'
import { ProductLightbox } from './product-lightbox'

/**
 * Product photos: swipe or use the thumbnails, and open any photo full screen.
 * The price tag and anything else passed as children hang over the frame.
 */
export function ProductGallery({ product, children }: { product: Product; children?: ReactNode }) {
  const images = product.images
  const stripRef = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const calm = useCalmMotion()

  function show(index: number) {
    const strip = stripRef.current
    if (!strip) return
    strip.scrollTo({ left: index * strip.clientWidth, behavior: calm ? 'auto' : 'smooth' })
    setActive(index)
  }

  function openAt(index: number, from: HTMLElement) {
    opener.current = from
    setLightbox(index)
  }

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted">
        <div
          ref={stripRef}
          onScroll={(event) => {
            const strip = event.currentTarget
            setActive(Math.round(strip.scrollLeft / strip.clientWidth))
          }}
          className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
          aria-roledescription="carousel"
          aria-label={`Foto ${product.name}`}
        >
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              onClick={(event) => openAt(index, event.currentTarget)}
              aria-label={`Buka foto ${index + 1} dari ${images.length} layar penuh`}
              className="relative h-full w-full shrink-0 cursor-zoom-in snap-center"
            >
              <Image
                src={mediaSrc(image.url)}
                alt={image.alt || `${product.name}, foto ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority={index === 0}
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {children}

        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          {images.length > 1 ? (
            <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium tabular-nums shadow-sm backdrop-blur">
              {active + 1} / {images.length}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={(event) => openAt(active, event.currentTarget)}
            className="pointer-events-auto inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-background/90 px-4 text-sm font-medium shadow-sm backdrop-blur hover:bg-background"
          >
            <Expand aria-hidden="true" className="size-4" />
            Perbesar
          </button>
        </div>
      </div>

      {images.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Pilih foto">
          {images.map((image, index) => (
            <li key={image.url} className="shrink-0">
              <button
                type="button"
                onClick={() => show(index)}
                aria-label={`Lihat foto ${index + 1}`}
                aria-current={index === active ? 'true' : undefined}
                className={cn(
                  'relative block size-16 cursor-pointer overflow-hidden rounded-xl bg-muted ring-offset-2 transition-[box-shadow,opacity] duration-200 lg:size-20',
                  index === active ? 'ring-2 ring-foreground' : 'opacity-70 hover:opacity-100',
                )}
              >
                <Image src={mediaSrc(image.url)} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ProductLightbox
        product={product}
        index={lightbox}
        onIndexChange={(index) => {
          setLightbox(index)
          show(index)
        }}
        onClose={() => {
          setLightbox(null)
          // The dialog gives focus back to whatever opened it.
          opener.current?.focus()
        }}
      />
    </div>
  )
}

'use client'

import { RotateCcw, Truck } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PaperTag } from '@/components/ui/paper-tag'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { MAX_QUANTITY, useCart } from '@/features/cart/store'
import { formatRupiah, formatRupiahShort } from '@/lib/format'
import { FREE_SHIPPING_MIN, RETURN_DAYS } from '@/lib/pricing'
import { siteConfig } from '@/lib/site'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/catalog'
import { AddToCartButton } from './add-to-cart-button'
import { ProductImage } from './product-image'
import { ProductPrice } from './product-price'

const ONE_SIZE = 'Satu ukuran'
/** Long enough to read the confirmation before the cart covers the button. */
const CONFIRM_MS = 500

export function ProductView({ product }: { product: Product }) {
  const add = useCart((state) => state.add)
  const openCart = useCart((state) => state.openCart)
  const hasSizes = product.sizes[0] !== ONE_SIZE
  const [color, setColor] = useState(product.colors[0])
  const [size, setSize] = useState(hasSizes ? '' : ONE_SIZE)
  const [quantity, setQuantity] = useState(1)
  const [sizeError, setSizeError] = useState(false)
  const [added, setAdded] = useState(false)
  const [swings, setSwings] = useState(0)
  const confirmTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(confirmTimer.current), [])

  const isSoldOut = (colorName: string, sizeName: string) =>
    product.soldOut?.includes(`${colorName}|${sizeName}`) ?? false
  const selectedSoldOut = Boolean(size) && isSoldOut(color.name, size)
  const allSoldOut = product.sizes.every((item) => isSoldOut(color.name, item))
  const cannotBuy = selectedSoldOut || allSoldOut

  function handleAdd() {
    if (added) return
    if (!size) {
      setSizeError(true)
      document.getElementById('pilih-ukuran')?.scrollIntoView({ block: 'center' })
      return
    }
    add({ productId: product.id, color: color.name, size, quantity })
    setAdded(true)
    confirmTimer.current = window.setTimeout(() => {
      setAdded(false)
      openCart()
    }, CONFIRM_MS)
  }

  const buttonLabel = cannotBuy ? 'Stok Habis' : 'Tambah ke Keranjang'

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
      <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-muted lg:sticky lg:top-24 lg:self-start">
        <AnimatePresence initial={false}>
          <m.div
            key={color.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            <ProductImage
              product={product}
              color={color.hex}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
            />
          </m.div>
        </AnimatePresence>

        <m.span
          key={swings}
          aria-hidden="true"
          initial={swings > 0 ? { rotate: -14 } : false}
          animate={{ rotate: 0 }}
          transition={{ type: 'spring', stiffness: 160, damping: 6 }}
          style={{ transformOrigin: '50% 0' }}
          className="absolute top-0 right-6 z-10 drop-shadow-sm lg:right-10"
        >
          <span className="mx-auto block h-8 w-px bg-input lg:h-12" />
          <PaperTag className="text-sm font-semibold tabular-nums">
            {formatRupiahShort(product.price)}
          </PaperTag>
        </m.span>
      </div>

      <div>
        {(product.compareAtPrice || product.isNew) && (
          <p className="text-sm font-semibold text-accent">
            {product.compareAtPrice ? 'Harga spesial' : 'Baru'}
          </p>
        )}
        <h1 className="mt-1 text-4xl font-semibold tracking-tight lg:text-5xl">{product.name}</h1>
        <ProductPrice product={product} className="mt-2 text-xl lg:text-2xl" />
        <p className="mt-4 max-w-prose leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium">
            Warna: <span className="font-normal text-muted-foreground">{color.name}</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.colors.map((option) => (
              <label key={option.name} className="cursor-pointer" title={option.name}>
                <input
                  type="radio"
                  name="warna"
                  className="peer sr-only"
                  checked={option.name === color.name}
                  onChange={() => {
                    setColor(option)
                    setSwings((value) => value + 1)
                  }}
                />
                <span className="sr-only">{option.name}</span>
                <span
                  aria-hidden="true"
                  className="grid size-11 place-items-center rounded-full border-2 border-transparent peer-checked:border-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                >
                  <span
                    className="block size-8 rounded-full border border-input"
                    style={{ backgroundColor: option.hex }}
                  />
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {hasSizes && (
          <fieldset id="pilih-ukuran" className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <legend className="text-sm font-medium">Ukuran</legend>
              <Link
                href="/bantuan#ukuran"
                className="py-1 text-sm font-medium"
              >
                <span className="link-stitch">Panduan ukuran</span>
              </Link>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((option) => {
                const soldOut = isSoldOut(color.name, option)
                return (
                  <label key={option} className={soldOut ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <input
                      type="radio"
                      name="ukuran"
                      className="peer sr-only"
                      disabled={soldOut}
                      checked={option === size}
                      aria-describedby={sizeError ? 'ukuran-error' : undefined}
                      onChange={() => {
                        setSize(option)
                        setSizeError(false)
                      }}
                    />
                    <span
                      className={cn(
                        'grid h-11 min-w-11 place-items-center rounded-full border border-input px-4 text-sm font-medium transition-colors duration-200 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                        soldOut
                          ? 'text-muted-foreground line-through opacity-50'
                          : 'peer-not-checked:hover:bg-muted',
                      )}
                    >
                      {option}
                      {soldOut && <span className="sr-only"> (habis)</span>}
                    </span>
                  </label>
                )
              })}
            </div>
            {sizeError && (
              <p id="ukuran-error" role="alert" className="mt-2 text-sm text-destructive">
                Pilih ukuran dulu sebelum menambahkan ke keranjang.
              </p>
            )}
          </fieldset>
        )}

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Jumlah</p>
          <QuantityStepper
            label="Jumlah produk"
            value={quantity}
            max={MAX_QUANTITY}
            onChange={setQuantity}
          />
        </div>

        <AddToCartButton
          size="lg"
          added={added}
          label={buttonLabel}
          disabled={cannotBuy}
          onClick={handleAdd}
          className="mt-6 hidden w-full lg:inline-flex"
        />
        <p role="status" className="sr-only">
          {added ? `${product.name} ditambahkan ke keranjang` : ''}
        </p>

        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Truck aria-hidden="true" className="size-5 shrink-0" />
            Gratis ongkir reguler mulai {formatRupiah(FREE_SHIPPING_MIN)}
          </li>
          <li className="flex gap-2">
            <RotateCcw aria-hidden="true" className="size-5 shrink-0" />
            Retur {RETURN_DAYS} hari jika ukurannya tidak pas
          </li>
        </ul>

        <section aria-labelledby="detail-produk" className="mt-8 rounded-2xl bg-muted p-1.5">
          <div className="rounded-xl border border-dashed border-input px-5 py-6">
            <p
              aria-hidden="true"
              className="text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase"
            >
              {siteConfig.name}
            </p>
            <h2 id="detail-produk" className="mt-1 text-center font-semibold">
              Detail produk
            </h2>
            <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
              {[
                ['Bahan', product.material],
                ['Warna', product.colors.map((item) => item.name).join(', ')],
                ['Ukuran', product.sizes.join(', ')],
              ].map(([term, value]) => (
                <div key={term} className="flex justify-between gap-6 py-2.5">
                  <dt className="text-muted-foreground">{term}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <div
        data-buy-bar
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-card p-3 lg:hidden"
      >
        <p className="font-semibold tabular-nums">{formatRupiah(product.price)}</p>
        <AddToCartButton
          added={added}
          label={cannotBuy ? buttonLabel : 'Tambah'}
          aria-label={added ? undefined : buttonLabel}
          disabled={cannotBuy}
          onClick={handleAdd}
          className="flex-1"
        />
      </div>
    </div>
  )
}

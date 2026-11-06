'use client'

import { Check, RotateCcw, Truck } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { MAX_QUANTITY, useCart } from '@/features/cart/store'
import { formatRupiah } from '@/lib/format'
import { FREE_SHIPPING_MIN, RETURN_DAYS } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/catalog'
import { ProductImage } from './product-image'
import { ProductPrice } from './product-price'

const ONE_SIZE = 'Satu ukuran'

export function ProductView({ product }: { product: Product }) {
  const add = useCart((state) => state.add)
  const openCart = useCart((state) => state.openCart)
  const hasSizes = product.sizes[0] !== ONE_SIZE
  const [color, setColor] = useState(product.colors[0])
  const [size, setSize] = useState(hasSizes ? '' : ONE_SIZE)
  const [quantity, setQuantity] = useState(1)
  const [sizeError, setSizeError] = useState(false)

  const isSoldOut = (colorName: string, sizeName: string) =>
    product.soldOut?.includes(`${colorName}|${sizeName}`) ?? false
  const selectedSoldOut = Boolean(size) && isSoldOut(color.name, size)
  const allSoldOut = product.sizes.every((item) => isSoldOut(color.name, item))
  const cannotBuy = selectedSoldOut || allSoldOut

  function handleAdd() {
    if (!size) {
      setSizeError(true)
      document.getElementById('pilih-ukuran')?.scrollIntoView({ block: 'center' })
      return
    }
    add({ productId: product.id, color: color.name, size, quantity })
    openCart()
  }

  const buttonLabel = cannotBuy ? 'Stok Habis' : 'Tambah ke Keranjang'

  return (
    <div className="grid gap-6 pb-24 lg:grid-cols-2 lg:gap-12 lg:pb-0">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted lg:sticky lg:top-24 lg:self-start">
        <ProductImage
          product={product}
          color={color.hex}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
      </div>

      <div>
        <div className="flex flex-wrap gap-1">
          {product.compareAtPrice && <Badge tone="promo">Diskon</Badge>}
          {product.isNew && <Badge>Baru</Badge>}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">{product.name}</h1>
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
                  onChange={() => setColor(option)}
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
                className="py-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Panduan ukuran
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
                        'grid h-11 min-w-11 place-items-center rounded-lg border border-input px-3 text-sm font-medium transition-colors duration-200 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
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

        <Button
          size="lg"
          disabled={cannotBuy}
          onClick={handleAdd}
          className="mt-6 hidden w-full lg:inline-flex"
        >
          {buttonLabel}
        </Button>

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

        <section aria-labelledby="detail-produk" className="mt-6 border-t border-border pt-6">
          <h2 id="detail-produk" className="font-semibold">
            Detail produk
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {product.details.map((detail) => (
              <li key={detail} className="flex gap-2">
                <Check aria-hidden="true" className="size-5 shrink-0 text-success" />
                {detail}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-card p-3 lg:hidden">
        <p className="font-semibold tabular-nums">{formatRupiah(product.price)}</p>
        <Button disabled={cannotBuy} onClick={handleAdd} className="flex-1">
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}

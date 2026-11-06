'use client'

import { Trash2 } from 'lucide-react'
import { m } from 'motion/react'
import Link from 'next/link'
import type { Ref } from 'react'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { ProductImage } from '@/features/products/product-image'
import { formatRupiah } from '@/lib/format'
import { MAX_QUANTITY, useCart } from './store'
import type { CartLine } from './use-cart-lines'

export function CartLineItem({
  line,
  onNavigate,
  ref,
}: {
  line: CartLine
  onNavigate?: () => void
  ref?: Ref<HTMLLIElement>
}) {
  const setQuantity = useCart((state) => state.setQuantity)
  const remove = useCart((state) => state.remove)
  const variant = [line.color, line.size === 'Satu ukuran' ? null : line.size]
    .filter(Boolean)
    .join(', ')

  return (
    <m.li
      ref={ref}
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="flex gap-3 py-4"
    >
      <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
        <ProductImage product={line.product} color={line.colorHex} sizes="80px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/produk/${line.product.slug}`}
              onClick={onNavigate}
              className="font-medium hover:text-link"
            >
              {line.product.name}
            </Link>
            <p className="text-sm text-muted-foreground">{variant}</p>
          </div>
          <p className="font-semibold tabular-nums">{formatRupiah(line.lineTotal)}</p>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantityStepper
            label={`Jumlah ${line.product.name}`}
            value={line.quantity}
            max={MAX_QUANTITY}
            onChange={(quantity) => setQuantity(line.key, quantity)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Hapus ${line.product.name} dari keranjang`}
            onClick={() => remove(line.key, line.product.name)}
          >
            <Trash2 aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </div>
    </m.li>
  )
}

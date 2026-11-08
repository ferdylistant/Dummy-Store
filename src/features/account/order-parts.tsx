'use client'

import { Check, CircleX, Clock, PackageCheck, RotateCcw, TimerOff, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ProductImage } from '@/features/products/product-image'
import { cn } from '@/lib/utils'
import type { OrderHistoryItem } from '@/services/account'
import { getProductsByIds } from '@/services/products'
import type { Product } from '@/types/catalog'

type Status = OrderHistoryItem['status']

export const STATUS: Record<Status, { label: string; icon: LucideIcon; tone: string }> = {
  awaiting_payment: { label: 'Belum dibayar', icon: Clock, tone: 'text-warning' },
  paid: { label: 'Dikemas', icon: PackageCheck, tone: 'text-success' },
  expired: { label: 'Kedaluwarsa', icon: TimerOff, tone: 'text-muted-foreground' },
  cancelled: { label: 'Dibatalkan', icon: CircleX, tone: 'text-muted-foreground' },
  refunded: { label: 'Dana dikembalikan', icon: RotateCcw, tone: 'text-muted-foreground' },
}

/** Status in words with an icon, never color alone. */
export function StatusChip({ status }: { status: Status }) {
  const { label, icon: Icon, tone } = STATUS[status]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium">
      <Icon aria-hidden="true" className={cn('size-4', tone)} />
      {label}
    </span>
  )
}

const STEPS = ['Dibuat', 'Dibayar', 'Dikemas', 'Dikirim', 'Diterima']

/**
 * Where an open order is, as a seam: done steps are sewn with a solid thread.
 * Shipping is not tracked yet, so a paid order stops at Dikemas.
 */
export function OrderProgress({ status }: { status: Status }) {
  if (status !== 'awaiting_payment' && status !== 'paid') return null
  const current = status === 'awaiting_payment' ? 1 : 2

  return (
    <ol aria-label="Tahap pesanan" className="grid grid-cols-5">
      {STEPS.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className="relative flex flex-col items-center gap-2 text-center"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  // Stops short of both circles, so the thread never runs into them.
                  'absolute top-[11px] right-[calc(50%+16px)] left-[calc(-50%+16px)] border-t-2',
                  index <= current ? 'border-solid border-foreground' : 'border-dashed border-input',
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'relative grid size-6 place-items-center rounded-full border-2 bg-background',
                done && 'border-foreground bg-foreground text-background',
                active && 'border-foreground',
                !done && !active && 'border-input',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : active && <span className="size-2 rounded-full bg-foreground" />}
            </span>
            <span className={cn('text-xs', active ? 'font-semibold' : done ? 'text-foreground' : 'text-muted-foreground')}>
              {step}
              <span className="sr-only">{done ? ' (selesai)' : active ? ' (sekarang)' : ''}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** Loads the catalog entries behind order lines, for their pictures and colors. */
export function useOrderProducts(orders: OrderHistoryItem[] | null) {
  const [products, setProducts] = useState<Map<string, Product>>(new Map())
  const ids = orders ? [...new Set(orders.flatMap((order) => order.items.map((item) => item.productId)))].sort().join(',') : ''

  useEffect(() => {
    if (!ids) return
    let active = true
    getProductsByIds(ids.split(','))
      .then((found) => {
        if (active) setProducts(new Map(found.map((product) => [product.id, product])))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [ids])

  return products
}

/** The product picture in the color that was ordered, on the muted tile. */
export function OrderThumb({
  product,
  color,
  className,
}: {
  product: Product | undefined
  color: string
  className?: string
}) {
  const hex = product?.colors.find((item) => item.name === color)?.hex
  return (
    <span className={cn('relative block shrink-0 overflow-hidden rounded-xl bg-muted', className)}>
      {product && <ProductImage product={product} color={hex} sizes="64px" />}
    </span>
  )
}

const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' })

/** SQLite stores UTC without a zone, so mark it as UTC before formatting. */
export function orderDate(value: string) {
  return dateFormat.format(new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`))
}

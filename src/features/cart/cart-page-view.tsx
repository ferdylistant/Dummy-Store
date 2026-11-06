'use client'

import { ShoppingBag } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/button'
import { CartLineItem } from './cart-line-item'
import { OrderSummary } from './order-summary'
import { RemovedNotice } from './removed-notice'
import { useCartLines } from './use-cart-lines'

export function CartPageView() {
  const { lines, subtotal, isLoading } = useCartLines()

  if (isLoading) {
    return (
      <div role="status" aria-label="Memuat keranjang" className="grid gap-4">
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  return (
    <>
      <RemovedNotice className="mb-4" />
      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <ShoppingBag aria-hidden="true" className="size-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Keranjang masih kosong</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Produk yang Anda pilih akan muncul di sini.
          </p>
          <Link href="/produk" className={buttonClasses()}>
            Mulai Belanja
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          <ul className="relative divide-y divide-border rounded-xl border border-border bg-card px-4 md:px-6 lg:col-span-2 lg:self-start">
            <AnimatePresence initial={false} mode="popLayout">
              {lines.map((line) => (
                <CartLineItem key={line.key} line={line} />
              ))}
            </AnimatePresence>
          </ul>
          <aside
            aria-label="Ringkasan belanja"
            className="rounded-xl border border-border bg-card p-4 md:p-6 lg:sticky lg:top-24 lg:self-start"
          >
            <h2 className="mb-4 text-lg font-semibold">Ringkasan</h2>
            <OrderSummary subtotal={subtotal} />
            <Link
              href="/checkout"
              className={buttonClasses({ size: 'lg', className: 'mt-4 w-full' })}
            >
              Lanjut ke Checkout
            </Link>
          </aside>
        </div>
      )}
    </>
  )
}

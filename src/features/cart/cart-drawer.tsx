'use client'

import { ShoppingBag } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { useEffect } from 'react'
import { ButtonArrow, buttonClasses } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { formatRupiah } from '@/lib/format'
import { useStoreSettings } from '@/features/store/store-settings'
import { CartLineItem } from './cart-line-item'
import { CartLoadError } from './cart-load-error'
import { CartLinesSkeleton } from './cart-skeletons'
import { RemovedNotice } from './removed-notice'
import { useCart } from './store'
import { useCartLines } from './use-cart-lines'

export function CartDrawer() {
  const isOpen = useCart((state) => state.isOpen)
  const closeCart = useCart((state) => state.closeCart)
  const { lines, subtotal, count, isLoading, isError, retry } = useCartLines()
  const { freeShippingMin } = useStoreSettings()
  const remaining = freeShippingMin - subtotal

  useEffect(() => {
    useCart.persist.rehydrate()
  }, [])

  return (
    <Drawer
      open={isOpen}
      onClose={closeCart}
      title={count > 0 ? `Keranjang (${count})` : 'Keranjang'}
      footer={
        lines.length > 0 ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              {remaining > 0
                ? `Tambah ${formatRupiah(remaining)} lagi untuk gratis ongkir reguler.`
                : 'Pesanan ini mendapat gratis ongkir reguler.'}
            </p>
            <div className="mb-4 flex items-center justify-between font-semibold">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatRupiah(subtotal)}</span>
            </div>
            <div className="grid gap-2">
              <Link
                href="/checkout"
                onClick={closeCart}
                className={buttonClasses({ variant: 'action' })}
              >
                Lanjut ke Checkout
                <ButtonArrow />
              </Link>
              <Link
                href="/keranjang"
                onClick={closeCart}
                className={buttonClasses({ variant: 'outline' })}
              >
                Lihat Keranjang
              </Link>
            </div>
          </>
        ) : undefined
      }
    >
      <RemovedNotice className="m-4 mb-0" />
      {isLoading ? (
        <CartLinesSkeleton className="divide-y divide-border px-4" />
      ) : isError ? (
        <CartLoadError onRetry={retry} />
      ) : lines.length > 0 ? (
        <ul className="relative divide-y divide-border px-4">
          <AnimatePresence initial={false} mode="popLayout">
            {lines.map((line) => (
              <CartLineItem key={line.key} line={line} onNavigate={closeCart} />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <ShoppingBag aria-hidden="true" className="size-10 text-muted-foreground" />
          <p className="font-medium">Keranjang masih kosong</p>
          <Link
            href="/produk"
            onClick={closeCart}
            className={buttonClasses({ variant: 'outline' })}
          >
            Mulai Belanja
          </Link>
        </div>
      )}
    </Drawer>
  )
}

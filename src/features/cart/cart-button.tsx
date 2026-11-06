'use client'

import { ShoppingBag } from 'lucide-react'
import { m } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useCart, useCartCount } from './store'

export function CartButton() {
  const count = useCartCount()
  const openCart = useCart((state) => state.openCart)
  const addedTick = useCart((state) => state.addedTick)

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative -mr-2 lg:mr-0"
      aria-label={count > 0 ? `Buka keranjang, ${count} barang` : 'Buka keranjang, kosong'}
      onClick={openCart}
    >
      <ShoppingBag aria-hidden="true" className="size-6" />
      {count > 0 && (
        <m.span
          key={addedTick}
          aria-hidden="true"
          initial={addedTick > 0 ? { scale: 1.4 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="absolute top-0.5 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground tabular-nums"
        >
          {count}
        </m.span>
      )}
    </Button>
  )
}

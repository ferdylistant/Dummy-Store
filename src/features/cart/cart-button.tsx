'use client'

import { ShoppingBag } from 'lucide-react'
import { m, useAnimationControls, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useCart, useCartCount } from './store'

export function CartButton() {
  const count = useCartCount()
  const openCart = useCart((state) => state.openCart)
  const addedTick = useCart((state) => state.addedTick)
  const bump = useAnimationControls()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (addedTick > 0 && !reduced) {
      bump.start({ scale: [null, 1.35, 1], transition: { duration: 0.45, ease: 'easeOut' } })
    }
  }, [addedTick, reduced, bump])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative -mr-2 lg:mr-0"
      data-cart-target
      aria-label={count > 0 ? `Buka keranjang, ${count} barang` : 'Buka keranjang, kosong'}
      onClick={openCart}
    >
      <ShoppingBag aria-hidden="true" className="size-6" />
      {count > 0 && (
        <m.span
          aria-hidden="true"
          animate={bump}
          className="absolute top-0.5 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground tabular-nums"
        >
          {count}
        </m.span>
      )}
    </Button>
  )
}

'use client'

import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MAX_QUANTITY = 10

/** Stores references only. Prices always come from the catalog. */
export interface CartItem {
  productId: string
  color: string
  size: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  add: (item: CartItem) => void
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string) => void
  clear: () => void
  openCart: () => void
  closeCart: () => void
}

export function cartItemKey(item: Pick<CartItem, 'productId' | 'color' | 'size'>) {
  return `${item.productId}|${item.color}|${item.size}`
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      add: (item) =>
        set((state) => {
          const key = cartItemKey(item)
          const existing = state.items.find((current) => cartItemKey(current) === key)
          if (!existing) return { items: [...state.items, item] }
          return {
            items: state.items.map((current) =>
              cartItemKey(current) === key
                ? { ...current, quantity: Math.min(MAX_QUANTITY, current.quantity + item.quantity) }
                : current,
            ),
          }
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            cartItemKey(item) === key
              ? { ...item, quantity: Math.min(MAX_QUANTITY, Math.max(1, quantity)) }
              : item,
          ),
        })),
      remove: (key) =>
        set((state) => ({ items: state.items.filter((item) => cartItemKey(item) !== key) })),
      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'dummy-store-cart',
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
    },
  ),
)

function subscribeHydration(onChange: () => void) {
  return useCart.persist.onFinishHydration(onChange)
}

/** False on the server and first paint, so stored items never break hydration. */
export function useCartHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    () => useCart.persist.hasHydrated(),
    () => false,
  )
}

export function useCartCount() {
  const hydrated = useCartHydrated()
  const count = useCart((state) => state.items.reduce((sum, item) => sum + item.quantity, 0))
  return hydrated ? count : 0
}

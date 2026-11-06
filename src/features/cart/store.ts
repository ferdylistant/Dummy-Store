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

interface RemovedItem {
  item: CartItem
  index: number
  label: string
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  /** Counts adds, so the header badge can react to each one. */
  addedTick: number
  lastRemoved: RemovedItem | null
  add: (item: CartItem) => void
  setQuantity: (key: string, quantity: number) => void
  remove: (key: string, label: string) => void
  undoRemove: () => void
  dismissRemoved: () => void
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
      addedTick: 0,
      lastRemoved: null,
      add: (item) =>
        set((state) => {
          const key = cartItemKey(item)
          const existing = state.items.find((current) => cartItemKey(current) === key)
          const items = existing
            ? state.items.map((current) =>
                cartItemKey(current) === key
                  ? {
                      ...current,
                      quantity: Math.min(MAX_QUANTITY, current.quantity + item.quantity),
                    }
                  : current,
              )
            : [...state.items, item]
          return { items, addedTick: state.addedTick + 1, lastRemoved: null }
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            cartItemKey(item) === key
              ? { ...item, quantity: Math.min(MAX_QUANTITY, Math.max(1, quantity)) }
              : item,
          ),
        })),
      remove: (key, label) =>
        set((state) => {
          const index = state.items.findIndex((item) => cartItemKey(item) === key)
          if (index < 0) return state
          return {
            items: state.items.filter((_, position) => position !== index),
            lastRemoved: { item: state.items[index], index, label },
          }
        }),
      undoRemove: () =>
        set((state) => {
          if (!state.lastRemoved) return state
          const items = [...state.items]
          items.splice(state.lastRemoved.index, 0, state.lastRemoved.item)
          return { items, lastRemoved: null }
        }),
      dismissRemoved: () => set({ lastRemoved: null }),
      clear: () => set({ items: [], lastRemoved: null }),
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

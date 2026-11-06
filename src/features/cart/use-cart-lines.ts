'use client'

import { useEffect, useMemo, useState } from 'react'
import { getProductsByIds } from '@/services/products'
import type { Product } from '@/types/catalog'
import { cartItemKey, useCart, useCartHydrated, type CartItem } from './store'

export interface CartLine extends CartItem {
  key: string
  product: Product
  colorHex: string
  lineTotal: number
}

export function useCartLines() {
  const hydrated = useCartHydrated()
  const items = useCart((state) => state.items)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [loadedIds, setLoadedIds] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const ids = useMemo(() => [...new Set(items.map((item) => item.productId))].join(','), [items])

  useEffect(() => {
    let active = true
    getProductsByIds(ids ? ids.split(',') : [])
      .then((result) => {
        if (!active) return
        setProducts(result)
        setLoadedIds(ids)
        setIsError(false)
      })
      .catch(() => {
        if (active) setIsError(true)
      })
    return () => {
      active = false
    }
  }, [ids, attempt])

  const lines = useMemo(() => {
    const result: CartLine[] = []
    for (const item of items) {
      const product = products?.find((candidate) => candidate.id === item.productId)
      if (!product) continue
      result.push({
        ...item,
        key: cartItemKey(item),
        product,
        colorHex:
          product.colors.find((color) => color.name === item.color)?.hex ?? product.colors[0].hex,
        lineTotal: product.price * item.quantity,
      })
    }
    return result
  }, [items, products])

  // A new item has no product data until its request returns. Removing an item
  // needs no reload, so the list stays on screen.
  const waitingForNewItem =
    loadedIds !== ids &&
    items.some((item) => !products?.some((product) => product.id === item.productId))

  return {
    lines,
    subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    isLoading: !hydrated || ((products === null || waitingForNewItem) && !isError),
    isError,
    retry: () => setAttempt((value) => value + 1),
  }
}

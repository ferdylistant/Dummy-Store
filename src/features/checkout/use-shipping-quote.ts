'use client'

import { useEffect, useState } from 'react'
import { getShippingQuote, type ShippingQuote } from '@/services/shipping'

const VILLAGE = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/

/**
 * Asks the API for shipping choices whenever the village or the cart
 * changes. The answer is kept per request key, so an old answer never
 * shows for a new address.
 */
export function useShippingQuote(regionCode: string | undefined, items: { productId: string; quantity: number }[]) {
  const parcel = new Map<string, number>()
  for (const item of items) parcel.set(item.productId, (parcel.get(item.productId) ?? 0) + item.quantity)
  const lines = [...parcel].sort(([a], [b]) => a.localeCompare(b)).map(([productId, quantity]) => ({ productId, quantity }))
  const key = regionCode && VILLAGE.test(regionCode) && lines.length ? JSON.stringify([regionCode, lines]) : null

  const [state, setState] = useState<{ key: string | null; quote: ShippingQuote | null; failed: boolean }>({
    key: null,
    quote: null,
    failed: false,
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!key) return
    const [code, body] = JSON.parse(key) as [string, { productId: string; quantity: number }[]]
    let active = true
    getShippingQuote(code, body)
      .then((quote) => active && setState({ key, quote, failed: false }))
      .catch(() => active && setState({ key, quote: null, failed: true }))
    return () => {
      active = false
    }
  }, [key, attempt])

  const ready = key !== null && state.key === key
  return {
    quote: ready ? state.quote : null,
    loading: key !== null && !ready,
    failed: ready && state.failed,
    /** Asks again, for a retry button or after the server says prices moved. */
    refresh: () => {
      setState((current) => ({ ...current, key: null }))
      setAttempt((value) => value + 1)
    },
  }
}

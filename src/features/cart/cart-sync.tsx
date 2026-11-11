'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { ApiError } from '@/services/api'
import { getSavedCart, mergeGuestCart, saveCart, saveCartOnLeave, type SavedCart } from '@/services/cart'
import { cartItemKey, MAX_QUANTITY, useCart, useCartHydrated, type CartItem } from './store'

/** Quick changes, like tapping + three times, go out as one save. */
const SAVE_DELAY_MS = 500

let timer: ReturnType<typeof setTimeout> | undefined
/** The account whose cart is in step with the API. Changes are saved only then. */
let syncedFor: string | null = null
/** True while the API's cart is put in place, so it is not sent straight back. */
let applying = false

/**
 * Adds made here while a request was out are kept on top of what it returned,
 * so a tap during sign in or a refresh is never lost.
 */
function withLocalAdds(saved: CartItem[], base: CartItem[], now: CartItem[]) {
  if (now === base) return { items: saved, changed: false }
  const before = new Map(base.map((item) => [cartItemKey(item), item.quantity]))
  const items = saved.map((item) => ({ ...item }))
  let changed = false
  for (const item of now) {
    const extra = item.quantity - (before.get(cartItemKey(item)) ?? 0)
    if (extra <= 0) continue
    changed = true
    const existing = items.find((line) => cartItemKey(line) === cartItemKey(item))
    if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + extra)
    else items.push({ ...item, quantity: Math.min(MAX_QUANTITY, extra) })
  }
  return { items, changed }
}

function apply(saved: SavedCart, base: CartItem[], owner: string) {
  const { items, changed } = withLocalAdds(saved.items, base, useCart.getState().items)
  applying = true
  useCart.getState().applySaved(items, owner, changed)
  applying = false
  syncedFor = owner
  if (changed) schedule()
}

async function save() {
  timer = undefined
  const { items, owner } = useCart.getState()
  if (!owner || owner !== syncedFor) return
  try {
    await saveCart(items)
    if (useCart.getState().items === items) useCart.setState({ dirty: false })
  } catch (error) {
    // The session ended on the server. Asking again lets the store notice and sign out here too.
    if (error instanceof ApiError && error.status === 401) authClient.$store.notify('$sessionSignal')
  }
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(save, SAVE_DELAY_MS)
}

/** Saves a waiting change now. Signing out calls this first. */
export async function flushCart() {
  if (!timer) return
  clearTimeout(timer)
  await save()
}

/**
 * Keeps a signed in shopper's cart in the account, like the big marketplaces:
 * the guest cart joins it on sign in, every change is saved, other devices see
 * it, and signing out leaves this browser with an empty cart.
 */
export function CartSync() {
  const hydrated = useCartHydrated()
  const { data: session, isPending, error } = authClient.useSession()
  const userId = session?.user.id ?? null
  const [attempt, setAttempt] = useState(0)

  // Every local change to an account's cart is marked and saved.
  useEffect(() => {
    if (!hydrated) return
    return useCart.subscribe((state, previous) => {
      if (applying || state.items === previous.items || !state.owner) return
      if (!state.dirty) useCart.setState({ dirty: true })
      if (state.owner === syncedFor) schedule()
    })
  }, [hydrated])

  useEffect(() => {
    // A failed session check says nothing about who is signed in, so nothing changes.
    if (!hydrated || isPending || error) return
    syncedFor = null
    if (!userId) {
      clearTimeout(timer)
      timer = undefined
      if (useCart.getState().owner) useCart.getState().forgetAccount()
      return
    }
    // A cart someone else left in this browser is theirs, not this shopper's.
    const left = useCart.getState().owner
    if (left !== null && left !== userId) useCart.getState().forgetAccount()

    let active = true
    const { owner, items, dirty } = useCart.getState()
    const request = owner === userId ? (dirty ? saveCart(items) : getSavedCart()) : mergeGuestCart(items)
    request
      .then((saved) => {
        if (active) apply(saved, items, userId)
      })
      // Offline or the API is busy: the cart stays as it is here and syncs on the next visit or focus.
      .catch(() => {})
    return () => {
      active = false
    }
  }, [hydrated, isPending, error, userId, attempt])

  // Coming back to the tab picks up changes from other devices. Leaving saves what is waiting.
  useEffect(() => {
    const leave = () => {
      if (!timer) return
      clearTimeout(timer)
      timer = undefined
      const { items, owner } = useCart.getState()
      if (owner && owner === syncedFor) {
        saveCartOnLeave(items)
        useCart.setState({ dirty: false })
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leave()
      else if (!timer) setAttempt((value) => value + 1)
    }
    const onOnline = () => setAttempt((value) => value + 1)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', leave)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return null
}

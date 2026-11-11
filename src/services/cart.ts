import type { CartItem } from '@/features/cart/store'
import { apiGet, apiSend, BROWSER_API_URL } from './api'

export interface SavedCart {
  items: CartItem[]
  updatedAt: string | null
}

export const getSavedCart = () => apiGet<SavedCart>('/me/cart')
export const saveCart = (items: CartItem[]) => apiSend<SavedCart>('PUT', '/me/cart', { items })
export const mergeGuestCart = (items: CartItem[]) => apiSend<SavedCart>('POST', '/me/cart/merge', { items })

/** Saves while the page closes. The browser finishes it after the tab is gone. */
export function saveCartOnLeave(items: CartItem[]) {
  void fetch(`${BROWSER_API_URL}/me/cart`, {
    method: 'PUT',
    credentials: 'include',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  }).catch(() => {})
}

'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/**
 * True when the visitor asks for less motion. Unlike useReducedMotion from
 * Motion, it reads false on the server and during hydration, then updates, so
 * props that depend on it never make the server HTML disagree with the page.
 */
export function useCalmMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

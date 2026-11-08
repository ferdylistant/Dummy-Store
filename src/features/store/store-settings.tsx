'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiGet } from '@/services/api'
import { DEFAULT_STORE, type StoreSettings } from '@/services/store'

const StoreSettingsContext = createContext<StoreSettings>(DEFAULT_STORE)

/**
 * Hands the store settings to client components. The layout's copy can be
 * from a cached page, so the browser asks again once: the cart and checkout
 * must show the same shipping rules the API will charge.
 */
export function StoreSettingsProvider({ settings, children }: { settings: StoreSettings; children: ReactNode }) {
  const [current, setCurrent] = useState(settings)

  useEffect(() => {
    let active = true
    apiGet<StoreSettings>('/settings')
      .then((fresh) => {
        if (active) setCurrent(fresh)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return <StoreSettingsContext.Provider value={current}>{children}</StoreSettingsContext.Provider>
}

export const useStoreSettings = () => useContext(StoreSettingsContext)

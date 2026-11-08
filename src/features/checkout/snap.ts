'use client'

interface SnapCallbacks {
  onSuccess: () => void
  onPending: () => void
  onError: () => void
  onClose: () => void
}

declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks: SnapCallbacks) => void }
  }
}

export type SnapOutcome = 'success' | 'pending' | 'error' | 'close'

let loading: Promise<void> | null = null

/** Loads Midtrans Snap once, only when a shopper is about to pay. */
export function loadSnap(scriptUrl: string, clientKey: string) {
  if (window.snap) return Promise.resolve()
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.dataset.clientKey = clientKey
    script.onload = () => resolve()
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('Snap gagal dimuat'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/** Opens the Snap popup and resolves with how the shopper left it. */
export function openSnap(token: string) {
  return new Promise<SnapOutcome>((resolve) => {
    window.snap?.pay(token, {
      onSuccess: () => resolve('success'),
      onPending: () => resolve('pending'),
      onError: () => resolve('error'),
      onClose: () => resolve('close'),
    })
  })
}

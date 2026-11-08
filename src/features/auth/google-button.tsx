'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { getStoreConfig } from '@/services/account'

/** Shown only when the API has Google sign in configured. */
export function GoogleButton({ next }: { next: string }) {
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getStoreConfig()
      .then((config) => setEnabled(config.google))
      .catch(() => setEnabled(false))
  }, [])

  if (!enabled) return null

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await authClient.signIn.social({
            provider: 'google',
            callbackURL: `${window.location.origin}${next}`,
            errorCallbackURL: `${window.location.origin}/masuk`,
          })
          setBusy(false)
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
        </svg>
        Lanjutkan dengan Google
      </Button>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        atau dengan email
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  )
}

'use client'

import { Loader2, RotateCw } from 'lucide-react'
import { useEffect, useRef, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

/**
 * Shown when a page fails to load, most often while the API is just
 * starting. retry() fetches the page again, unlike reset(), so the button
 * really reloads it. It tries once on its own first, since a waking server
 * usually answers a moment later.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const [pending, startTransition] = useTransition()
  const triedAlone = useRef(false)

  useEffect(() => {
    console.error(error)
  }, [error])

  useEffect(() => {
    if (triedAlone.current) return
    triedAlone.current = true
    const timer = window.setTimeout(() => startTransition(() => retry()), 2000)
    return () => window.clearTimeout(timer)
  }, [retry])

  return (
    <Container className="flex flex-col items-center py-16 text-center lg:py-24">
      <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">Terjadi kendala</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground" aria-live="polite">
        {pending ? 'Sedang memuat ulang halaman ini...' : 'Halaman ini gagal dimuat. Server mungkin baru menyala, coba lagi sebentar.'}
      </p>
      <Button className="mt-6 min-w-44" disabled={pending} aria-busy={pending} onClick={() => startTransition(() => retry())}>
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            Memuat ulang...
          </>
        ) : (
          <>
            <RotateCw aria-hidden="true" className="size-4" />
            Coba Lagi
          </>
        )}
      </Button>
    </Container>
  )
}

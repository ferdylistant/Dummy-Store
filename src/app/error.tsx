'use client'

import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container className="flex flex-col items-center py-16 text-center lg:py-24">
      <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">Terjadi kendala</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">
        Halaman ini gagal dimuat. Coba lagi beberapa saat.
      </p>
      <Button className="mt-6" onClick={reset}>
        Coba Lagi
      </Button>
    </Container>
  )
}

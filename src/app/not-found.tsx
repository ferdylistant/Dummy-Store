import type { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { HangTagLink } from '@/components/ui/hang-tag-link'

export const metadata: Metadata = {
  title: 'Halaman Tidak Ditemukan',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-16 text-center lg:py-24">
      <p className="text-sm font-semibold text-link">404</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight lg:text-5xl">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">
        Halaman ini mungkin sudah dipindahkan. Coba mulai lagi dari katalog produk.
      </p>
      <div className="mt-10">
        <HangTagLink href="/produk">Lihat Produk</HangTagLink>
      </div>
    </Container>
  )
}

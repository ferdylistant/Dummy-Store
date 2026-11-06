import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

export const metadata: Metadata = {
  title: 'Halaman Tidak Ditemukan',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <Container className="flex flex-col items-center py-16 text-center lg:py-24">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">
        Halaman ini mungkin sudah dipindahkan. Coba mulai lagi dari katalog produk.
      </p>
      <Link href="/produk" className={buttonClasses({ className: 'mt-6' })}>
        Lihat Produk
      </Link>
    </Container>
  )
}

import { Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { InfoPage } from '@/components/layout/info-page'
import { siteConfig } from '@/lib/site'

const DESCRIPTION = `Hubungi ${siteConfig.name} untuk pertanyaan tentang produk, pesanan, atau retur.`

export const metadata: Metadata = {
  title: 'Kontak',
  description: DESCRIPTION,
  alternates: { canonical: '/kontak' },
  openGraph: { title: 'Kontak', description: DESCRIPTION, url: '/kontak' },
}

export default function ContactPage() {
  return (
    <InfoPage title="Kontak" path="/kontak" intro={DESCRIPTION}>
      <section>
        <h2>Email</h2>
        <a
          href={`mailto:${siteConfig.email}`}
          className="inline-flex min-h-11 items-center gap-2 font-medium text-link underline-offset-4 hover:underline"
        >
          <Mail aria-hidden="true" className="size-5" />
          {siteConfig.email}
        </a>
      </section>
      <section>
        <h2>Cari jawaban lebih cepat</h2>
        <p>
          Informasi ukuran, pengiriman, dan retur tersedia di{' '}
          <Link href="/bantuan" className="font-medium text-link underline underline-offset-4">
            Pusat Bantuan
          </Link>
          .
        </p>
      </section>
    </InfoPage>
  )
}

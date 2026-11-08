import { Mail } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { InfoPage } from '@/components/layout/info-page'
import { siteConfig } from '@/lib/site'
import { getStoreSettings } from '@/services/store'
import { SHARE_IMAGE } from '@/lib/seo'

const DESCRIPTION = `Hubungi ${siteConfig.name} untuk pertanyaan tentang produk, pesanan, atau retur.`

export const metadata: Metadata = {
  title: 'Kontak',
  description: DESCRIPTION,
  alternates: { canonical: '/kontak' },
  openGraph: { title: 'Kontak', description: DESCRIPTION, url: '/kontak', images: [SHARE_IMAGE] },
}

export default async function ContactPage() {
  const store = await getStoreSettings()
  return (
    <InfoPage title="Kontak" path="/kontak" intro={DESCRIPTION}>
      <section>
        <h2>Email</h2>
        <a
          href={`mailto:${store.email}`}
          className="inline-flex min-h-11 items-center gap-2 font-medium"
        >
          <Mail aria-hidden="true" className="size-5" />
          <span className="link-stitch">{store.email}</span>
        </a>
      </section>
      <section>
        <h2>Cari jawaban lebih cepat</h2>
        <p>
          Informasi ukuran, pengiriman, dan retur tersedia di{' '}
          <Link href="/bantuan" className="link-stitch font-medium text-foreground">
            Pusat Bantuan
          </Link>
          .
        </p>
      </section>
    </InfoPage>
  )
}

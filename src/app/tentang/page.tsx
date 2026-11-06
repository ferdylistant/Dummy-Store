import type { Metadata } from 'next'
import { InfoPage } from '@/components/layout/info-page'
import { siteConfig } from '@/lib/site'
import { SHARE_IMAGE } from '@/lib/seo'

const DESCRIPTION = `${siteConfig.name} menjual baju, celana, bandana, dan merchandise untuk dipakai setiap hari.`

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description: DESCRIPTION,
  alternates: { canonical: '/tentang' },
  openGraph: { title: 'Tentang Kami', description: DESCRIPTION, url: '/tentang', images: [SHARE_IMAGE] },
}

export default function AboutPage() {
  return (
    <InfoPage title="Tentang Kami" path="/tentang" intro={DESCRIPTION}>
      <section>
        <h2>Yang kami kerjakan</h2>
        <p>
          Kami memilih pakaian dan aksesori dengan potongan sederhana, bahan yang nyaman, dan warna
          yang mudah dipadukan.
        </p>
      </section>
      <section>
        <h2>Cara kami berbelanja</h2>
        <p>
          Harga, ukuran, dan stok ditampilkan dengan jelas, supaya Anda bisa memilih dengan tenang
          dan menukar produk jika ukurannya tidak pas.
        </p>
      </section>
    </InfoPage>
  )
}

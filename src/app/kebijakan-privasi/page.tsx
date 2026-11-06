import type { Metadata } from 'next'
import { InfoPage } from '@/components/layout/info-page'
import { siteConfig } from '@/lib/site'
import { SHARE_IMAGE } from '@/lib/seo'

const DESCRIPTION = 'Cara kami mengumpulkan, memakai, dan melindungi data pribadi Anda.'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description: DESCRIPTION,
  alternates: { canonical: '/kebijakan-privasi' },
  openGraph: { title: 'Kebijakan Privasi', description: DESCRIPTION, url: '/kebijakan-privasi', images: [SHARE_IMAGE] },
}

export default function PrivacyPage() {
  return (
    <InfoPage title="Kebijakan Privasi" path="/kebijakan-privasi" intro={DESCRIPTION}>
      <section>
        <h2>Data yang kami kumpulkan</h2>
        <p>
          Kami mengumpulkan nama, email, nomor ponsel, dan alamat yang Anda berikan saat membuat
          pesanan.
        </p>
      </section>
      <section>
        <h2>Cara kami memakai data</h2>
        <p>Data dipakai untuk memproses pesanan, mengirim barang, dan menjawab pertanyaan Anda.</p>
      </section>
      <section>
        <h2>Keranjang belanja</h2>
        <p>Isi keranjang disimpan di browser Anda supaya tidak hilang saat halaman dibuka lagi.</p>
      </section>
      <section>
        <h2>Hubungi kami</h2>
        <p>Pertanyaan tentang data pribadi bisa dikirim ke {siteConfig.email}.</p>
      </section>
    </InfoPage>
  )
}

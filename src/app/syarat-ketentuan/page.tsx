import type { Metadata } from 'next'
import { InfoPage } from '@/components/layout/info-page'
import { getStoreSettings } from '@/services/store'
import { siteConfig } from '@/lib/site'
import { SHARE_IMAGE } from '@/lib/seo'

const DESCRIPTION = `Ketentuan yang berlaku saat berbelanja di ${siteConfig.name}.`

export const metadata: Metadata = {
  title: 'Syarat dan Ketentuan',
  description: DESCRIPTION,
  alternates: { canonical: '/syarat-ketentuan' },
  openGraph: { title: 'Syarat dan Ketentuan', description: DESCRIPTION, url: '/syarat-ketentuan', images: [SHARE_IMAGE] },
}

export default async function TermsPage() {
  const store = await getStoreSettings()
  return (
    <InfoPage title="Syarat dan Ketentuan" path="/syarat-ketentuan" intro={DESCRIPTION}>
      <section>
        <h2>Pesanan dan harga</h2>
        <p>
          Harga ditulis dalam Rupiah. Pesanan diproses setelah pembayaran dikonfirmasi, kecuali
          untuk metode bayar di tempat.
        </p>
      </section>
      <section>
        <h2>Pengiriman</h2>
        <p>Estimasi pengiriman bisa berubah tergantung lokasi tujuan dan kondisi kurir.</p>
      </section>
      <section>
        <h2>Retur</h2>
        <p>
          Retur berlaku {store.returnDays} hari setelah barang diterima, selama produk belum dipakai dan
          label masih terpasang.
        </p>
      </section>
    </InfoPage>
  )
}

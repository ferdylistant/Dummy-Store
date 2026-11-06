import type { Metadata } from 'next'
import { InfoPage } from '@/components/layout/info-page'
import { RETURN_DAYS } from '@/lib/pricing'
import { siteConfig } from '@/lib/site'

const DESCRIPTION = `Ketentuan yang berlaku saat berbelanja di ${siteConfig.name}.`

export const metadata: Metadata = {
  title: 'Syarat dan Ketentuan',
  description: DESCRIPTION,
  alternates: { canonical: '/syarat-ketentuan' },
  openGraph: { title: 'Syarat dan Ketentuan', description: DESCRIPTION, url: '/syarat-ketentuan' },
}

export default function TermsPage() {
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
          Retur berlaku {RETURN_DAYS} hari setelah barang diterima, selama produk belum dipakai dan
          label masih terpasang.
        </p>
      </section>
    </InfoPage>
  )
}

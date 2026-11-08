import type { Metadata } from 'next'
import { InfoPage } from '@/components/layout/info-page'
import { JsonLd } from '@/components/seo/json-ld'
import { faqItems, pantsChart, sizeChart } from '@/content/help'
import { formatRupiah } from '@/lib/format'
import { SHIPPING_OPTIONS } from '@/lib/pricing'
import { getStoreSettings } from '@/services/store'
import { faqJsonLd, SHARE_IMAGE } from '@/lib/seo'

const DESCRIPTION = 'Panduan ukuran, informasi pengiriman, retur, dan jawaban pertanyaan umum.'

export const metadata: Metadata = {
  title: 'Pusat Bantuan',
  description: DESCRIPTION,
  alternates: { canonical: '/bantuan' },
  openGraph: { title: 'Pusat Bantuan', description: DESCRIPTION, url: '/bantuan', images: [SHARE_IMAGE] },
}

const TABLE = 'w-full border-collapse text-left text-sm [&_td]:border-t [&_td]:border-border [&_td]:py-2 [&_td]:pr-4 [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold'

export default async function HelpPage() {
  const store = await getStoreSettings()
  return (
    <InfoPage title="Pusat Bantuan" path="/bantuan" intro={DESCRIPTION}>
      <JsonLd data={faqJsonLd(faqItems(store))} />

      <section id="ukuran">
        <h2>Panduan ukuran</h2>
        <p>Ukuran dalam sentimeter. Ukur pakaian favorit Anda, lalu bandingkan dengan tabel ini.</p>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <table className={TABLE}>
            <caption className="mb-2 text-left font-medium">Baju</caption>
            <thead>
              <tr>
                <th scope="col">Ukuran</th>
                <th scope="col">Lebar dada</th>
                <th scope="col">Panjang</th>
              </tr>
            </thead>
            <tbody>
              {sizeChart.map((row) => (
                <tr key={row.size}>
                  <td>{row.size}</td>
                  <td>{row.chest}</td>
                  <td>{row.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className={`${TABLE} self-start`}>
            <caption className="mb-2 text-left font-medium">Celana</caption>
            <thead>
              <tr>
                <th scope="col">Ukuran</th>
                <th scope="col">Lingkar pinggang</th>
              </tr>
            </thead>
            <tbody>
              {pantsChart.map((row) => (
                <tr key={row.size}>
                  <td>{row.size}</td>
                  <td>{row.waist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="pengiriman">
        <h2>Pengiriman</h2>
        <p>
          Pengiriman reguler membutuhkan {SHIPPING_OPTIONS.reguler.eta} dengan biaya{' '}
          {formatRupiah(store.flatRates.reguler)}, dan gratis untuk belanja mulai{' '}
          {formatRupiah(store.freeShippingMin)}. Pengiriman ekspres membutuhkan{' '}
          {SHIPPING_OPTIONS.ekspres.eta} dengan biaya {formatRupiah(store.flatRates.ekspres)}.
        </p>
      </section>

      <section id="retur">
        <h2>Retur dan penukaran</h2>
        <p>
          Produk bisa ditukar atau dikembalikan dalam {store.returnDays} hari setelah diterima, selama
          belum dipakai dan label masih terpasang.
        </p>
      </section>

      <section id="faq">
        <h2>Pertanyaan umum</h2>
        <div className="mt-4 space-y-4">
          {faqItems(store).map((item) => (
            <div key={item.question}>
              <h3 className="font-medium">{item.question}</h3>
              <p className="mt-1 text-sm">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </InfoPage>
  )
}

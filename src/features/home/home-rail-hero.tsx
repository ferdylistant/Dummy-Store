'use client'

import Link from 'next/link'
import { buttonClasses } from '@/components/ui/button'
import ClothingRailHero from '@/components/ui/product-rail-gallery'
import type { RailGarment } from '@/components/ui/product-rail-gallery'

const LABELS = { front: 'Depan', back: 'Belakang', close: 'Tutup', show: 'Tampilkan' }

export function HomeRailHero({ items }: { items: RailGarment[] }) {
  return (
    <ClothingRailHero
      items={items}
      hanger="wood"
      headingLevel="h1"
      eyebrow="Koleksi terbaru"
      heading="Pilih langsung dari gantungan."
      caption="Geser gantungan, lalu ketuk produk untuk melihat bagian belakangnya."
      labels={LABELS}
      action={
        <Link href="/produk" className={buttonClasses()}>
          Lihat Koleksi
        </Link>
      }
      detailAction={(item) => (
        <Link href={`/produk/${item.id}`} className={buttonClasses({ className: 'mt-2' })}>
          Lihat Produk
        </Link>
      )}
    />
  )
}

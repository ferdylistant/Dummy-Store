'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { ButtonArrow, buttonClasses } from '@/components/ui/button'
import { HangTagLink } from '@/components/ui/hang-tag-link'
import ClothingRailHero from '@/components/ui/product-rail-gallery'
import type { RailGarment } from '@/components/ui/product-rail-gallery'

const LABELS = { front: 'Depan', back: 'Belakang', close: 'Tutup', show: 'Tampilkan' }

export function HomeRailHero({ items, featured }: { items: RailGarment[]; featured: number }) {
  return (
    <ClothingRailHero
      items={items}
      hanger="wood"
      headingLevel="h1"
      defaultActive={featured}
      heading="Pilih langsung dari gantungan."
      caption="Geser gantungan, lalu ketuk produk untuk melihat bagian belakangnya."
      labels={LABELS}
      action={
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <HangTagLink href="/produk">Lihat Koleksi</HangTagLink>
          <Link
            href="/bantuan#ukuran"
            className="inline-flex min-h-11 items-center gap-0.5 text-link underline-offset-4 hover:underline"
          >
            Panduan ukuran
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      }
      detailAction={(item) => (
        <Link
          href={`/produk/${item.id}`}
          className={buttonClasses({ variant: 'action', className: 'mt-2' })}
        >
          Lihat Produk
          <ButtonArrow />
        </Link>
      )}
    />
  )
}

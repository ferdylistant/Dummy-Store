import { ChevronDown, ChevronRight, CreditCard, RotateCcw, Ruler, Truck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { JsonLd } from '@/components/seo/json-ld'
import { buttonClasses } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { faqItems } from '@/content/help'
import { HomeRailHero } from '@/features/home/home-rail-hero'
import { SectionHeading } from '@/features/home/section-heading'
import { ProductArt } from '@/features/products/product-art'
import { ProductCard } from '@/features/products/product-card'
import { formatRupiah, formatRupiahShort } from '@/lib/format'
import { FREE_SHIPPING_MIN, RETURN_DAYS } from '@/lib/pricing'
import { websiteJsonLd } from '@/lib/seo'
import { cn } from '@/lib/utils'
import {
  getCategories,
  getFeaturedProducts,
  getNewProducts,
  getRailProducts,
} from '@/services/products'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
}

const BENEFITS = [
  {
    icon: Truck,
    title: 'Gratis ongkir',
    text: `Pengiriman reguler gratis mulai ${formatRupiah(FREE_SHIPPING_MIN)}.`,
  },
  {
    icon: RotateCcw,
    title: `Retur ${RETURN_DAYS} hari`,
    text: 'Tukar atau kembalikan jika ukurannya tidak pas.',
  },
  {
    icon: Ruler,
    title: 'Panduan ukuran',
    text: 'Cek ukuran dada, panjang, dan pinggang sebelum membeli.',
  },
  {
    icon: CreditCard,
    title: 'Pembayaran mudah',
    text: 'Transfer bank, dompet digital, dan bayar di tempat.',
  },
]

const SECTION = 'py-16 lg:py-28'

const TILE_LAYOUT = [
  'col-span-2 md:row-span-2',
  'col-span-2',
  'col-span-1',
  'col-span-1',
]

export default async function HomePage() {
  // Renders per request, because the catalog lives in the API and not in the build.
  await connection()

  const [categories, featured, newest, railProducts] = await Promise.all([
    getCategories(),
    getFeaturedProducts(8),
    getNewProducts(4),
    getRailProducts(8),
  ])

  const railItems = railProducts.map((product) => ({
    id: product.slug,
    name: product.name,
    description: product.description,
    kind: product.railKind,
    color: product.colors[0].hex,
    tag: formatRupiahShort(product.price),
    details: product.details.slice(0, 3),
  }))
  const heroPiece = Math.max(
    0,
    railProducts.findIndex((product) => product.railKind === 'hoodie'),
  )

  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <HomeRailHero items={railItems} featured={heroPiece} />

      <section aria-labelledby="kategori" className={SECTION}>
        <Container>
          <SectionHeading id="kategori" title="Belanja per kategori." />
          <ul className="grid grid-cols-2 gap-3 md:auto-rows-[18rem] md:grid-cols-4 md:gap-4">
            {categories.map((category, index) => (
              <li key={category.slug} className={TILE_LAYOUT[index]}>
                <Link
                  href={`/kategori/${category.slug}`}
                  className="group flex h-full min-h-60 flex-col overflow-hidden rounded-3xl bg-muted p-6 lg:p-8"
                >
                  <h3 className="text-lg font-semibold tracking-tight lg:text-2xl">
                    {category.name}
                  </h3>
                  <p
                    className={cn(
                      'mt-1 text-sm text-muted-foreground',
                      index > 1 && 'hidden lg:block',
                    )}
                  >
                    {category.description}
                  </p>
                  <div className="relative mt-4 min-h-28 flex-1">
                    <ProductArt
                      kind={category.art}
                      color={category.artColor}
                      className="absolute inset-0 size-full transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="unggulan" className="pb-16 lg:pb-28">
        <Container>
          <SectionHeading
            id="unggulan"
            title="Produk unggulan."
            href="/produk"
            linkLabel="Lihat semua"
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
            {featured.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="baru" className="pb-16 lg:pb-28">
        <Container>
          <SectionHeading
            id="baru"
            title="Baru datang."
            href="/produk?urut=terbaru"
            linkLabel="Lihat produk baru"
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
            {newest.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-label="Keunggulan toko" className="bg-muted py-12 lg:py-16">
        <Container>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title}>
                <benefit.icon aria-hidden="true" className="size-6" />
                <h3 className="mt-3 font-semibold">{benefit.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{benefit.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="tanya" className={SECTION}>
        <Container className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div>
            <h2 id="tanya" className="text-3xl font-semibold tracking-tight lg:text-5xl">
              Ada pertanyaan?
            </h2>
            <Link
              href="/bantuan"
              className={buttonClasses({ variant: 'outline', className: 'mt-6' })}
            >
              Pusat Bantuan
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {faqItems.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="flex min-h-7 items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}

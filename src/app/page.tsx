import { ChevronDown, CreditCard, RotateCcw, Ruler, Truck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
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

export default async function HomePage() {
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

  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <HomeRailHero items={railItems} />

      <section aria-labelledby="kategori" className="py-12 md:py-16 lg:py-24">
        <Container>
          <h2 id="kategori" className="mb-8 text-2xl font-semibold tracking-tight lg:text-3xl">
            Belanja per kategori
          </h2>
          <ul className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/kategori/${category.slug}`}
                  className="group block h-full overflow-hidden rounded-xl border border-border bg-card transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="aspect-square bg-muted p-[14%]">
                    <ProductArt
                      kind={category.art}
                      color={category.artColor}
                      className="size-full transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-3 md:p-4">
                    <h3 className="font-semibold lg:text-lg">{category.name}</h3>
                    <p className="mt-1 hidden text-sm text-muted-foreground md:block">
                      {category.description}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-label="Produk unggulan" className="bg-card py-12 md:py-16 lg:py-24">
        <Container>
          <SectionHeading title="Produk unggulan" href="/produk" linkLabel="Lihat semua" />
          <ul className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
            {featured.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-label="Keunggulan toko" className="py-12 md:py-16">
        <Container>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="flex gap-3">
                <benefit.icon aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {benefit.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-label="Produk terbaru" className="bg-card py-12 md:py-16 lg:py-24">
        <Container>
          <SectionHeading
            title="Baru datang"
            href="/produk?urut=terbaru"
            linkLabel="Lihat produk baru"
          />
          <ul className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
            {newest.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="tanya" className="py-12 md:py-16 lg:py-24">
        <Container className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div>
            <h2 id="tanya" className="text-2xl font-semibold tracking-tight lg:text-3xl">
              Pertanyaan umum
            </h2>
            <p className="mt-2 text-muted-foreground">
              Belum menemukan jawabannya? Kunjungi pusat bantuan kami.
            </p>
            <Link
              href="/bantuan"
              className={buttonClasses({ variant: 'outline', className: 'mt-4' })}
            >
              Pusat Bantuan
            </Link>
          </div>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {faqItems.map((item) => (
              <details key={item.question} className="group p-4">
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

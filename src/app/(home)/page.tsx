import { CreditCard, RotateCcw, Ruler, Truck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { JsonLd } from '@/components/seo/json-ld'
import { Container } from '@/components/ui/container'
import { HomeFaq } from '@/features/home/home-faq'
import { HomeRailHero } from '@/features/home/home-rail-hero'
import { SectionHeading } from '@/features/home/section-heading'
import { ProductArt } from '@/features/products/product-art'
import { ProductCard } from '@/features/products/product-card'
import { formatRupiah, formatRupiahShort } from '@/lib/format'
import { mediaSrc } from '@/lib/media'
import { SHARE_IMAGE, websiteJsonLd } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { ProductImage } from '@/features/products/product-image'
import { getHome, getStoreSettings, type StoreSettings } from '@/services/store'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/', images: [SHARE_IMAGE] },
}

const benefits = (store: StoreSettings) => [
  {
    icon: Truck,
    title: 'Gratis ongkir',
    text: `Pengiriman reguler gratis mulai ${formatRupiah(store.freeShippingMin)}.`,
  },
  {
    icon: RotateCcw,
    title: `Retur ${store.returnDays} hari`,
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

  // Every list on this page is arranged in the dashboard.
  const [home, store] = await Promise.all([getHome(), getStoreSettings()])
  const { categories, featured, newArrivals: newest, sale, rail: railProducts } = home

  const railItems = railProducts.map((product) => ({
    id: product.slug,
    name: product.name,
    description: product.description,
    kind: product.railKind ?? 'tee',
    color: product.colors[0].hex,
    image: product.railImage ? mediaSrc(product.railImage) : undefined,
    backImage: product.railBackImage ? mediaSrc(product.railBackImage) : undefined,
    sideImage: product.railSideImage ? mediaSrc(product.railSideImage) : undefined,
    // Photos taken on a real hanger hang by their own hook, like the 21st demo.
    hanger: product.railHasHanger ? ('none' as const) : undefined,
    tag: formatRupiahShort(product.price),
    details: product.details.slice(0, 3),
  }))
  const heroPiece = Math.max(
    0,
    railProducts.findIndex((product) =>
      home.railFeatured ? product.id === home.railFeatured : product.railKind === 'hoodie',
    ),
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
                    {category.cover ? (
                      // The product chosen for this tile in the dashboard.
                      <ProductImage
                        product={category.cover}
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <ProductArt
                        kind={category.art}
                        color={category.artColor}
                        className="absolute inset-0 size-full transition-transform duration-200 group-hover:scale-[1.03]"
                      />
                    )}
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

      {sale.length > 0 && (
        <section aria-labelledby="diskon" className="pb-16 lg:pb-28">
          <Container>
            <SectionHeading id="diskon" title="Sedang diskon." href="/produk" linkLabel="Lihat semua" />
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
              {sale.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section aria-label="Keunggulan toko" className="bg-muted py-12 lg:py-16">
        <Container>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits(store).map((benefit) => (
              <li key={benefit.title}>
                <benefit.icon aria-hidden="true" className="size-6" />
                <h3 className="mt-3 font-semibold">{benefit.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{benefit.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <HomeFaq store={store} />
    </>
  )
}

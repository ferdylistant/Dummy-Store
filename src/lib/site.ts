export const siteConfig = {
  name: 'Dummy Store',
  tagline: 'Baju, celana, bandana, dan merchandise',
  description:
    'Belanja baju, celana, bandana, dan merchandise pilihan secara online. Gratis ongkir mulai Rp 300.000 dan retur 14 hari.',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  locale: 'id_ID',
  email: 'halo@dummystore.example',
}

export function absoluteUrl(path = '/') {
  return `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`
}

export interface NavItem {
  label: string
  href: string
}

/** Shown when the API cannot be reached. */
const FALLBACK_CATEGORIES = [
  { slug: 'baju', name: 'Baju' },
  { slug: 'celana', name: 'Celana' },
  { slug: 'bandana', name: 'Bandana' },
  { slug: 'merchandise', name: 'Merchandise' },
]

/** All products, then each category from the dashboard, in its order. */
export function navigationFor(categories: { slug: string; name: string }[]): NavItem[] {
  const list = categories.length ? categories : FALLBACK_CATEGORIES
  return [
    { label: 'Semua Produk', href: '/produk' },
    ...list.map((category) => ({ label: category.name, href: `/kategori/${category.slug}` })),
  ]
}

export const mainNavigation = navigationFor([])

export const footerNavigation = [
  {
    title: 'Belanja',
    links: mainNavigation,
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'Pusat Bantuan', href: '/bantuan' },
      { label: 'Panduan Ukuran', href: '/bantuan#ukuran' },
      { label: 'Pengiriman', href: '/bantuan#pengiriman' },
      { label: 'Retur', href: '/bantuan#retur' },
      { label: 'Kontak', href: '/kontak' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang Kami', href: '/tentang' },
      { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
      { label: 'Syarat dan Ketentuan', href: '/syarat-ketentuan' },
    ],
  },
]

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

export const mainNavigation = [
  { label: 'Semua Produk', href: '/produk' },
  { label: 'Baju', href: '/kategori/baju' },
  { label: 'Celana', href: '/kategori/celana' },
  { label: 'Bandana', href: '/kategori/bandana' },
  { label: 'Merchandise', href: '/kategori/merchandise' },
]

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

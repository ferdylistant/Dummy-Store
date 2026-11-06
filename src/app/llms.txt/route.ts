import { connection } from 'next/server'
import { absoluteUrl, siteConfig } from '@/lib/site'
import { getCategories } from '@/services/products'

/** Plain summary of the store for AI assistants and answer engines. */
export async function GET() {
  await connection()

  const categories = await getCategories()
  const lines = [
    `# ${siteConfig.name}`,
    '',
    `> ${siteConfig.description}`,
    '',
    '## Kategori',
    ...categories.map(
      (category) =>
        `- [${category.name}](${absoluteUrl(`/kategori/${category.slug}`)}): ${category.description}`,
    ),
    '',
    '## Informasi',
    `- [Semua Produk](${absoluteUrl('/produk')})`,
    `- [Pusat Bantuan](${absoluteUrl('/bantuan')}): pengiriman, retur, dan panduan ukuran`,
    `- [Tentang Kami](${absoluteUrl('/tentang')})`,
    `- [Kontak](${absoluteUrl('/kontak')})`,
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

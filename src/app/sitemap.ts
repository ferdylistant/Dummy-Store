import type { MetadataRoute } from 'next'
import { productImageUrl } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import { getAllProducts, getCategories } from '@/services/products'

const STATIC_PATHS = [
  '/',
  '/produk',
  '/bantuan',
  '/tentang',
  '/kontak',
  '/kebijakan-privasi',
  '/syarat-ketentuan',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getAllProducts(), getCategories()])

  return [
    ...STATIC_PATHS.map((path) => ({ url: absoluteUrl(path) })),
    ...categories.map((category) => ({ url: absoluteUrl(`/kategori/${category.slug}`) })),
    ...products.map((product) => ({
      url: absoluteUrl(`/produk/${product.slug}`),
      images: [productImageUrl(product)],
    })),
  ]
}

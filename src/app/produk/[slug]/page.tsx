import { notFound } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/seo/json-ld'
import { Container } from '@/components/ui/container'
import { ProductCard } from '@/features/products/product-card'
import { ProductView } from '@/features/products/product-view'
import { productJsonLd } from '@/lib/seo'
import {
  getAllProducts,
  getCategory,
  getProductBySlug,
  getRelatedProducts,
} from '@/services/products'

export async function generateStaticParams() {
  const products = await getAllProducts()
  return products.map((product) => ({ slug: product.slug }))
}

export async function generateMetadata(props: PageProps<'/produk/[slug]'>) {
  const { slug } = await props.params
  const product = await getProductBySlug(slug)
  if (!product) return {}

  const canonical = `/produk/${product.slug}`
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical },
    openGraph: { title: product.name, description: product.description, url: canonical },
  }
}

export default async function ProductPage(props: PageProps<'/produk/[slug]'>) {
  const { slug } = await props.params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const [category, related] = await Promise.all([
    getCategory(product.category),
    getRelatedProducts(product),
  ])

  return (
    <>
      <JsonLd data={productJsonLd(product, category)} />
      <Container className="py-6 lg:py-8">
        <Breadcrumbs
          items={[
            { label: 'Beranda', href: '/' },
            ...(category
              ? [{ label: category.name, href: `/kategori/${category.slug}` }]
              : [{ label: 'Produk', href: '/produk' }]),
            { label: product.name, href: `/produk/${product.slug}` },
          ]}
        />
        <div className="mt-4">
          <ProductView product={product} />
        </div>
      </Container>

      {related.length > 0 && (
        <section aria-labelledby="terkait" className="bg-card py-12 md:py-16">
          <Container>
            <h2 id="terkait" className="mb-8 text-2xl font-semibold tracking-tight lg:text-3xl">
              Produk terkait
            </h2>
            <ul className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
              {related.map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  )
}

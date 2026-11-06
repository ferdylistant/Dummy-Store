import { notFound } from 'next/navigation'
import { catalogMetadata } from '@/features/catalog/catalog-metadata'
import { CatalogView } from '@/features/catalog/catalog-view'
import { parseCatalogParams } from '@/features/catalog/params'
import { getCategory } from '@/services/products'

export async function generateMetadata(props: PageProps<'/kategori/[slug]'>) {
  const { slug } = await props.params
  const category = await getCategory(slug)
  if (!category) return {}

  return catalogMetadata({
    title: category.name,
    description: category.intro,
    basePath: `/kategori/${category.slug}`,
    filters: parseCatalogParams(await props.searchParams),
  })
}

export default async function CategoryPage(props: PageProps<'/kategori/[slug]'>) {
  const { slug } = await props.params
  const category = await getCategory(slug)
  if (!category) notFound()

  const basePath = `/kategori/${category.slug}`

  return (
    <CatalogView
      title={category.name}
      intro={category.intro}
      basePath={basePath}
      category={category.slug}
      filters={parseCatalogParams(await props.searchParams)}
      breadcrumbs={[
        { label: 'Beranda', href: '/' },
        { label: 'Produk', href: '/produk' },
        { label: category.name, href: basePath },
      ]}
    />
  )
}

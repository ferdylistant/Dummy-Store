import { catalogMetadata } from '@/features/catalog/catalog-metadata'
import { CatalogView } from '@/features/catalog/catalog-view'
import { parseCatalogParams } from '@/features/catalog/params'

const TITLE = 'Semua Produk'
const DESCRIPTION =
  'Lihat semua baju, celana, bandana, dan merchandise. Pilih ukuran, warna, dan harga yang sesuai.'

export async function generateMetadata(props: PageProps<'/produk'>) {
  const filters = parseCatalogParams(await props.searchParams)
  return catalogMetadata({ title: TITLE, description: DESCRIPTION, basePath: '/produk', filters })
}

export default async function ProductsPage(props: PageProps<'/produk'>) {
  const filters = parseCatalogParams(await props.searchParams)

  return (
    <CatalogView
      title={TITLE}
      intro={DESCRIPTION}
      basePath="/produk"
      filters={filters}
      breadcrumbs={[
        { label: 'Beranda', href: '/' },
        { label: TITLE, href: '/produk' },
      ]}
    />
  )
}

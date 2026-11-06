import { notFound } from 'next/navigation'
import { getCategory } from '@/services/products'

/**
 * Checks the category outside the loading boundary. Inside it the response has
 * already started as 200, so a missing category would not return a real 404.
 */
export default async function CategoryLayout(props: LayoutProps<'/kategori/[slug]'>) {
  const { slug } = await props.params
  if (!(await getCategory(slug))) notFound()
  return props.children
}

import type { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { CartPageView } from '@/features/cart/cart-page-view'

export const metadata: Metadata = {
  title: 'Keranjang',
  robots: { index: false, follow: true },
}

export default function CartPage() {
  return (
    <Container className="py-6 lg:py-8">
      <h1 className="mb-6 text-4xl font-semibold tracking-tight lg:text-5xl">Keranjang</h1>
      <CartPageView />
    </Container>
  )
}

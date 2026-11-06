import type { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { CheckoutForm } from '@/features/checkout/checkout-form'

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

export default function CheckoutPage() {
  return (
    <Container className="py-6 lg:py-8">
      <h1 className="mb-6 text-4xl font-semibold tracking-tight lg:text-5xl">Checkout</h1>
      <CheckoutForm />
    </Container>
  )
}

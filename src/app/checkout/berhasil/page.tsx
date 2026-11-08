import type { Metadata } from 'next'
import { Container } from '@/components/ui/container'
import { OrderStatus } from '@/features/checkout/order-status'

export const metadata: Metadata = {
  title: 'Status Pesanan',
  robots: { index: false, follow: false },
}

const ORDER_NUMBER = /^DS-[0-9A-F]{10}$/

export default async function CheckoutResultPage(props: PageProps<'/checkout/berhasil'>) {
  // The popup flow sends ?pesanan=, and a Midtrans page redirect sends ?order_id=.
  const { pesanan, order_id } = await props.searchParams
  const raw = typeof pesanan === 'string' ? pesanan : typeof order_id === 'string' ? order_id : ''
  const orderNumber = ORDER_NUMBER.test(raw) ? raw : null

  return (
    <Container className="py-16 lg:py-24">
      {orderNumber ? (
        <OrderStatus
          key={orderNumber}
          orderNumber={orderNumber}
          returnedFromMidtrans={typeof order_id === 'string'}
        />
      ) : (
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">Pesanan tidak ditemukan</h1>
          <p className="mt-3 text-muted-foreground">Tautan ini tidak memuat nomor pesanan yang valid.</p>
        </div>
      )}
    </Container>
  )
}

import { CircleCheck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/button'
import { Container } from '@/components/ui/container'

export const metadata: Metadata = {
  title: 'Pesanan Dibuat',
  robots: { index: false, follow: false },
}

export default async function CheckoutSuccessPage(props: PageProps<'/checkout/berhasil'>) {
  const { pesanan } = await props.searchParams
  const orderNumber = typeof pesanan === 'string' ? pesanan : null

  return (
    <Container className="flex flex-col items-center py-16 text-center lg:py-24">
      <CircleCheck aria-hidden="true" className="size-14 text-success" />
      <h1 className="mt-4 text-4xl font-semibold tracking-tight lg:text-5xl">Pesanan dibuat</h1>
      {orderNumber && (
        <p className="mt-3 font-medium">
          Nomor pesanan: <span className="tabular-nums">{orderNumber}</span>
        </p>
      )}
      <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">
        Pesanan Anda tersimpan. Pembayaran belum aktif, jadi belum ada tagihan sungguhan.
      </p>
      <Link href="/produk" className={buttonClasses({ className: 'mt-6' })}>
        Lanjut Belanja
      </Link>
    </Container>
  )
}

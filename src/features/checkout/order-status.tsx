'use client'

import { CircleCheck, CircleX, Clock, RotateCcw, SearchX } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { ButtonArrow, buttonClasses } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCart } from '@/features/cart/store'
import { formatRupiah } from '@/lib/format'
import { ApiError } from '@/services/api'
import { getOrderStatus, type OrderStatusView } from '@/services/orders'

const POLL_MS = 4000
/** Stops checking after about three minutes. A reload starts it again. */
const MAX_POLLS = 45

const dateTime = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' })

function Panel({
  icon,
  title,
  children,
  actions,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  actions: ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {icon}
      <h1 className="mt-4 text-4xl font-semibold tracking-tight lg:text-5xl">{title}</h1>
      <div className="mt-3 max-w-prose leading-relaxed text-muted-foreground">{children}</div>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>
    </div>
  )
}

const shopAgain = (
  <Link href="/produk" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
    Lanjut Belanja
  </Link>
)

export function OrderStatus({
  orderNumber,
  returnedFromMidtrans,
}: {
  orderNumber: string
  returnedFromMidtrans: boolean
}) {
  const clear = useCart((state) => state.clear)
  const [order, setOrder] = useState<OrderStatusView | null>(null)
  const [missing, setMissing] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let polls = 0
    let timer: number | undefined

    async function check() {
      try {
        const result = await getOrderStatus(orderNumber)
        if (!active) return
        setOrder(result)
        setFailed(false)
        if (result.status === 'awaiting_payment' && ++polls < MAX_POLLS) {
          timer = window.setTimeout(check, POLL_MS)
        }
      } catch (error) {
        if (!active) return
        if (error instanceof ApiError && error.status === 404) setMissing(true)
        else setFailed(true)
      }
    }

    check()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [orderNumber])

  // Shoppers sent back from a Midtrans page skipped the popup, which empties the cart.
  useEffect(() => {
    if (returnedFromMidtrans && order && order.status !== 'expired' && order.status !== 'cancelled') {
      clear()
    }
  }, [returnedFromMidtrans, order, clear])

  const number = (
    <p className="mt-1">
      Nomor pesanan <span className="font-medium text-foreground tabular-nums">{orderNumber}</span>
      {order && <> dengan total {formatRupiah(order.total)}</>}.
    </p>
  )

  if (missing) {
    return (
      <Panel
        icon={<SearchX aria-hidden="true" className="size-14 text-muted-foreground" />}
        title="Pesanan tidak ditemukan"
        actions={shopAgain}
      >
        <p>Periksa lagi nomor pesanan pada tautan yang Anda buka.</p>
      </Panel>
    )
  }

  if (failed && !order) {
    return (
      <Panel
        icon={<CircleX aria-hidden="true" className="size-14 text-muted-foreground" />}
        title="Status belum bisa dimuat"
        actions={shopAgain}
      >
        <p>Pesanan Anda tetap aman. Muat ulang halaman ini beberapa saat lagi.</p>
      </Panel>
    )
  }

  if (!order) {
    return (
      <div role="status" aria-label="Memuat status pesanan" className="flex flex-col items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  const region = (content: ReactNode) => <div aria-live="polite">{content}</div>

  switch (order.status) {
    case 'paid':
      return region(
        <Panel
          icon={<CircleCheck aria-hidden="true" className="size-14 text-success" />}
          title="Pembayaran diterima"
          actions={
            <Link href="/produk" className={buttonClasses({ variant: 'action' })}>
              Lanjut Belanja
              <ButtonArrow />
            </Link>
          }
        >
          <p>Terima kasih. Pesanan Anda sedang kami siapkan untuk dikirim.</p>
          {number}
        </Panel>,
      )
    case 'awaiting_payment':
      return region(
        <Panel
          icon={<Clock aria-hidden="true" className="size-14" />}
          title="Menunggu pembayaran"
          actions={
            <>
              {order.paymentUrl && (
                <a href={order.paymentUrl} className={buttonClasses({ variant: 'action' })}>
                  Lanjutkan Pembayaran
                  <ButtonArrow />
                </a>
              )}
              {shopAgain}
            </>
          }
        >
          <p>
            Selesaikan pembayaran
            {order.expiresAt && <> sebelum {dateTime.format(new Date(order.expiresAt))}</>}. Halaman
            ini diperbarui otomatis.
          </p>
          {number}
        </Panel>,
      )
    case 'refunded':
      return region(
        <Panel
          icon={<RotateCcw aria-hidden="true" className="size-14" />}
          title="Dana dikembalikan"
          actions={shopAgain}
        >
          <p>Pembayaran untuk pesanan ini sudah dikembalikan.</p>
          {number}
        </Panel>,
      )
    default:
      return region(
        <Panel
          icon={<CircleX aria-hidden="true" className="size-14 text-muted-foreground" />}
          title={order.status === 'expired' ? 'Waktu pembayaran habis' : 'Pesanan dibatalkan'}
          actions={
            <Link href="/produk" className={buttonClasses({ variant: 'action' })}>
              Belanja Lagi
              <ButtonArrow />
            </Link>
          }
        >
          <p>Pesanan ini tidak dibayar, jadi tidak ada tagihan dan stoknya sudah dikembalikan.</p>
          {number}
        </Panel>,
      )
  }
}

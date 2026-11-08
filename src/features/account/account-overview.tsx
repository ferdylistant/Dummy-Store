'use client'

import { BadgeCheck, ChevronRight, Clock, MapPin, Package } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { ButtonArrow, buttonClasses } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getAddresses, getOrderHistory, type Address, type OrderHistoryItem } from '@/services/account'
import { formatAddress } from './address-book'
import { OrderThumb, StatusChip, orderDate, useOrderProducts } from './order-parts'

const monthYear = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })

/** The member card, sewn like the fabric label on the product page. */
function MemberCard() {
  const { data: session } = authClient.useSession()
  if (!session) return null
  const { user } = session
  const since = user.createdAt ? monthYear.format(new Date(user.createdAt)) : null

  return (
    <section aria-labelledby="kartu-anggota" className="rounded-3xl bg-muted p-1.5">
      <div className="grid gap-6 rounded-[1.375rem] border border-dashed border-input px-5 py-6 md:grid-cols-[1fr_auto] md:items-end md:px-8 md:py-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">Kartu anggota</p>
          <h2 id="kartu-anggota" className="mt-2 truncate text-3xl font-semibold tracking-tight lg:text-4xl">
            {user.name}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="truncate">{user.email}</span>
            {user.emailVerified && (
              <span className="inline-flex items-center gap-1 font-medium text-success">
                <BadgeCheck aria-hidden="true" className="size-4" />
                Terverifikasi
              </span>
            )}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 border-t border-dashed border-input pt-4 text-sm md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <dt className="text-muted-foreground">Anggota sejak</dt>
          <dt className="text-muted-foreground">No. anggota</dt>
          <dd className="font-semibold">{since ?? '-'}</dd>
          <dd className="font-semibold tabular-nums">DS-{user.id.slice(0, 6).toUpperCase()}</dd>
        </dl>
      </div>
    </section>
  )
}

function Stat({
  href,
  icon: Icon,
  label,
  shortLabel,
  value,
  hint,
  highlight,
}: {
  href: string
  icon: typeof Package
  label: string
  /** Fits the narrow tile on phones. */
  shortLabel?: string
  value: number | null
  hint: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-w-0 flex-col rounded-2xl border p-3 transition-colors duration-200 sm:p-5',
        highlight ? 'border-foreground' : 'border-border hover:border-input',
      )}
    >
      <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
        <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Icon aria-hidden="true" className={cn('size-4 shrink-0', highlight && 'text-warning')} />
          {shortLabel ? (
            <>
              <span className="truncate sm:hidden">{shortLabel}</span>
              <span className="hidden truncate sm:inline">{label}</span>
            </>
          ) : (
            <span className="truncate">{label}</span>
          )}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="hidden size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 sm:block"
        />
      </span>
      {value === null ? (
        <Skeleton className="mt-3 h-9 w-12 rounded-lg" />
      ) : (
        <span className="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{value}</span>
      )}
      <span className="mt-1 hidden text-sm text-muted-foreground sm:block">{hint}</span>
    </Link>
  )
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function AccountOverview() {
  const [orders, setOrders] = useState<OrderHistoryItem[] | null>(null)
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [failed, setFailed] = useState(false)
  const products = useOrderProducts(orders)

  useEffect(() => {
    getOrderHistory().then(setOrders).catch(() => setFailed(true))
    getAddresses().then(setAddresses).catch(() => setFailed(true))
  }, [])

  const unpaid = orders?.filter((order) => order.status === 'awaiting_payment') ?? []
  const primary = addresses?.find((address) => address.isDefault)

  return (
    <div className="grid gap-6">
      <MemberCard />

      {failed && (
        <p role="alert" className="rounded-2xl bg-muted p-4 text-sm text-destructive">
          Sebagian data gagal dimuat. Muat ulang halaman ini.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat
          href="/akun/pesanan"
          icon={Package}
          label="Pesanan"
          value={orders ? orders.length : null}
          hint="Semua pesanan dari akun ini"
        />
        <Stat
          href="/akun/pesanan"
          icon={Clock}
          label="Belum dibayar"
          shortLabel="Tagihan"
          value={orders ? unpaid.length : null}
          hint={unpaid.length ? 'Selesaikan sebelum batas waktu' : 'Tidak ada tagihan tertunda'}
          highlight={unpaid.length > 0}
        />
        <Stat
          href="/akun/alamat"
          icon={MapPin}
          label="Alamat"
          value={addresses ? addresses.length : null}
          hint={primary ? `Utama: ${primary.label}` : 'Belum ada alamat utama'}
        />
      </div>

      {unpaid.length > 0 && (
        <Panel title="Menunggu pembayaran">
          <ul className="divide-y divide-dashed divide-input">
            {unpaid.slice(0, 3).map((order) => (
              <li key={order.orderNumber} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="text-sm">
                  <span className="font-semibold tabular-nums">{order.orderNumber}</span>
                  <span className="text-muted-foreground"> · {formatRupiah(order.total)}</span>
                </p>
                <Link
                  href={`/checkout/berhasil?pesanan=${order.orderNumber}`}
                  className={buttonClasses({ variant: 'primary' })}
                >
                  Bayar Sekarang
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <Panel
          title="Pesanan terbaru"
          action={
            orders?.length ? (
              <Link href="/akun/pesanan" className="inline-flex min-h-11 items-center text-sm font-medium">
                <span className="link-stitch">Lihat semua</span>
              </Link>
            ) : null
          }
        >
          {!orders ? (
            <div role="status" aria-label="Memuat pesanan" className="grid gap-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-2">
              <p className="text-muted-foreground">Belum ada pesanan. Pesanan pertama Anda akan muncul di sini.</p>
              <Link href="/produk" className={buttonClasses({ variant: 'action' })}>
                Mulai Belanja
                <ButtonArrow />
              </Link>
            </div>
          ) : (
            <ul className="grid gap-2">
              {orders.slice(0, 3).map((order) => {
                const first = order.items[0]
                const more = order.items.length - 1
                return (
                  <li key={order.orderNumber}>
                    <Link
                      href={`/checkout/berhasil?pesanan=${order.orderNumber}`}
                      className="flex items-center gap-4 rounded-2xl p-2 transition-colors duration-200 hover:bg-muted"
                    >
                      <OrderThumb product={products.get(first?.productId ?? '')} color={first?.color ?? ''} className="size-14" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {first?.name}
                          {more > 0 && <span className="text-muted-foreground"> +{more} lainnya</span>}
                        </span>
                        <span className="block text-sm text-muted-foreground tabular-nums">
                          {order.orderNumber} · {orderDate(order.createdAt)}
                        </span>
                        <span className="mt-1 block sm:hidden">
                          <StatusChip status={order.status} />
                        </span>
                      </span>
                      <span className="hidden flex-col items-end gap-1 sm:flex">
                        <StatusChip status={order.status} />
                        <span className="text-sm font-semibold tabular-nums">{formatRupiah(order.total)}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Alamat utama"
          action={
            <Link href="/akun/alamat" className="inline-flex min-h-11 items-center text-sm font-medium">
              <span className="link-stitch">Kelola</span>
            </Link>
          }
        >
          {!addresses ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : primary ? (
            <div className="text-sm">
              <p className="font-semibold">{primary.label}</p>
              <p className="mt-1">
                {primary.recipient} · {primary.phone}
              </p>
              <p className="mt-1 leading-relaxed text-muted-foreground">
                {formatAddress(primary)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Simpan alamat agar checkout cukup sekali klik.
            </p>
          )}
        </Panel>
      </div>
    </div>
  )
}

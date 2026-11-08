'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, Package } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, ButtonArrow, buttonClasses } from '@/components/ui/button'
import { PasswordField } from '@/components/ui/password-field'
import { Skeleton } from '@/components/ui/skeleton'
import { TextField } from '@/components/ui/text-field'
import { authClient, authErrorMessage } from '@/lib/auth-client'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  getOrderHistory,
  getPreferences,
  savePreferences,
  type OrderHistoryItem,
  type Preferences,
} from '@/services/account'
import { AccountSection } from './account-shell'

function Saved({ show }: { show: boolean }) {
  return (
    <p role="status" className="text-sm text-success">
      {show ? 'Tersimpan.' : ''}
    </p>
  )
}

export function ProfileSection() {
  const { data: session, refetch } = authClient.useSession()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const form = useForm({
    resolver: zodResolver(z.object({ name: z.string().trim().min(2, 'Tulis nama Anda.').max(80) })),
    values: { name: session?.user.name ?? '' },
  })
  if (!session) return null

  return (
    <AccountSection title="Profil" description="Nama dipakai di email dan sebagai penerima bawaan.">
      <form
        noValidate
        className="grid max-w-xl gap-4"
        onSubmit={form.handleSubmit(async ({ name }) => {
          setSaved(false)
          const { error: failure } = await authClient.updateUser({ name })
          if (failure) return setError(authErrorMessage(failure))
          setError('')
          setSaved(true)
          refetch()
        })}
      >
        <TextField id="profile-name" label="Nama" autoComplete="name" error={form.formState.errors.name?.message} {...form.register('name')} />
        <div>
          <p className="mb-1 text-sm font-medium">Email</p>
          <p className="flex items-center gap-2 text-sm">
            {session.user.email}
            {session.user.emailVerified && (
              <span className="inline-flex items-center gap-1 text-success">
                <BadgeCheck aria-hidden="true" className="size-4" />
                Terverifikasi
              </span>
            )}
          </p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>Simpan</Button>
          <Saved show={saved} />
        </div>
      </form>
    </AccountSection>
  )
}

const STATUS: Record<OrderHistoryItem['status'], { label: string; tone: string }> = {
  awaiting_payment: { label: 'Belum dibayar', tone: 'text-warning' },
  paid: { label: 'Dikemas', tone: 'text-foreground' },
  expired: { label: 'Kedaluwarsa', tone: 'text-muted-foreground' },
  cancelled: { label: 'Dibatalkan', tone: 'text-muted-foreground' },
  refunded: { label: 'Dana dikembalikan', tone: 'text-muted-foreground' },
}

const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' })

export function OrderHistory() {
  const [orders, setOrders] = useState<OrderHistoryItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getOrderHistory().then(setOrders).catch(() => setFailed(true))
  }, [])

  if (failed) return <p role="alert" className="text-destructive">Pesanan gagal dimuat. Muat ulang halaman.</p>
  if (!orders) {
    return (
      <div role="status" aria-label="Memuat pesanan" className="grid gap-4">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <AccountSection title="Pesanan">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Package aria-hidden="true" className="size-10 text-muted-foreground" />
          <p className="font-medium">Belum ada pesanan</p>
          <Link href="/produk" className={buttonClasses({ variant: 'action' })}>
            Mulai Belanja
            <ButtonArrow />
          </Link>
        </div>
      </AccountSection>
    )
  }

  return (
    <ul className="grid gap-4">
      {orders.map((order) => {
        const status = STATUS[order.status]
        return (
          <li key={order.orderNumber} className="rounded-3xl border border-border p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">{order.orderNumber}</span>
                {' · '}
                {dateFormat.format(new Date(`${order.createdAt.replace(' ', 'T')}Z`))}
              </p>
              <p className={cn('font-semibold', status.tone)}>{status.label}</p>
            </div>
            <ul className="mt-4 divide-y divide-dashed divide-input border-y border-dashed border-input">
              {order.items.map((item) => (
                <li key={`${item.productId}-${item.color}-${item.size}`} className="flex justify-between gap-4 py-2 text-sm">
                  <span>
                    {item.name}{' '}
                    <span className="text-muted-foreground">
                      {item.color}
                      {item.size === 'Satu ukuran' ? '' : `, ${item.size}`} x{item.quantity}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatRupiah(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold tabular-nums">Total {formatRupiah(order.total)}</p>
              <Link
                href={`/checkout/berhasil?pesanan=${order.orderNumber}`}
                className={buttonClasses({ variant: order.status === 'awaiting_payment' ? 'primary' : 'outline' })}
              >
                {order.status === 'awaiting_payment' ? 'Bayar Sekarang' : 'Lihat Detail'}
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Toggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <label htmlFor={id} className="min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-foreground' : 'bg-input',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1 left-1 size-6 rounded-full bg-background shadow-sm transition-transform duration-200',
            checked && 'translate-x-6',
          )}
        />
      </button>
    </div>
  )
}

export function PreferencesForm() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getPreferences().then(setPrefs).catch(() => setError('Pengaturan gagal dimuat.'))
  }, [])

  async function update(next: Preferences) {
    setPrefs(next)
    setSaved(false)
    try {
      setPrefs(await savePreferences(next))
      setSaved(true)
      setError('')
    } catch {
      setError('Pengaturan gagal disimpan. Coba lagi.')
    }
  }

  return (
    <AccountSection title="Notifikasi" description="Pilih email apa saja yang ingin Anda terima.">
      {!prefs ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : (
        <div className="max-w-xl divide-y divide-border">
          <Toggle
            id="pref-orders"
            label="Status pesanan"
            hint="Pembayaran diterima, pesanan dikirim, dan pesanan sampai."
            checked={prefs.orderUpdates}
            onChange={(value) => update({ ...prefs, orderUpdates: value })}
          />
          <Toggle
            id="pref-promo"
            label="Promo dan koleksi baru"
            hint="Paling banyak dua email per bulan."
            checked={prefs.promotions}
            onChange={(value) => update({ ...prefs, promotions: value })}
          />
        </div>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-4">
        <Saved show={saved} />
      </div>
    </AccountSection>
  )
}

export function SecuritySection() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const form = useForm({
    resolver: zodResolver(
      z.object({
        currentPassword: z.string().min(1, 'Tulis password saat ini.'),
        newPassword: z.string().min(8, 'Password minimal 8 karakter.').max(128),
      }),
    ),
    mode: 'onTouched',
  })

  useEffect(() => {
    authClient.listAccounts().then(({ data }) => {
      setHasPassword(Boolean(data?.some((account) => account.providerId === 'credential')))
    })
  }, [])

  return (
    <div className="grid gap-6">
      <AccountSection title="Ganti password" description="Sesi di perangkat lain akan dikeluarkan.">
        {hasPassword === false ? (
          <p className="text-sm text-muted-foreground">
            Akun ini masuk lewat Google, jadi tidak memakai password di toko ini.
          </p>
        ) : (
          <form
            noValidate
            className="grid max-w-xl gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              setMessage('')
              const { error: failure } = await authClient.changePassword({ ...values, revokeOtherSessions: true })
              if (failure) return setError(authErrorMessage(failure))
              setError('')
              form.reset()
              setMessage('Password berhasil diganti.')
            })}
          >
            <PasswordField id="current-password" label="Password saat ini" autoComplete="current-password" error={form.formState.errors.currentPassword?.message} {...form.register('currentPassword')} />
            <PasswordField id="new-password" label="Password baru" autoComplete="new-password" hint="Minimal 8 karakter." error={form.formState.errors.newPassword?.message} {...form.register('newPassword')} />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>Ganti Password</Button>
              <p role="status" className="text-sm text-success">{message}</p>
            </div>
          </form>
        )}
      </AccountSection>
      <AccountSection title="Perangkat lain" description="Keluar dari semua perangkat selain yang sedang dipakai.">
        <Button
          variant="outline"
          onClick={async () => {
            await authClient.revokeOtherSessions()
            setMessage('Semua perangkat lain sudah dikeluarkan.')
          }}
        >
          Keluar dari Perangkat Lain
        </Button>
      </AccountSection>
    </div>
  )
}

'use client'

import { Laptop, Smartphone, Tablet } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'
import { describeDevice } from '@/lib/user-agent'
import { cn } from '@/lib/utils'
import { AccountSection } from './account-shell'

interface SessionRow {
  id: string
  token: string
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

const ICONS = { phone: Smartphone, tablet: Tablet, computer: Laptop }
const when = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

/** IPv6 is stored as its /64 network, so it is shown as a network, written short. */
function describeIp(ip: string | null | undefined) {
  if (!ip) return 'IP tidak tercatat'
  if (ip === '127.0.0.1' || ip === '::1') return `Jaringan lokal (${ip})`
  if (!ip.includes(':')) return `IP ${ip}`
  const groups = ip.split(':').map((group) => group.replace(/^0+(?=.)/, ''))
  const network = groups.slice(0, 4).join(':')
  return groups.slice(4).every((group) => group === '0') ? `Jaringan IPv6 ${network}::/64` : `IP ${groups.join(':')}`
}

/** Every device signed in to this account, with a way to sign each one out. */
export function SessionList() {
  const confirm = useConfirm()
  const { data: current } = authClient.useSession()
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error: failure } = await authClient.listSessions()
    if (failure) setError('Daftar perangkat gagal dimuat. Muat ulang halaman.')
    else setSessions(data as SessionRow[])
  }, [])

  useEffect(() => {
    authClient.listSessions().then(({ data, error: failure }) => {
      if (failure) setError('Daftar perangkat gagal dimuat. Muat ulang halaman.')
      else setSessions(data as SessionRow[])
    })
  }, [])

  const currentToken = current?.session.token
  const sorted = sessions
    ? [...sessions].sort((a, b) =>
        a.token === currentToken ? -1 : b.token === currentToken ? 1 : +new Date(b.createdAt) - +new Date(a.createdAt),
      )
    : null
  const others = sorted?.filter((item) => item.token !== currentToken) ?? []

  async function revoke(row: SessionRow) {
    setBusy(row.token)
    setMessage('')
    const { error: failure } = await authClient.revokeSession({ token: row.token })
    setBusy(null)
    if (failure) return setError('Perangkat gagal dikeluarkan. Coba lagi.')
    // Drop the row now, so it never shows next to its own confirmation.
    setSessions((list) => list?.filter((item) => item.token !== row.token) ?? null)
    setError('')
    setMessage(`${describeDevice(row.userAgent).name} sudah dikeluarkan.`)
    load()
  }

  async function revokeOthers() {
    const ok = await confirm({
      title: 'Keluarkan semua perangkat lain?',
      description: `${others.length} perangkat lain akan keluar dari akun ini.`,
      consequences: ['Perangkat itu harus masuk lagi dengan email dan password.', 'Perangkat yang sedang Anda pakai tetap masuk.'],
      confirmLabel: 'Keluarkan Perangkat',
    })
    if (!ok) return
    setBusy('others')
    setMessage('')
    const { error: failure } = await authClient.revokeOtherSessions()
    setBusy(null)
    if (failure) return setError('Perangkat lain gagal dikeluarkan. Coba lagi.')
    setSessions((list) => list?.filter((item) => item.token === currentToken) ?? null)
    setError('')
    setMessage('Semua perangkat lain sudah dikeluarkan.')
    load()
  }

  return (
    <AccountSection
      title="Perangkat yang masuk"
      description="Keluarkan perangkat yang tidak Anda kenali, lalu ganti password."
      action={
        others.length > 0 && (
          <Button variant="outline" disabled={busy !== null} onClick={revokeOthers}>
            {busy === 'others' ? 'Memproses...' : 'Keluar dari Semua Perangkat Lain'}
          </Button>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <p role="status" className={cn('text-sm text-success', message && 'mb-4')}>
        {message}
      </p>

      {!sorted ? (
        <div role="status" aria-label="Memuat perangkat" className="grid gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : (
        <ul className="divide-y divide-dashed divide-input border-y border-dashed border-input">
          {sorted.map((row) => {
            const device = describeDevice(row.userAgent)
            const Icon = ICONS[device.kind]
            const isCurrent = row.token === currentToken
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-4 py-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {device.name}
                    {isCurrent && (
                      <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
                        Perangkat ini
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {describeIp(row.ipAddress)} · Masuk {when.format(new Date(row.createdAt))}
                  </p>
                </div>
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => revoke(row)}
                    aria-label={`Keluarkan ${device.name}, masuk ${when.format(new Date(row.createdAt))}`}
                    className="text-destructive"
                  >
                    {busy === row.token ? 'Memproses...' : 'Keluarkan'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {sorted && others.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Hanya perangkat ini yang sedang masuk.</p>
      )}
    </AccountSection>
  )
}

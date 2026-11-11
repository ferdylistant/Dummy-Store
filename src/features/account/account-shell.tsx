'use client'

import { Bell, LayoutGrid, LogOut, MapPin, Package, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Skeleton } from '@/components/ui/skeleton'
import { flushCart } from '@/features/cart/cart-sync'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

interface Tab {
  href: string
  label: string
  icon: LucideIcon
  title: string
  description: string
}

const TABS: Tab[] = [
  { href: '/akun', label: 'Ringkasan', icon: LayoutGrid, title: 'Ringkasan', description: 'Kartu anggota, pesanan, dan alamat Anda dalam satu tempat.' },
  { href: '/akun/pesanan', label: 'Pesanan', icon: Package, title: 'Pesanan saya', description: 'Lacak pembayaran dan status setiap pesanan.' },
  { href: '/akun/alamat', label: 'Alamat', icon: MapPin, title: 'Alamat tersimpan', description: 'Alamat utama dipilih otomatis saat checkout.' },
  { href: '/akun/profil', label: 'Profil', icon: UserRound, title: 'Profil', description: 'Nama dan email yang terhubung ke akun ini.' },
  { href: '/akun/notifikasi', label: 'Notifikasi', icon: Bell, title: 'Notifikasi', description: 'Pilih email apa saja yang ingin Anda terima.' },
  { href: '/akun/keamanan', label: 'Keamanan', icon: ShieldCheck, title: 'Keamanan', description: 'Password dan perangkat yang sedang masuk.' },
]

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

function AccountSkeleton() {
  return (
    <Container className="py-8 lg:py-12">
      <div role="status" aria-label="Memuat akun" className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
        <div className="grid content-start gap-4">
          <Skeleton className="h-20 rounded-3xl" />
          <Skeleton className="hidden h-72 rounded-2xl lg:block" />
          <Skeleton className="h-11 rounded-full lg:hidden" />
        </div>
        <div className="grid content-start gap-4">
          <Skeleton className="h-12 w-64 rounded-xl" />
          <Skeleton className="h-5 w-80 max-w-full" />
          <Skeleton className="mt-4 h-48 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </div>
    </Container>
  )
}

export function AccountShell({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const pathname = usePathname()
  const router = useRouter()
  // Signing out also clears the session, which must not bounce to the sign in page.
  const signingOut = useRef(false)

  useEffect(() => {
    if (!isPending && !session && !signingOut.current) router.replace(`/masuk?next=${encodeURIComponent(pathname)}&sesi=habis`)
  }, [isPending, session, pathname, router])

  if (!session) return <AccountSkeleton />

  const current = TABS.find((tab) => tab.href === pathname) ?? TABS[0]
  const signOut = async () => {
    signingOut.current = true
    // A change still waiting to be saved reaches the account before the session ends.
    await flushCart()
    await authClient.signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <Container className="py-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-3 rounded-3xl bg-muted p-4">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-base font-semibold text-background"
            >
              {initials(session.user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{session.user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{session.user.email}</p>
            </div>
          </div>

          <nav aria-label="Menu akun" className="mt-4 lg:mt-6">
            {/* A dashed seam. The open page is sewn with a solid thread. */}
            <ul className="-mx-4 flex overflow-x-auto border-b border-dashed border-input px-4 [scrollbar-width:none] lg:mx-0 lg:block lg:border-b-0 lg:border-l lg:px-0">
              {TABS.map((tab) => {
                const active = tab === current
                const Icon = tab.icon
                return (
                  <li key={tab.href} className="shrink-0">
                    <Link
                      href={tab.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex h-12 items-center gap-2 px-3 text-sm whitespace-nowrap transition-colors duration-200 lg:h-11 lg:gap-3 lg:pl-5',
                        'after:absolute after:bg-foreground after:transition-transform after:duration-200',
                        'after:inset-x-3 after:-bottom-px after:h-0.5 lg:after:inset-x-auto lg:after:inset-y-2 lg:after:-left-px lg:after:h-auto lg:after:w-0.5',
                        active
                          ? 'font-semibold text-foreground after:scale-100'
                          : 'text-muted-foreground after:scale-0 hover:text-foreground',
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      {tab.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <Button
            variant="ghost"
            onClick={signOut}
            className="mt-6 hidden w-full justify-start px-3 text-muted-foreground lg:flex"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Keluar
          </Button>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">{current.title}</h1>
              <p className="mt-2 text-muted-foreground">{current.description}</p>
            </div>
            <Button variant="outline" onClick={signOut} className="lg:hidden">
              <LogOut aria-hidden="true" className="size-4" />
              Keluar
            </Button>
          </div>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </Container>
  )
}

/** A titled panel inside the account pages. */
export function AccountSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-3xl border border-border p-5 md:p-8', className)}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight lg:text-xl">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

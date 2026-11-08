'use client'

import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/akun', label: 'Profil' },
  { href: '/akun/pesanan', label: 'Pesanan' },
  { href: '/akun/alamat', label: 'Alamat' },
  { href: '/akun/notifikasi', label: 'Notifikasi' },
  { href: '/akun/keamanan', label: 'Keamanan' },
]

export function AccountShell({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const pathname = usePathname()
  const router = useRouter()
  // Signing out also clears the session, which must not bounce to the sign in page.
  const signingOut = useRef(false)

  useEffect(() => {
    if (!isPending && !session && !signingOut.current) router.replace(`/masuk?next=${encodeURIComponent(pathname)}`)
  }, [isPending, session, pathname, router])

  if (!session) {
    return (
      <Container className="py-10 lg:py-16">
        <div role="status" aria-label="Memuat akun" className="grid gap-4">
          <Skeleton className="h-12 w-64 rounded-xl" />
          <Skeleton className="h-11 w-full max-w-xl rounded-full" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </Container>
    )
  }

  return (
    <Container className="py-10 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Halo, {session.user.name}</p>
          <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">Akun saya</h1>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            signingOut.current = true
            await authClient.signOut()
            router.replace('/')
            router.refresh()
          }}
        >
          <LogOut aria-hidden="true" className="size-4" />
          Keluar
        </Button>
      </div>

      <nav aria-label="Menu akun" className="-mx-4 mt-8 overflow-x-auto px-4">
        <ul className="inline-flex gap-1 rounded-full bg-muted p-1">
          {TABS.map((tab) => {
            const active = pathname === tab.href
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-10 items-center rounded-full px-4 text-sm whitespace-nowrap transition-colors duration-200',
                    active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-8">{children}</div>
    </Container>
  )
}

/** A titled panel inside the account pages. */
export function AccountSection({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-border p-5 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

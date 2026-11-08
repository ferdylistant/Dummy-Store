'use client'

import { MapPin, Package, Zap } from 'lucide-react'
import { m, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Container } from '@/components/ui/container'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

export type AuthMode = 'masuk' | 'daftar' | 'pulih'

/** Lets the sign up form write the shopper's name onto the tag as they type. */
const TagName = createContext<(name: string) => void>(() => {})
export const useTagName = () => useContext(TagName)

const BENEFITS = [
  { icon: MapPin, text: 'Alamat tersimpan untuk checkout' },
  { icon: Package, text: 'Riwayat dan status pesanan' },
  { icon: Zap, text: 'Bayar lebih cepat tiap belanja' },
]

const TAG_LABEL: Record<AuthMode, string> = {
  masuk: 'Selamat datang kembali',
  daftar: 'Kartu anggota baru',
  pulih: 'Pemulihan akun',
}

/** The membership card: a large paper garment tag hanging from the rail. */
function MemberTag({ mode, name }: { mode: AuthMode; name: string }) {
  const reduced = useReducedMotion()
  const shown = name.trim()

  return (
    <div className="relative flex flex-col items-center">
      {/* The rail and the string from it to the tag. */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 rounded-full bg-input" />
      <svg aria-hidden="true" viewBox="0 0 24 64" className="h-12 w-6 text-input lg:h-16" fill="none">
        <path d="M12 0C4 22 20 40 12 64" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <m.div
        style={{ transformOrigin: '50% 0' }}
        initial={reduced ? false : { rotate: -7 }}
        animate={{ rotate: 0 }}
        transition={{ type: 'spring', stiffness: 60, damping: 6, mass: 1.2 }}
        className="relative -mt-1 w-64 rounded-b-2xl bg-background px-6 pt-10 pb-6 [clip-path:polygon(28px_0,calc(100%_-_28px)_0,100%_28px,100%_100%,0_100%,0_28px)] lg:w-80 lg:px-8 lg:pt-12 lg:pb-8"
      >
        <span
          aria-hidden="true"
          className="absolute top-4 left-1/2 size-3 -translate-x-1/2 rounded-full bg-muted ring-1 ring-input lg:top-5"
        />
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">{TAG_LABEL[mode]}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">Dummy Store</p>
        <div className="mt-6 border-t border-dashed border-input pt-3">
          <p className="text-xs text-muted-foreground">Nama</p>
          <p
            className={cn(
              'mt-0.5 min-h-7 truncate text-lg font-medium',
              !shown && 'text-muted-foreground',
            )}
          >
            {shown || (mode === 'daftar' ? 'Nama Anda di sini' : 'Anggota Dummy Store')}
          </p>
        </div>
        <ul className="mt-4 hidden gap-2 border-t border-dashed border-input pt-4 text-sm md:grid">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2 text-muted-foreground">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-foreground" />
              {text}
            </li>
          ))}
        </ul>
      </m.div>
    </div>
  )
}

function ModeTabs({ mode, next }: { mode: AuthMode; next?: string }) {
  const query = next ? `?next=${encodeURIComponent(next)}` : ''
  const tabs = [
    { id: 'masuk', label: 'Masuk', href: `/masuk${query}` },
    { id: 'daftar', label: 'Daftar', href: `/daftar${query}` },
  ] as const

  return (
    <nav aria-label="Masuk atau daftar">
      <ul className="inline-flex gap-1 rounded-full bg-muted p-1">
        {tabs.map((tab) => {
          const active = tab.id === mode
          return (
            <li key={tab.id}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 min-w-24 items-center justify-center rounded-full px-5 text-sm transition-colors duration-200',
                  active ? 'bg-background font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Sign in, sign up, and password screens: the member tag beside the form. */
export function AuthShell({
  mode,
  next,
  title,
  intro,
  children,
  footer,
}: {
  mode: AuthMode
  next?: string
  title: string
  intro?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  const [name, setName] = useState('')
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const signedIn = Boolean(session)

  // The proxy catches this first. When the API sits on another domain its
  // cookie is invisible to the proxy, so the page checks as well.
  useEffect(() => {
    if (signedIn && mode !== 'pulih') router.replace(next ?? '/akun')
  }, [signedIn, mode, next, router])

  return (
    <TagName.Provider value={setName}>
      <Container className="py-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="rounded-3xl bg-muted px-6 pt-6 pb-8 lg:flex lg:items-start lg:justify-center lg:px-10 lg:pt-16 lg:pb-16">
            <div className="w-full lg:max-w-md">
              <MemberTag mode={mode} name={name} />
            </div>
          </div>

          <div className="w-full max-w-md justify-self-center lg:justify-self-start lg:pt-8">
            {mode !== 'pulih' && <ModeTabs mode={mode} next={next} />}
            <h1 className={cn('text-4xl font-semibold tracking-tight lg:text-5xl', mode !== 'pulih' && 'mt-8')}>
              {title}
            </h1>
            {intro && <div className="mt-3 leading-relaxed text-muted-foreground">{intro}</div>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
          </div>
        </div>
      </Container>
    </TagName.Provider>
  )
}

'use client'

import { Menu, Search } from 'lucide-react'
import Form from 'next/form'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { mainNavigation } from '@/lib/site'
import { cn } from '@/lib/utils'
import { isActivePath } from './nav-links'

const SECONDARY_LINKS = [
  { label: 'Pusat Bantuan', href: '/bantuan' },
  { label: 'Tentang Kami', href: '/tentang' },
  { label: 'Kontak', href: '/kontak' },
]

export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const close = () => setOpen(false)

  return (
    <div className="-ml-2 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Buka menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden="true" className="size-6" />
      </Button>
      <Drawer open={open} onClose={close} title="Menu" side="left">
        <div className="p-4">
          <Form action="/produk" role="search" className="relative" onSubmit={close}>
            <label htmlFor="mobile-search" className="sr-only">
              Cari produk
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder="Cari produk"
              className="h-11 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-base placeholder:text-muted-foreground"
            />
          </Form>
          <nav aria-label="Menu mobile" className="mt-4">
            <ul>
              {mainNavigation.map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-12 items-center rounded-lg px-3 text-base font-medium hover:bg-muted',
                        active && 'text-primary',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <ul className="mt-4 border-t border-border pt-4">
              {SECONDARY_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex min-h-11 items-center rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Drawer>
    </div>
  )
}

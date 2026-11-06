'use client'

import { Menu } from 'lucide-react'
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
    <div className="-ml-3 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Buka menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden="true" className="size-5" />
      </Button>
      <Drawer open={open} onClose={close} title="Menu" side="left">
        <nav aria-label="Menu mobile" className="px-4 pt-2 pb-6">
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
                      'flex min-h-14 items-center text-2xl font-semibold tracking-tight',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
          <ul className="mt-6">
            {SECONDARY_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Drawer>
    </div>
  )
}

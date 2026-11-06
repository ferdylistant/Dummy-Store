'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { mainNavigation } from '@/lib/site'
import { cn } from '@/lib/utils'

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav aria-label="Menu utama" className="ml-4 hidden lg:block">
      <ul className="flex items-center gap-1">
        {mainNavigation.map((item) => {
          const active = isActivePath(pathname, item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors duration-200 hover:bg-muted',
                  active ? 'text-primary' : 'text-foreground',
                )}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

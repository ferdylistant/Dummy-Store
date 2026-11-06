import { Search } from 'lucide-react'
import Form from 'next/form'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { CartButton } from '@/features/cart/cart-button'
import { FREE_SHIPPING_MIN } from '@/lib/pricing'
import { formatRupiah } from '@/lib/format'
import { siteConfig } from '@/lib/site'
import { MobileMenu } from './mobile-menu'
import { NavLinks } from './nav-links'

export function SiteHeader() {
  return (
    <>
      <p className="bg-foreground px-4 py-2 text-center text-sm text-background">
        Gratis ongkir reguler untuk belanja mulai {formatRupiah(FREE_SHIPPING_MIN)}
      </p>
      <header className="sticky top-0 z-20 border-b border-border bg-card">
        <Container className="flex h-16 items-center gap-4">
          <MobileMenu />
          <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
            {siteConfig.name}
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-2">
            <Form action="/produk" role="search" className="relative hidden md:block">
              <label htmlFor="header-search" className="sr-only">
                Cari produk
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="header-search"
                name="q"
                type="search"
                placeholder="Cari produk"
                className="h-11 w-52 rounded-lg border border-input bg-card pr-3 pl-9 text-base placeholder:text-muted-foreground xl:w-64"
              />
            </Form>
            <CartButton />
          </div>
        </Container>
      </header>
    </>
  )
}

import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { CartButton } from '@/features/cart/cart-button'
import { formatRupiah } from '@/lib/format'
import { FREE_SHIPPING_MIN } from '@/lib/pricing'
import { siteConfig } from '@/lib/site'
import { AccountButton } from './account-button'
import { Logo } from './logo'
import { MobileMenu } from './mobile-menu'
import { NavLinks } from './nav-links'
import { SearchButton } from './search-button'

export function SiteHeader() {
  return (
    <>
      <p className="bg-muted px-4 py-2 text-center text-xs text-muted-foreground">
        Gratis ongkir reguler untuk belanja mulai {formatRupiah(FREE_SHIPPING_MIN)}
      </p>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <Container className="flex h-14 items-center gap-1">
          <MobileMenu />
          <Link
            href="/"
            aria-label={`${siteConfig.name}, beranda`}
            className="flex min-h-11 shrink-0 items-center gap-2 font-semibold tracking-tight"
          >
            <Logo />
            {siteConfig.name}
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center lg:ml-0">
            <SearchButton />
            <AccountButton />
            <CartButton />
          </div>
        </Container>
      </header>
    </>
  )
}

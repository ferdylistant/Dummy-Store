import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { CartButton } from '@/features/cart/cart-button'
import type { NavItem } from '@/lib/site'
import type { StoreSettings } from '@/services/store'
import { AccountButton } from './account-button'
import { Logo } from './logo'
import { MobileMenu } from './mobile-menu'
import { NavLinks } from './nav-links'
import { SearchButton } from './search-button'

export function SiteHeader({ store, navigation }: { store: StoreSettings; navigation: NavItem[] }) {
  return (
    <>
      {store.announcement && (
        <p className="bg-muted px-4 py-2 text-center text-xs text-muted-foreground">{store.announcement}</p>
      )}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <Container className="flex h-14 items-center gap-1">
          <MobileMenu navigation={navigation} />
          <Link
            href="/"
            aria-label={`${store.name}, beranda`}
            className="flex min-h-11 shrink-0 items-center gap-2 font-semibold tracking-tight"
          >
            <Logo src={store.logoUrl} />
            {store.name}
          </Link>
          <NavLinks navigation={navigation} />
          <div className="ml-auto flex items-center lg:ml-0">
            <SearchButton navigation={navigation} />
            <AccountButton />
            <CartButton />
          </div>
        </Container>
      </header>
    </>
  )
}

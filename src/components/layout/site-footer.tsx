import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { footerNavigation, type NavItem } from '@/lib/site'
import type { StoreSettings } from '@/services/store'
import { Logo } from './logo'
import { RailTagLink } from './rail-tag-link'
import { SocialLinks } from './social-links'

export function SiteFooter({ store, navigation }: { store: StoreSettings; navigation: NavItem[] }) {
  const categoryLinks = navigation.filter((item) => item.href.startsWith('/kategori/'))
  return (
    <footer className="mt-auto overflow-hidden bg-muted">
      <Container className="pt-12 lg:pt-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 className="text-2xl font-semibold tracking-tight lg:text-3xl">Lanjut menjelajah.</h2>
          <Link href="/produk" className="group inline-flex min-h-11 items-center gap-0.5 font-medium">
            <span className="link-stitch">Semua produk</span>
            <ChevronRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
        <nav aria-label="Kategori">
          <ul className="grid grid-cols-2 lg:grid-cols-4">
            {categoryLinks.map((link) => (
              <li key={link.href} className="flex justify-center border-t-2 border-input pb-8">
                <RailTagLink href={link.href} label={link.label} />
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 pt-6 pb-10 lg:grid-cols-[2fr_1fr_1fr] lg:pt-10">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight">
            <Logo src={store.logoUrl} />
            {store.name}
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {store.tagline} untuk dipakai setiap hari.
          </p>
          <a href={`mailto:${store.email}`} className="mt-2 inline-block py-1 text-sm">
            <span className="link-stitch">{store.email}</span>
          </a>
          <SocialLinks phone={store.phone} socials={store.socials} storeName={store.name} className="mt-4" />
        </div>
        {footerNavigation
          .filter((group) => group.title !== 'Belanja')
          .map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-sm font-semibold">{group.title}</h2>
              <ul className="mt-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
      </Container>

      <Container className="text-xs text-muted-foreground">
        <p className="border-t border-dashed border-input pt-4">
          &copy; {new Date().getFullYear()} {store.name}. Semua hak dilindungi.
        </p>
      </Container>

      <p
        aria-hidden="true"
        className="mt-6 -mb-[0.2em] text-center text-[15vw] leading-none font-semibold tracking-tighter whitespace-nowrap text-zinc-600 select-none"
      >
        {store.name}
      </p>
    </footer>
  )
}

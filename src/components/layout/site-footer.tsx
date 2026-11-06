import Link from 'next/link'
import { Container } from '@/components/ui/container'
import { footerNavigation, siteConfig } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:py-16">
        <div className="col-span-2 md:col-span-3 lg:col-span-1">
          <Link href="/" className="text-lg font-bold tracking-tight">
            {siteConfig.name}
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {siteConfig.tagline} untuk dipakai setiap hari.
          </p>
          <a
            href={`mailto:${siteConfig.email}`}
            className="mt-3 inline-block py-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {siteConfig.email}
          </a>
        </div>
        {footerNavigation.map((group) => (
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
      <div className="border-t border-border">
        <Container className="py-4 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {siteConfig.name}. Semua hak dilindungi.
        </Container>
      </div>
    </footer>
  )
}

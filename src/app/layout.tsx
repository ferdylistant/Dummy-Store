import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { MotionProvider } from '@/components/motion-provider'
import { JsonLd } from '@/components/seo/json-ld'
import { CartDrawer } from '@/features/cart/cart-drawer'
import { StoreSettingsProvider } from '@/features/store/store-settings'
import { organizationJsonLd } from '@/lib/seo'
import { navigationFor, siteConfig } from '@/lib/site'
import { getNavigationCategories, getStoreSettings } from '@/services/store'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

/** The store name and tagline come from the dashboard. */
export async function generateMetadata(): Promise<Metadata> {
  const store = await getStoreSettings()
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${store.name} | ${store.tagline}`,
      template: `%s | ${store.name}`,
    },
    description: siteConfig.description,
    applicationName: store.name,
    openGraph: {
      type: 'website',
      siteName: store.name,
      locale: siteConfig.locale,
    },
    twitter: { card: 'summary_large_image' },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  }
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [store, categories] = await Promise.all([getStoreSettings(), getNavigationCategories()])
  const navigation = navigationFor(categories)

  return (
    <html lang="id" className={inter.variable}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Lewati ke konten utama
        </a>
        <JsonLd data={organizationJsonLd()} />
        <StoreSettingsProvider settings={store}>
          <MotionProvider>
            <SiteHeader store={store} navigation={navigation} />
            <main id="konten" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <SiteFooter store={store} navigation={navigation} />
            <CartDrawer />
          </MotionProvider>
        </StoreSettingsProvider>
      </body>
    </html>
  )
}

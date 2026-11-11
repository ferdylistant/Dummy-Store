import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'

/** Catalog and help pages are for search. Accounts, checkout, and the API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/akun', '/checkout', '/keranjang', '/masuk', '/daftar', '/lupa-password', '/atur-ulang-password', '/api/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  }
}

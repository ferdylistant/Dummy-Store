import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/safe-next'

/**
 * Where a signed in shopper goes instead of a page meant for guests. A reset
 * link from email stays open, because someone who forgot their password may
 * still be signed in, and changing it in Keamanan asks for the old one.
 */
function signedInDestination(pathname: string, searchParams: URLSearchParams) {
  switch (pathname) {
    case '/masuk':
    case '/daftar':
      return safeNext(searchParams.get('next'))
    case '/lupa-password':
      return '/akun/keamanan'
    case '/atur-ulang-password':
      return searchParams.has('token') ? null : '/akun/keamanan'
    default:
      return null
  }
}

/**
 * Optimistic sign in checks from the session cookie only, as Next.js advises.
 * The API still checks the session on every account request, and the pages
 * check again in the browser for when the API's cookie is on another domain.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const signedIn = Boolean(getSessionCookie(request, { cookiePrefix: 'ds' }))

  if ((pathname === '/akun' || pathname.startsWith('/akun/')) && !signedIn) {
    const url = new URL('/masuk', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // An expired cookie can outlive its session. The account page then sends
  // shoppers to sign in with sesi=habis, which must not bounce them back again.
  if (signedIn && !searchParams.has('sesi')) {
    const destination = signedInDestination(pathname, searchParams)
    if (destination) return NextResponse.redirect(new URL(destination, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/akun', '/akun/:path*', '/masuk', '/daftar', '/lupa-password', '/atur-ulang-password'],
}

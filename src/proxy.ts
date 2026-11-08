import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/safe-next'

/**
 * Optimistic sign in checks from the session cookie only, as Next.js advises.
 * The API still checks the session on every account request.
 */
export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const signedIn = Boolean(getSessionCookie(request, { cookiePrefix: 'ds' }))

  if (pathname.startsWith('/akun') && !signedIn) {
    const url = new URL('/masuk', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // An expired cookie can outlive its session. The account page then sends
  // shoppers here with sesi=habis, which must not bounce them back again.
  if ((pathname === '/masuk' || pathname === '/daftar') && signedIn && !searchParams.has('sesi')) {
    return NextResponse.redirect(new URL(safeNext(searchParams.get('next') ?? undefined), request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/akun/:path*', '/masuk', '/daftar'],
}

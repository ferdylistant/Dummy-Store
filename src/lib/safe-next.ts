const PROBE = 'http://local.invalid'

/**
 * Only paths on this site, so a crafted link cannot send shoppers elsewhere
 * after login. Browsers read "/\evil.com" and "/\t/evil.com" as "//evil.com",
 * so the path is resolved the way a browser would and must stay on this origin.
 */
export function safeNext(value: string | string[] | undefined | null, fallback = '/akun') {
  const next = Array.isArray(value) ? value[0] : value
  if (!next || !next.startsWith('/') || next.includes('\\')) return fallback
  try {
    const url = new URL(next, PROBE)
    if (url.origin !== PROBE) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}

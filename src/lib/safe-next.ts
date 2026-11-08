/** Only same-site paths, so a crafted link cannot send shoppers elsewhere after login. */
export function safeNext(value: string | string[] | undefined, fallback = '/akun') {
  const next = Array.isArray(value) ? value[0] : value
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}

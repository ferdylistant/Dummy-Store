import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** The admin dashboard. Development runs it on port 3001. */
const adminUrl = (process.env.ADMIN_URL ?? (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001')).replace(/\/$/, '')

// The store, plus the dashboard so it can call the API and sign in.
const corsOrigins = [
  ...new Set(
    [...(process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','), adminUrl]
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
]

const port = Number(process.env.PORT ?? 4000)
/**
 * A postgres:// URL (Neon in production), or a folder for PGlite in
 * development. Nothing needs installing for the folder.
 */
const databaseUrl = process.env.DATABASE_URL?.trim() || 'data/pglite'

/**
 * Sessions are signed with this secret. Production must set it. In
 * development one is created once and kept next to the database, so logins
 * survive restarts.
 */
function authSecret() {
  const fromEnv = process.env.BETTER_AUTH_SECRET?.trim()
  if (fromEnv) return fromEnv
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET wajib diisi di production.')
  }
  const file = join('data', '.auth-secret')
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  mkdirSync(dirname(file), { recursive: true })
  const secret = randomBytes(32).toString('hex')
  writeFileSync(file, secret)
  return secret
}

export const config = {
  port,
  databaseUrl,
  /**
   * The dashboard account. Development uses admin@example.com with "password".
   * Production creates one only when both are set.
   */
  admin:
    process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
      ? { email: process.env.ADMIN_EMAIL.trim(), password: process.env.ADMIN_PASSWORD }
      : process.env.NODE_ENV === 'production'
        ? null
        : { email: 'admin@example.com', password: 'password' },
  corsOrigins,
  adminUrl,
  /** Where the store clears its cache after dashboard changes, and the secret it expects. */
  revalidate: (() => {
    const secret =
      process.env.STORE_REVALIDATE_SECRET?.trim() || (process.env.NODE_ENV === 'production' ? '' : 'dev-revalidate-secret')
    const site = (process.env.SITE_URL ?? corsOrigins[0] ?? 'http://localhost:3000').replace(/\/$/, '')
    return secret ? { url: `${site}/api/revalidate`, secret } : null
  })(),
  /** Proxy hops in front of the API, such as 1 behind a load balancer. */
  trustProxy: Number(process.env.TRUST_PROXY ?? 0) || 0,
  apiUrl: (process.env.API_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),
  siteUrl: (process.env.SITE_URL ?? corsOrigins[0] ?? 'http://localhost:3000').replace(/\/$/, ''),
  authSecret: authSecret(),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '',
  },
  mail: {
    resendApiKey: process.env.RESEND_API_KEY?.trim() ?? '',
    from: process.env.MAIL_FROM?.trim() || 'Dummy Store <onboarding@resend.dev>',
  },
  biteship: {
    apiKey: process.env.BITESHIP_API_KEY?.trim() ?? '',
  },
  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY?.trim() ?? '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY?.trim() ?? '',
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  },
}

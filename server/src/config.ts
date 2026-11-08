import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

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
  corsOrigins,
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

import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { sql } from 'kysely'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { sep } from 'node:path'
import { getMigrations } from 'better-auth/db/migration'
import { fromNodeHeaders } from 'better-auth/node'
import type { IncomingHttpHeaders } from 'node:http'
import type { Database } from './db/index.js'
import { actionEmail, type Mailer } from './mail.js'

export interface AuthOptions {
  baseURL: string
  secret: string
  trustedOrigins: string[]
  mailer: Mailer
  google?: { clientId: string; clientSecret: string }
  /** Off in tests that make many requests in a row. */
  rateLimit?: boolean
  /**
   * "admin" is the dashboard's own sign in: /api/admin-auth with "dsa" cookies,
   * so it never shares a session with the store. Only admins get a session
   * there, and nobody can sign up.
   */
  scope?: 'store' | 'admin'
}

export const AUTH_PATHS = { store: '/api/auth', admin: '/api/admin-auth' } as const
const COOKIE_PREFIX = { store: 'ds', admin: 'dsa' } as const

export function createAuth(db: Database, options: AuthOptions) {
  const scope = options.scope ?? 'store'
  const admin = scope === 'admin'
  return betterAuth({
    appName: 'Dummy Store',
    // The same Kysely instance as the store, so one database holds everything.
    database: { db, type: 'postgres' },
    baseURL: options.baseURL,
    basePath: AUTH_PATHS[scope],
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: admin,
      requireEmailVerification: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, url }) {
        await options.mailer.send(
          actionEmail({
            to: user.email,
            subject: 'Atur ulang password',
            greeting: `Halo ${user.name},`,
            body: 'Kami menerima permintaan untuk mengatur ulang password akun Anda.',
            action: 'Atur Ulang Password',
            url,
            footnote: 'Tautan ini berlaku 1 jam. Abaikan email ini jika Anda tidak memintanya.',
          }),
        )
      },
    },
    emailVerification: {
      sendOnSignUp: !admin,
      sendOnSignIn: !admin,
      autoSignInAfterVerification: true,
      expiresIn: 24 * 60 * 60,
      async sendVerificationEmail({ user, url }) {
        await options.mailer.send(
          actionEmail({
            to: user.email,
            subject: 'Konfirmasi email Anda',
            greeting: `Halo ${user.name},`,
            body: 'Terima kasih sudah mendaftar. Konfirmasi email Anda untuk mengaktifkan akun.',
            action: 'Konfirmasi Email',
            url,
            footnote: 'Tautan ini berlaku 24 jam. Abaikan email ini jika Anda tidak mendaftar.',
          }),
        )
      },
    },
    socialProviders: options.google && !admin
      ? { google: { ...options.google, prompt: 'select_account' } }
      : undefined,
    account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },
    user: {
      additionalFields: {
        // "admin" opens the dashboard. Nobody can set it through sign up or profile updates.
        role: { type: 'string', required: false, defaultValue: 'customer', input: false },
      },
    },
    rateLimit: { enabled: options.rateLimit ?? true, window: 60, max: 30 },
    advanced: { cookiePrefix: COOKIE_PREFIX[scope] },
    databaseHooks: admin
      ? {
          session: {
            create: {
              // The dashboard refuses shoppers before any session exists.
              async before(session) {
                const { rows } = await sql<{ role: string | null }>`SELECT role FROM "user" WHERE id = ${session.userId}`.execute(db)
                if (rows[0]?.role !== ADMIN_ROLE) {
                  throw new APIError('FORBIDDEN', { code: 'NOT_ADMIN', message: 'Akun ini bukan admin.' })
                }
              },
            },
          },
        }
      : undefined,
  })
}

export type Auth = ReturnType<typeof createAuth>

/** The installed Better Auth version, read from its package folder. Null when it cannot be found. */
function authVersion() {
  try {
    const entry = createRequire(import.meta.url).resolve('better-auth')
    const marker = `${sep}node_modules${sep}better-auth${sep}`
    const root = entry.slice(0, entry.lastIndexOf(marker) + marker.length)
    return (JSON.parse(readFileSync(root + 'package.json', 'utf8')) as { version: string }).version
  } catch {
    return null
  }
}

/**
 * Creates or updates the user, session, account, and verification tables.
 * Checking the schema takes many queries, which made every cold start on
 * Vercel slow. With the database it remembers which Better Auth version and
 * fields it last prepared, and skips the check while they match.
 */
export async function migrateAuth(auth: Auth, db?: Database) {
  const version = authVersion()
  const signature = version ? `${version}:${Object.keys(auth.options.user?.additionalFields ?? {}).sort().join(',')}` : null
  if (db && signature) {
    const { rows } = await sql<{ value: unknown }>`SELECT value FROM settings WHERE key = '__auth_schema'`.execute(db)
    if (rows[0]?.value === signature) return
  }
  const { runMigrations } = await getMigrations(auth.options)
  await runMigrations()
  if (db && signature) {
    await sql`INSERT INTO settings (key, value, updated_at) VALUES ('__auth_schema', ${JSON.stringify(signature)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`.execute(db)
  }
}

export async function sessionUser(auth: Auth, headers: IncomingHttpHeaders) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) })
  return session?.user ?? null
}

export const ADMIN_ROLE = 'admin'

export async function sessionAdmin(auth: Auth, headers: IncomingHttpHeaders) {
  const user = await sessionUser(auth, headers)
  return user && (user as { role?: string }).role === ADMIN_ROLE ? user : null
}

/**
 * Makes sure an admin account exists. In development it is admin@example.com
 * with the password "password". Production only creates one when
 * ADMIN_EMAIL and ADMIN_PASSWORD are set, so no known password ships.
 */
export async function ensureAdmin(auth: Auth, account: { email: string; password: string; name?: string }) {
  try {
    return await createAdmin(auth, account)
  } catch (error) {
    // Two functions starting at once may both try to create the admin. The loser finds it made.
    const context = await auth.$context
    const existing = await context.internalAdapter.findUserByEmail(account.email)
    if (existing) return { created: false, id: existing.user.id }
    throw error
  }
}

async function createAdmin(auth: Auth, account: { email: string; password: string; name?: string }) {
  const context = await auth.$context
  const existing = await context.internalAdapter.findUserByEmail(account.email)
  if (existing) {
    if ((existing.user as { role?: string }).role !== ADMIN_ROLE) {
      await context.internalAdapter.updateUser(existing.user.id, { role: ADMIN_ROLE })
    }
    return { created: false, id: existing.user.id }
  }
  const user = await context.internalAdapter.createUser({
    email: account.email,
    name: account.name ?? 'Admin',
    emailVerified: true,
    role: ADMIN_ROLE,
  }, { method: 'admin' })
  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await context.password.hash(account.password),
  })
  return { created: true, id: user.id }
}

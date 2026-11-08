import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { sql } from 'kysely'
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

/** Creates or updates the user, session, account, and verification tables. */
export async function migrateAuth(auth: Auth) {
  const { runMigrations } = await getMigrations(auth.options)
  await runMigrations()
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

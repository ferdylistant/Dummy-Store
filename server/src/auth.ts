import { betterAuth } from 'better-auth'
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
}

export function createAuth(db: Database, options: AuthOptions) {
  return betterAuth({
    appName: 'Dummy Store',
    database: db,
    baseURL: options.baseURL,
    basePath: '/api/auth',
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    emailAndPassword: {
      enabled: true,
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
      sendOnSignUp: true,
      sendOnSignIn: true,
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
    socialProviders: options.google
      ? { google: { ...options.google, prompt: 'select_account' } }
      : undefined,
    account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },
    rateLimit: { enabled: options.rateLimit ?? true, window: 60, max: 30 },
    advanced: { cookiePrefix: 'ds' },
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

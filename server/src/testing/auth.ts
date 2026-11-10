import { sql } from 'kysely'
import { createAuth, migrateAuth } from '../auth.js'
import type { Database } from '../db/index.js'
import type { Email } from '../mail.js'

export const TEST_ORIGIN = 'http://localhost:3000'

/** Real Better Auth on the given database. Emails are kept in memory to read links. */
export async function testAuth(db: Database, baseURL = 'http://127.0.0.1', origins = [TEST_ORIGIN]) {
  const mails: Email[] = []
  const auth = createAuth(db, {
    baseURL,
    secret: 'test-secret-that-is-long-enough-for-hmac-0123456789',
    trustedOrigins: origins,
    mailer: { send: async (email) => void mails.push(email) },
    rateLimit: false,
  })
  await migrateAuth(auth)
  const adminAuth = createAuth(db, {
    baseURL,
    secret: 'test-secret-that-is-long-enough-for-hmac-0123456789',
    trustedOrigins: origins,
    mailer: { send: async (email) => void mails.push(email) },
    rateLimit: false,
    scope: 'admin',
  })
  return { auth, adminAuth, mails }
}

/**
 * A verified shopper, signed up and signed in over HTTP. Returns the store
 * session cookie, since ordering needs an account.
 */
export async function shopperCookie(db: Database, base: string, email = 'budi@example.com', origin = TEST_ORIGIN) {
  const headers = { Origin: origin, 'Content-Type': 'application/json' }
  const password = 'rahasia-panjang-123'
  await fetch(`${base}/api/auth/sign-up/email`, { method: 'POST', headers, body: JSON.stringify({ name: 'Budi Santoso', email, password }) })
  await sql`UPDATE "user" SET "emailVerified" = true WHERE email = ${email}`.execute(db)
  const response = await fetch(`${base}/api/auth/sign-in/email`, { method: 'POST', headers, body: JSON.stringify({ email, password }) })
  if (!response.ok) throw new Error(`shopper sign in failed: ${response.status}`)
  return response.headers.getSetCookie().map((line) => line.split(';')[0]).join('; ')
}

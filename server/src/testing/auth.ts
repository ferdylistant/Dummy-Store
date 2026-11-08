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
  return { auth, mails }
}

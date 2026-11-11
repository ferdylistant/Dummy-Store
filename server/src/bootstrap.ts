import { createApp } from './app.js'
import { createAuth, ensureAdmin, migrateAuth } from './auth.js'
import { config } from './config.js'
import { openDatabase } from './db/index.js'
import { createMailer } from './mail.js'
import { createMidtransGateway } from './payments/midtrans.js'
import { createBiteshipRegions } from './regions.js'
import { createBiteshipRates } from './shipping.js'
import { storeRevalidator } from './revalidate.js'

/**
 * Opens the database, prepares sign in, and builds the Express app. The
 * local server (index.ts) and the Vercel function (api/index.js) both start
 * from here, so they behave the same.
 */
export async function bootstrap() {
  const db = await openDatabase(config.databaseUrl)
  const { serverKey, clientKey, isProduction } = config.midtrans

  const payments = serverKey && clientKey ? createMidtransGateway({ serverKey, clientKey, isProduction }) : null
  if (!payments) {
    console.warn('MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY belum diisi. Checkout akan ditolak.')
  } else if (isProduction === serverKey.startsWith('SB-')) {
    console.warn('Mode Midtrans tidak cocok dengan kuncinya. Kunci sandbox diawali SB-.')
  }

  const google = config.google.clientId && config.google.clientSecret ? config.google : undefined
  const mailer = createMailer(config.mail)
  const auth = createAuth(db, {
    baseURL: config.storeAuthUrl,
    secret: config.authSecret,
    trustedOrigins: config.corsOrigins,
    mailer,
    google,
  })
  await migrateAuth(auth, db)
  // Same accounts, separate sessions: the dashboard signs in on /api/admin-auth.
  const adminAuth = createAuth(db, {
    baseURL: config.adminAuthUrl,
    secret: config.authSecret,
    trustedOrigins: config.adminUrl ? [config.adminUrl] : [],
    mailer,
    scope: 'admin',
  })

  if (config.admin) {
    const admin = await ensureAdmin(auth, config.admin)
    if (admin.created) console.log(`Akun admin dibuat: ${config.admin.email}`)
  }

  // The old SQLite file only exists on a developer's machine.
  if (process.env.NODE_ENV !== 'production') {
    const { importLegacySqlite } = await import('./db/import-sqlite.js')
    const imported = await importLegacySqlite(db)
    if (imported) console.log('Data lama dari data/store.db dipindahkan ke PostgreSQL:', imported)
  }

  if (!config.mail.resendApiKey) console.warn('RESEND_API_KEY belum diisi. Email ditampilkan di log ini.')
  const regions = config.biteship.apiKey ? createBiteshipRegions(config.biteship.apiKey) : null
  const shippingRates = config.biteship.apiKey ? createBiteshipRates(config.biteship.apiKey, config.biteship.couriers) : null
  if (!shippingRates) console.warn('BITESHIP_API_KEY belum diisi. Ongkir memakai tarif tetap dari dashboard.')

  const app = createApp(db, {
    corsOrigins: config.corsOrigins,
    siteUrl: config.siteUrl,
    payments,
    auth,
    adminAuth,
    regions,
    shippingRates,
    google: Boolean(google),
    trustProxy: config.trustProxy,
    publicUrl: config.apiUrl,
    onStoreChange: storeRevalidator(config.revalidate),
    cronSecret: config.cronSecret,
  })

  return { app, db, payments, isProduction }
}

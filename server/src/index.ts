import { createApp } from './app.js'
import { createAuth, migrateAuth } from './auth.js'
import { config } from './config.js'
import { importLegacySqlite } from './db/import-sqlite.js'
import { openDatabase } from './db/index.js'
import { createMailer } from './mail.js'
import { expireOverdueOrders } from './orders.js'
import { createMidtransGateway } from './payments/midtrans.js'
import { createBiteshipRegions } from './regions.js'

const SWEEP_MS = 5 * 60_000

const db = await openDatabase(config.databaseUrl)
const { serverKey, clientKey, isProduction } = config.midtrans

const payments =
  serverKey && clientKey ? createMidtransGateway({ serverKey, clientKey, isProduction }) : null

if (!payments) {
  console.warn('MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY belum diisi. Checkout akan ditolak.')
} else if (isProduction === serverKey.startsWith('SB-')) {
  console.warn('Mode Midtrans tidak cocok dengan kuncinya. Kunci sandbox diawali SB-.')
}

const google = config.google.clientId && config.google.clientSecret ? config.google : undefined
const auth = createAuth(db, {
  baseURL: config.apiUrl,
  secret: config.authSecret,
  trustedOrigins: config.corsOrigins,
  mailer: createMailer(config.mail),
  google,
})
await migrateAuth(auth)

const imported = await importLegacySqlite(db)
if (imported) console.log('Data lama dari data/store.db dipindahkan ke PostgreSQL:', imported)

if (!config.mail.resendApiKey) console.warn('RESEND_API_KEY belum diisi. Email ditampilkan di log ini.')
const regions = config.biteship.apiKey ? createBiteshipRegions(config.biteship.apiKey) : null

const app = createApp(db, {
  corsOrigins: config.corsOrigins,
  siteUrl: config.siteUrl,
  payments,
  auth,
  regions,
  google: Boolean(google),
  trustProxy: config.trustProxy,
})

const server = app.listen(config.port, () => {
  console.log(
    `API berjalan di http://localhost:${config.port} (Midtrans ${
      payments ? (isProduction ? 'production' : 'sandbox') : 'belum aktif'
    })`,
  )
})

const sweeper = setInterval(() => {
  expireOverdueOrders(db, payments).catch((error) => console.error('Expiry sweep failed', error))
}, SWEEP_MS)
sweeper.unref()

function shutdown() {
  clearInterval(sweeper)
  server.close(() => {
    db.destroy().finally(() => process.exit(0))
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

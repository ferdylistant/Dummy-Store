import { createApp } from './app.js'
import { config } from './config.js'
import { openDatabase } from './db/index.js'
import { expireOverdueOrders } from './orders.js'
import { createMidtransGateway } from './payments/midtrans.js'

const SWEEP_MS = 5 * 60_000

const db = openDatabase(config.databasePath)
const { serverKey, clientKey, isProduction } = config.midtrans

const payments =
  serverKey && clientKey ? createMidtransGateway({ serverKey, clientKey, isProduction }) : null

if (!payments) {
  console.warn('MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY belum diisi. Checkout akan ditolak.')
} else if (isProduction === serverKey.startsWith('SB-')) {
  console.warn('Mode Midtrans tidak cocok dengan kuncinya. Kunci sandbox diawali SB-.')
}

const app = createApp(db, { corsOrigins: config.corsOrigins, siteUrl: config.siteUrl, payments })

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
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

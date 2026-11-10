// The API as a long running server, for development and for hosts with one.
// On Vercel, api/index.js serves the same app as a function instead.
import { bootstrap } from './bootstrap.js'
import { config } from './config.js'
import { expireOverdueOrders } from './orders.js'

const SWEEP_MS = 5 * 60_000

const { app, db, payments, isProduction } = await bootstrap()

const server = app.listen(config.port, () => {
  console.log(
    `API berjalan di http://localhost:${config.port} (Midtrans ${
      payments ? (isProduction ? 'production' : 'sandbox') : 'belum aktif'
    })`,
  )
})

// A server that keeps running can sweep on a timer. Vercel uses a cron job.
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

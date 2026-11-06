import { createApp } from './app.js'
import { config } from './config.js'
import { openDatabase } from './db/index.js'

const db = openDatabase(config.databasePath)
const app = createApp(db, { corsOrigins: config.corsOrigins })

const server = app.listen(config.port, () => {
  console.log(`API berjalan di http://localhost:${config.port}`)
})

function shutdown() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

import { rmSync } from 'node:fs'
import { config } from '../config.js'
import { openDatabase } from './index.js'

// Only a local PGlite folder is wiped. A PostgreSQL server is never dropped from here.
if (/^postgres(ql)?:\/\//.test(config.databaseUrl)) {
  console.error('db:reset hanya untuk database lokal (PGlite). Kosongkan database server secara manual.')
  process.exit(1)
}

rmSync(config.databaseUrl, { recursive: true, force: true })
const db = await openDatabase(config.databaseUrl)
await db.destroy()
console.log(`Database dibuat ulang: ${config.databaseUrl}`)

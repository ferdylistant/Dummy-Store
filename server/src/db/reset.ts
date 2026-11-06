import { rmSync } from 'node:fs'
import { config } from '../config.js'
import { openDatabase } from './index.js'

for (const suffix of ['', '-wal', '-shm']) {
  rmSync(`${config.databasePath}${suffix}`, { force: true })
}

openDatabase(config.databasePath).close()
console.log(`Database dibuat ulang: ${config.databasePath}`)

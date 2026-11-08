/**
 * Builds resources/regions.tsv.gz from the open Kepmendagri datasets by
 * cahya dsn (MIT). Run with `npm run regions:build -w server` to update.
 * The commits are pinned so the same data is produced every time.
 */
import { writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const REGIONS_URL =
  'https://raw.githubusercontent.com/cahyadsn/wilayah/a985ff702ac1d7741f5298efe9cff57398c03a44/db/wilayah.sql'
const POSTAL_URL =
  'https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/ba8497156c5cc9bcbfc527f7b8875d403eda2354/db/wilayah_kodepos.sql'

async function download(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  return response.text()
}

const [regionsSql, postalSql] = await Promise.all([download(REGIONS_URL), download(POSTAL_URL)])

const postal = new Map(
  [...postalSql.matchAll(/\('([0-9.]+)',\s*'([0-9]{5})'\)/g)].map((match) => [match[1], match[2]]),
)
const rows = [...regionsSql.matchAll(/\('([0-9.]+)',\s*'((?:[^']|'')*)'\)/g)].map((match) => ({
  code: match[1],
  name: match[2].replace(/''/g, "'").trim(),
}))

const levels = [0, 0, 0, 0]
const lines: string[] = []
for (const row of rows) {
  const level = row.code.split('.').length
  if (level < 1 || level > 4) continue
  levels[level - 1]++
  const code = level === 4 ? postal.get(row.code) : ''
  if (level === 4 && !code) throw new Error(`No postal code for ${row.code} ${row.name}`)
  if (/[\t\n]/.test(row.name)) throw new Error(`Unexpected character in ${row.code}`)
  lines.push(`${row.code}\t${row.name}\t${code ?? ''}`)
}

const target = new URL('../resources/regions.tsv.gz', import.meta.url)
writeFileSync(target, gzipSync(lines.join('\n'), { level: 9 }))
console.log(
  `regions.tsv.gz: ${levels[0]} provinsi, ${levels[1]} kota/kabupaten, ${levels[2]} kecamatan, ${levels[3]} desa/kelurahan`,
)

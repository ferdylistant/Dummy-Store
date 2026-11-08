import { existsSync, renameSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { sql } from 'kysely'
import type { Database } from './index.js'

type Row = Record<string, unknown>

const date = (value: unknown) => (value === null || value === undefined || value === '' ? null : new Date(String(value)))
const flag = (value: unknown) => value === 1 || value === true || value === '1'

/**
 * Moves accounts, addresses, and orders from the SQLite file used before
 * PostgreSQL. Runs once at startup, only while the new database has no
 * users, and renames the old file afterwards so it never runs again.
 */
export async function importLegacySqlite(db: Database, path = 'data/store.db') {
  if (process.env.NODE_ENV === 'production' || !existsSync(path)) return null
  const hasUsers = await sql<{ id: string }>`SELECT id FROM "user" LIMIT 1`.execute(db)
  if (hasUsers.rows.length) return null

  const old = new DatabaseSync(path, { readOnly: true })
  const read = (table: string) => {
    try {
      return old.prepare(`SELECT * FROM "${table}"`).all() as Row[]
    } catch {
      return []
    }
  }
  const counts: Record<string, number> = {}

  await db.transaction().execute(async (trx) => {
    for (const row of read('user')) {
      await sql`INSERT INTO "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
        VALUES (${row.id}, ${row.name}, ${row.email}, ${flag(row.emailVerified)}, ${row.image ?? null},
          ${date(row.createdAt)}, ${date(row.updatedAt)})`.execute(trx)
      counts.user = (counts.user ?? 0) + 1
    }
    for (const row of read('account')) {
      await sql`INSERT INTO account (id, "accountId", "providerId", "userId", "accessToken", "refreshToken",
          "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt")
        VALUES (${row.id}, ${row.accountId}, ${row.providerId}, ${row.userId}, ${row.accessToken ?? null},
          ${row.refreshToken ?? null}, ${row.idToken ?? null}, ${date(row.accessTokenExpiresAt)},
          ${date(row.refreshTokenExpiresAt)}, ${row.scope ?? null}, ${row.password ?? null},
          ${date(row.createdAt)}, ${date(row.updatedAt)})`.execute(trx)
      counts.account = (counts.account ?? 0) + 1
    }
    for (const row of read('session')) {
      if (date(row.expiresAt)! < new Date()) continue
      await sql`INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
        VALUES (${row.id}, ${date(row.expiresAt)}, ${row.token}, ${date(row.createdAt)}, ${date(row.updatedAt)},
          ${row.ipAddress ?? null}, ${row.userAgent ?? null}, ${row.userId})`.execute(trx)
      counts.session = (counts.session ?? 0) + 1
    }
    for (const row of read('addresses')) {
      await trx
        .insertInto('addresses')
        .values({
          id: Number(row.id),
          user_id: String(row.user_id),
          label: String(row.label),
          recipient: String(row.recipient),
          phone: String(row.phone),
          address: String(row.address),
          district: String(row.district),
          city: String(row.city),
          province: String(row.province),
          village: (row.village as string | null) ?? null,
          postal_code: String(row.postal_code),
          region_code: (row.region_code as string | null) ?? null,
          is_default: flag(row.is_default),
          created_at: date(row.created_at) ?? new Date(),
        })
        .execute()
      counts.addresses = (counts.addresses ?? 0) + 1
    }
    for (const row of read('user_preferences')) {
      await trx
        .insertInto('user_preferences')
        .values({ user_id: String(row.user_id), order_updates: flag(row.order_updates), promotions: flag(row.promotions) })
        .execute()
    }
    for (const row of read('orders')) {
      await trx
        .insertInto('orders')
        .values({
          id: Number(row.id),
          order_number: String(row.order_number),
          idempotency_key: (row.idempotency_key as string | null) ?? null,
          user_id: (row.user_id as string | null) ?? null,
          status: String(row.status),
          email: String(row.email),
          full_name: String(row.full_name),
          phone: String(row.phone),
          address: String(row.address),
          district: String(row.district ?? ''),
          city: String(row.city),
          province: String(row.province),
          village: (row.village as string | null) ?? null,
          postal_code: String(row.postal_code),
          region_code: (row.region_code as string | null) ?? null,
          notes: (row.notes as string | null) ?? null,
          shipping_method: String(row.shipping_method),
          payment_method: String(row.payment_method),
          subtotal: Number(row.subtotal),
          shipping_cost: Number(row.shipping_cost),
          total: Number(row.total),
          payment_details: (row.payment_details as string | null) ?? null,
          paid_at: date(row.paid_at),
          expires_at: date(row.expires_at),
          created_at: date(row.created_at) ?? new Date(),
        })
        .execute()
      counts.orders = (counts.orders ?? 0) + 1
    }
    const items = read('order_items')
    if (items.length) {
      await trx
        .insertInto('order_items')
        .values(
          items.map((row) => ({
            order_id: Number(row.order_id),
            product_id: String(row.product_id),
            product_name: String(row.product_name),
            color: String(row.color),
            size: String(row.size),
            quantity: Number(row.quantity),
            unit_price: Number(row.unit_price),
            line_total: Number(row.line_total),
          })),
        )
        .execute()
      counts.order_items = items.length
    }
    // Ids were kept, so new rows must continue after the highest one.
    for (const table of ['orders', 'addresses'] as const) {
      await sql`SELECT setval(pg_get_serial_sequence(${table}, 'id'), COALESCE((SELECT max(id) FROM ${sql.table(table)}), 0) + 1, false)`.execute(trx)
    }
  })

  old.close()
  renameSync(path, `${path}.imported`)
  return counts
}

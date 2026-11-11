import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { sql } from 'kysely'
import { testAuth } from '../testing/auth.js'
import { MIGRATIONS, openDatabase, type Database } from './index.js'

describe('migration 006: orders without an account', () => {
  let db: Database
  const stock = async () =>
    (await db.selectFrom('variants').select('stock').where('product_id', '=', 'p019').executeTakeFirstOrThrow()).stock

  before(async () => {
    db = await openDatabase(':memory:')
    await testAuth(db)
    await sql`INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES ('u1', 'Sari', 'sari@example.com', true, now(), now())`.execute(db)
  })

  after(async () => {
    await db.destroy()
  })

  async function place(number: string, userId: string | null, status: string, quantity: number) {
    const base = {
      email: 'sari@example.com', full_name: 'Sari', phone: '081234567890', address: 'Jalan Kenanga 5', district: 'Coblong',
      city: 'Kota Bandung', province: 'Jawa Barat', postal_code: '40132', shipping_method: 'reguler', payment_method: 'bca_va',
      subtotal: 79_000 * quantity, shipping_cost: 0, total: 79_000 * quantity, expires_at: new Date(Date.now() + 86_400_000),
    }
    const { id } = await db.insertInto('orders').values({ ...base, order_number: number, user_id: userId, status }).returning('id').executeTakeFirstOrThrow()
    await db.insertInto('order_items').values({ order_id: id, product_id: 'p019', product_name: 'Mug', color: 'Putih Tulang', size: 'Satu ukuran', quantity, unit_price: 79_000, line_total: 79_000 * quantity }).execute()
    // An unpaid order holds its stock, as checkout does.
    if (status === 'awaiting_payment') await sql`UPDATE variants SET stock = stock - ${quantity} WHERE product_id = 'p019'`.execute(db)
  }

  it('removes guest orders, returns the stock unpaid ones held, and keeps account orders', async () => {
    const start = await stock()
    await place('DS-GUEST00001', null, 'awaiting_payment', 2)
    await place('DS-GUEST00002', null, 'paid', 1)
    await place('DS-MINE000001', 'u1', 'awaiting_payment', 1)
    assert.equal(await stock(), start - 3)

    await MIGRATIONS['006_remove_guest_orders']!.up(db)

    const left = await db.selectFrom('orders').select('order_number').execute()
    assert.deepEqual(left.map((row) => row.order_number), ['DS-MINE000001'])
    const items = await db.selectFrom('order_items').select('order_id').execute()
    assert.equal(items.length, 1, 'their items are gone too')
    assert.equal(await stock(), start - 1, 'the guest hold is returned, the account hold stays')
  })
})

describe('database addresses', () => {
  it('migrates over the direct Neon address, not the pooled one', async () => {
    const { directDatabaseUrl } = await import('./index.js')
    assert.equal(
      directDatabaseUrl('postgresql://u:p@ep-red-glitter-123-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'),
      'postgresql://u:p@ep-red-glitter-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    )
    assert.equal(directDatabaseUrl('postgres://u:p@db.example.com:5432/shop'), 'postgres://u:p@db.example.com:5432/shop')
    assert.equal(directDatabaseUrl('data/pglite'), 'data/pglite')
  })

  it('opens an up to date database without running the migrator again', async () => {
    const { mkdtempSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const folder = mkdtempSync(join(tmpdir(), 'ds-db-'))
    const first = await openDatabase(folder)
    await first.destroy()
    // A lock table row would show the migrator ran. Dropping the table makes a second run fail loudly.
    const second = await openDatabase(folder)
    const done = await second.selectFrom('kysely_migration' as never).select('name' as never).execute()
    assert.equal(done.length, Object.keys(MIGRATIONS).length)
    await second.destroy()
  })
})

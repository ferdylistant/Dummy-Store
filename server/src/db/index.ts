import { mkdirSync, readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { Kysely, PostgresDialect, sql, type ColumnType, type Dialect, type Generated } from 'kysely'
import { Migrator, type Migration } from 'kysely/migration'
import { categories, ESTIMATED_GRAMS, products } from './seed-data.js'

/** Stored as timestamptz. Read back as a Date, written as a Date or ISO string. */
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>
/** JSON values are written as text and read back parsed. */
type Json<T> = ColumnType<T, string, string>

export interface Schema {
  categories: {
    slug: string
    name: string
    description: string
    intro: string
    art: string
    art_color: string
    position: number
    /** The product pictured on this category's tile on the home page. */
    cover_product_id: string | null
  }
  products: {
    id: string
    slug: string
    name: string
    category: string
    art: string
    rail_kind: string | null
    price: number
    compare_at_price: number | null
    description: string
    details: Json<string[]>
    material: string
    colors: Json<{ name: string; hex: string }[]>
    sizes: Json<string[]>
    is_new: boolean
    featured: boolean
    image: string | null
    position: number
    /** For shipping rates. */
    weight_grams: Generated<number>
    /** Hidden from the store. Products that were ordered are archived instead of deleted. */
    is_active: Generated<boolean>
    /** A cut-out picture for the hanging rail. Without one, the rail draws the garment. */
    rail_media_id: string | null
    /** Back of the rail cut-out, shown when the piece turns around. */
    rail_back_media_id: string | null
    /** Side-on cut-out, shown while the piece rests on the rail. */
    rail_side_media_id: string | null
    /** The rail photos already show a hanger, so the rail draws none. */
    rail_has_hanger: Generated<boolean>
    created_at: Timestamp
    updated_at: Timestamp
  }
  media: {
    id: string
    mime: string
    width: number
    height: number
    bytes: number
    data: Uint8Array
    created_at: Timestamp
  }
  product_images: {
    product_id: string
    media_id: string
    position: number
    alt: string
  }
  settings: {
    key: string
    value: Json<unknown>
    updated_at: Timestamp
  }
  variants: {
    product_id: string
    color: string
    size: string
    stock: number
  }
  orders: {
    id: Generated<number>
    order_number: string
    idempotency_key: string | null
    user_id: string | null
    status: Generated<string>
    email: string
    full_name: string
    phone: string
    address: string
    district: string
    city: string
    province: string
    village: string | null
    postal_code: string
    region_code: string | null
    notes: string | null
    shipping_method: string
    payment_method: string
    subtotal: number
    shipping_cost: number
    total: number
    payment_details: Json<unknown> | null
    paid_at: Timestamp | null
    expires_at: Timestamp | null
    /** unfulfilled, packed, shipped, delivered. Payment status lives in status. */
    fulfillment_status: Generated<string>
    courier: string | null
    tracking_number: string | null
    shipped_at: Timestamp | null
    created_at: Timestamp
  }
  order_items: {
    order_id: number
    product_id: string
    product_name: string
    color: string
    size: string
    quantity: number
    unit_price: number
    line_total: number
  }
  addresses: {
    id: Generated<number>
    user_id: string
    label: string
    recipient: string
    phone: string
    address: string
    district: string
    city: string
    province: string
    village: string | null
    postal_code: string
    region_code: string | null
    is_default: Generated<boolean>
    created_at: Timestamp
  }
  user_preferences: {
    user_id: string
    order_updates: Generated<boolean>
    promotions: Generated<boolean>
  }
  regions: {
    code: string
    name: string
    level: number
    parent: string | null
    postal_code: string | null
  }
}

export type Database = Kysely<Schema>

const DEFAULT_STOCK = 25

/**
 * Each migration runs once, in name order, and is recorded in the database.
 * Add a new entry for every change. Never edit one that has shipped.
 */
export const MIGRATIONS: Record<string, Migration> = {
  '001_initial': {
    async up(db) {
      for (const statement of [
        sql`CREATE TABLE categories (
          slug text PRIMARY KEY,
          name text NOT NULL,
          description text NOT NULL,
          intro text NOT NULL,
          art text NOT NULL,
          art_color text NOT NULL,
          position integer NOT NULL
        )`,
        sql`CREATE TABLE products (
          id text PRIMARY KEY,
          slug text NOT NULL UNIQUE,
          name text NOT NULL,
          category text NOT NULL REFERENCES categories (slug),
          art text NOT NULL,
          rail_kind text,
          price integer NOT NULL CHECK (price >= 0),
          compare_at_price integer,
          description text NOT NULL,
          details jsonb NOT NULL,
          material text NOT NULL,
          colors jsonb NOT NULL,
          sizes jsonb NOT NULL,
          is_new boolean NOT NULL DEFAULT false,
          featured boolean NOT NULL DEFAULT false,
          image text,
          position integer NOT NULL
        )`,
        sql`CREATE TABLE variants (
          product_id text NOT NULL REFERENCES products (id) ON DELETE CASCADE,
          color text NOT NULL,
          size text NOT NULL,
          stock integer NOT NULL CHECK (stock >= 0),
          PRIMARY KEY (product_id, color, size)
        )`,
        sql`CREATE TABLE orders (
          id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          order_number text NOT NULL UNIQUE,
          idempotency_key text UNIQUE,
          user_id text,
          status text NOT NULL DEFAULT 'awaiting_payment',
          email text NOT NULL,
          full_name text NOT NULL,
          phone text NOT NULL,
          address text NOT NULL,
          district text NOT NULL,
          city text NOT NULL,
          province text NOT NULL,
          village text,
          postal_code text NOT NULL,
          region_code text,
          notes text,
          shipping_method text NOT NULL,
          payment_method text NOT NULL,
          subtotal integer NOT NULL,
          shipping_cost integer NOT NULL,
          total integer NOT NULL,
          payment_details jsonb,
          paid_at timestamptz,
          expires_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )`,
        sql`CREATE INDEX orders_awaiting ON orders (expires_at) WHERE status = 'awaiting_payment'`,
        sql`CREATE INDEX orders_user ON orders (user_id)`,
        sql`CREATE TABLE order_items (
          order_id integer NOT NULL REFERENCES orders (id),
          product_id text NOT NULL,
          product_name text NOT NULL,
          color text NOT NULL,
          size text NOT NULL,
          quantity integer NOT NULL CHECK (quantity > 0),
          unit_price integer NOT NULL,
          line_total integer NOT NULL
        )`,
        sql`CREATE INDEX order_items_order ON order_items (order_id)`,
        sql`CREATE TABLE addresses (
          id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id text NOT NULL,
          label text NOT NULL,
          recipient text NOT NULL,
          phone text NOT NULL,
          address text NOT NULL,
          district text NOT NULL,
          city text NOT NULL,
          province text NOT NULL,
          village text,
          postal_code text NOT NULL,
          region_code text,
          is_default boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now()
        )`,
        sql`CREATE INDEX addresses_user ON addresses (user_id)`,
        sql`CREATE TABLE user_preferences (
          user_id text PRIMARY KEY,
          order_updates boolean NOT NULL DEFAULT true,
          promotions boolean NOT NULL DEFAULT false
        )`,
        // Kepmendagri regions: province (1), city or regency (2), district (3),
        // village (4). Only villages carry a postal code.
        sql`CREATE TABLE regions (
          code text PRIMARY KEY,
          name text NOT NULL,
          level smallint NOT NULL,
          parent text,
          postal_code text
        )`,
        sql`CREATE INDEX regions_parent ON regions (parent, name)`,
      ]) {
        await statement.execute(db)
      }
    },
  },
  // Lets ids be written when moving data in, such as from the old SQLite file.
  '002_ids_by_default': {
    async up(db) {
      await sql`ALTER TABLE orders ALTER COLUMN id SET GENERATED BY DEFAULT`.execute(db)
      await sql`ALTER TABLE addresses ALTER COLUMN id SET GENERATED BY DEFAULT`.execute(db)
    },
  },
  // Everything the admin dashboard manages.
  '003_admin': {
    async up(db) {
      for (const statement of [
        sql`CREATE TABLE media (
          id text PRIMARY KEY,
          mime text NOT NULL,
          width integer NOT NULL,
          height integer NOT NULL,
          bytes integer NOT NULL,
          data bytea NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )`,
        sql`ALTER TABLE products
          ADD COLUMN weight_grams integer NOT NULL DEFAULT 300 CHECK (weight_grams > 0),
          ADD COLUMN is_active boolean NOT NULL DEFAULT true,
          ADD COLUMN rail_media_id text REFERENCES media (id),
          ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
          ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now()`,
        sql`CREATE TABLE product_images (
          product_id text NOT NULL REFERENCES products (id) ON DELETE CASCADE,
          media_id text NOT NULL REFERENCES media (id),
          position integer NOT NULL,
          alt text NOT NULL DEFAULT '',
          PRIMARY KEY (product_id, position)
        )`,
        sql`ALTER TABLE categories ADD COLUMN cover_product_id text REFERENCES products (id) ON DELETE SET NULL`,
        sql`ALTER TABLE orders
          ADD COLUMN fulfillment_status text NOT NULL DEFAULT 'unfulfilled',
          ADD COLUMN courier text,
          ADD COLUMN tracking_number text,
          ADD COLUMN shipped_at timestamptz`,
        sql`CREATE INDEX orders_created ON orders (created_at DESC)`,
        sql`CREATE TABLE settings (
          key text PRIMARY KEY,
          value jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`,
      ]) {
        await statement.execute(db)
      }
    },
  },
  '004_rail_faces': {
    async up(db) {
      await sql`ALTER TABLE products
        ADD COLUMN rail_back_media_id text REFERENCES media (id),
        ADD COLUMN rail_side_media_id text REFERENCES media (id)`.execute(db)
    },
  },
  '005_rail_hanger': {
    async up(db) {
      await sql`ALTER TABLE products ADD COLUMN rail_has_hanger boolean NOT NULL DEFAULT false`.execute(db)
    },
  },
  // Ordering now needs an account. Orders placed without one are removed, as the shop owner asked
  // on 2026-11-10. Stock held by unpaid ones goes back first.
  '006_remove_guest_orders': {
    async up(db) {
      for (const statement of [
        sql`UPDATE variants v SET stock = v.stock + held.quantity
          FROM (SELECT i.product_id, i.color, i.size, sum(i.quantity)::int AS quantity
                FROM order_items i JOIN orders o ON o.id = i.order_id
                WHERE o.user_id IS NULL AND o.status = 'awaiting_payment'
                GROUP BY i.product_id, i.color, i.size) AS held
          WHERE v.product_id = held.product_id AND v.color = held.color AND v.size = held.size`,
        sql`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IS NULL)`,
        sql`DELETE FROM orders WHERE user_id IS NULL`,
      ]) {
        await statement.execute(db)
      }
    },
  },
}

/**
 * A postgres:// URL connects to PostgreSQL, such as Neon in production.
 * Anything else is a folder for PGlite, a real PostgreSQL that runs inside
 * Node, so development needs nothing installed. ":memory:" keeps nothing.
 */
async function dialectFor(url: string): Promise<Dialect> {
  if (/^postgres(ql)?:\/\//.test(url)) {
    const { Pool } = await import('pg')
    const pool = new Pool({
      // pg treats require as verify-full already. Saying so keeps that and silences its warning.
      connectionString: url.replace(/sslmode=(require|prefer|verify-ca)(?=&|$)/, 'sslmode=verify-full'),
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      // Neon closes idle connections, and a Vercel function can sleep between
      // requests. Letting idle ones go early avoids reusing a dead connection.
      idleTimeoutMillis: 10_000,
      // A sleeping Neon database takes a moment to wake, so wait for it.
      connectionTimeoutMillis: 20_000,
      // Notice a connection that died while the function slept, and do not keep any for long.
      keepAlive: true,
      maxLifetimeSeconds: 60,
      // A query on a dead connection would otherwise wait until the function times out.
      query_timeout: 15_000,
    })
    // On Vercel, close idle connections before the function is suspended, so a
    // woken function never reuses a connection that was cut while it slept.
    if (process.env.VERCEL) {
      const { attachDatabasePool } = await import('@vercel/functions')
      attachDatabasePool(pool)
    }
    // An idle connection that breaks must not take the whole function down.
    pool.on('error', (error) => console.warn('Koneksi database terputus, dibuka ulang saat dibutuhkan.', error.message))
    // Neon suspends after about five idle minutes and cuts every open connection.
    // A warm function cannot know, so each connection answers a tiny query before
    // it is used, and a dead one is replaced instead of failing the request.
    const checked = {
      options: pool.options,
      end: () => pool.end(),
      async connect() {
        for (let attempt = 1; ; attempt++) {
          const client = await pool.connect()
          try {
            let timer: NodeJS.Timeout | undefined
            await Promise.race([
              client.query('SELECT 1'),
              new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error('Koneksi database tidak menjawab.')), 3_000)
              }),
            ]).finally(() => clearTimeout(timer))
            return client
          } catch (error) {
            client.release(true)
            if (attempt >= 3) throw error
          }
        }
      },
    }
    return new PostgresDialect({ pool: checked })
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const { PGliteDialect } = await import('kysely-pglite-dialect')
  if (url !== ':memory:') mkdirSync(url, { recursive: true })
  return new PGliteDialect(new PGlite(url === ':memory:' ? undefined : url))
}

export async function openDatabase(url: string): Promise<Database> {
  const db = new Kysely<Schema>({ dialect: await dialectFor(url) })
  // Most starts have nothing to migrate. Checking with one plain query avoids the
  // migration lock, which a pooled Neon connection cannot hold (see migrate()).
  if (await hasPendingMigrations(db)) await migrate(url, db)
  await seedCatalog(db)
  await seedRegions(db)
  return db
}

/** True when a migration in MIGRATIONS has not run yet, or the migration table does not exist. */
async function hasPendingMigrations(db: Database) {
  try {
    const rows = (await db.selectFrom('kysely_migration' as never).select('name' as never).execute()) as { name: string }[]
    const done = new Set(rows.map((row) => row.name))
    return Object.keys(MIGRATIONS).some((name) => !done.has(name))
  } catch {
    return true
  }
}

/**
 * Neon's pooled address (host with -pooler) goes through PgBouncer in
 * transaction mode. The migrator's session advisory lock and unlock can land
 * on different server connections there, so the lock leaks and the next start
 * waits on it until it times out. Migrations use the direct address instead.
 */
export function directDatabaseUrl(url: string) {
  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) return url
  const parsed = new URL(url)
  parsed.hostname = parsed.hostname.replace('-pooler.', '.')
  return parsed.toString()
}

async function migrate(url: string, db: Database) {
  const direct = directDatabaseUrl(url)
  const target = direct === url ? db : new Kysely<Schema>({ dialect: await dialectFor(direct) })
  try {
    const migrator = new Migrator({ db: target, provider: { getMigrations: async () => MIGRATIONS } })
    const { error } = await migrator.migrateToLatest()
    if (error) throw error
  } finally {
    if (target !== db) await target.destroy()
  }
}

/** Sample catalog for a new database. A database that has categories is left alone. */
async function seedCatalog(db: Database) {
  if (await db.selectFrom('categories').select('slug').limit(1).executeTakeFirst()) return

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('categories')
      .values(
        categories.map((category, position) => ({
          slug: category.slug,
          name: category.name,
          description: category.description,
          intro: category.intro,
          art: category.art,
          art_color: category.artColor,
          position,
        })),
      )
      .execute()

    await trx
      .insertInto('products')
      .values(
        products.map((product, position) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category,
          art: product.art,
          rail_kind: product.railKind ?? null,
          price: product.price,
          compare_at_price: product.compareAtPrice ?? null,
          description: product.description,
          details: JSON.stringify(product.details),
          material: product.material,
          colors: JSON.stringify(product.colors),
          sizes: JSON.stringify(product.sizes),
          is_new: Boolean(product.isNew),
          featured: Boolean(product.featured),
          image: product.image ?? null,
          position,
          weight_grams: ESTIMATED_GRAMS[product.art] ?? 300,
        })),
      )
      .execute()

    await trx
      .insertInto('variants')
      .values(
        products.flatMap((product) =>
          product.colors.flatMap((color) =>
            product.sizes.map((size) => ({
              product_id: product.id,
              color: color.name,
              size,
              stock: product.soldOut?.includes(`${color.name}|${size}`) ? 0 : DEFAULT_STOCK,
            })),
          ),
        ),
      )
      .execute()
  })
}

const REGIONS_FILE = new URL('../../resources/regions.tsv.gz', import.meta.url)
const REGION_BATCH = 10_000

/** Loads the region list once, about 92 thousand rows in batches of ten thousand. */
async function seedRegions(db: Database) {
  if (await db.selectFrom('regions').select('code').limit(1).executeTakeFirst()) return
  const lines = gunzipSync(readFileSync(REGIONS_FILE)).toString('utf8').split('\n').filter(Boolean)

  await db.transaction().execute(async (trx) => {
    for (let start = 0; start < lines.length; start += REGION_BATCH) {
      const codes: string[] = []
      const names: string[] = []
      const levels: number[] = []
      const parents: (string | null)[] = []
      const postals: (string | null)[] = []
      for (const line of lines.slice(start, start + REGION_BATCH)) {
        const [code, name, postal] = line.split('\t')
        const parts = code.split('.')
        codes.push(code)
        names.push(name)
        levels.push(parts.length)
        parents.push(parts.length > 1 ? parts.slice(0, -1).join('.') : null)
        postals.push(postal || null)
      }
      await sql`INSERT INTO regions (code, name, level, parent, postal_code)
        SELECT * FROM unnest(${codes}::text[], ${names}::text[], ${levels}::smallint[], ${parents}::text[], ${postals}::text[])`.execute(
        trx,
      )
    }
  })
}

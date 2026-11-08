import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { categories, products } from './seed-data.js'

export type Database = DatabaseSync

const DEFAULT_STOCK = 25

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS categories (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    intro TEXT NOT NULL,
    art TEXT NOT NULL,
    art_color TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL REFERENCES categories(slug),
    art TEXT NOT NULL,
    rail_kind TEXT,
    price INTEGER NOT NULL CHECK (price >= 0),
    compare_at_price INTEGER,
    description TEXT NOT NULL,
    details TEXT NOT NULL,
    material TEXT NOT NULL,
    colors TEXT NOT NULL,
    sizes TEXT NOT NULL,
    is_new INTEGER NOT NULL DEFAULT 0,
    featured INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS variants (
    product_id TEXT NOT NULL REFERENCES products(id),
    color TEXT NOT NULL,
    size TEXT NOT NULL,
    stock INTEGER NOT NULL CHECK (stock >= 0),
    PRIMARY KEY (product_id, color, size)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    idempotency_key TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    notes TEXT,
    shipping_method TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    shipping_cost INTEGER NOT NULL,
    total INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    color TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price INTEGER NOT NULL,
    line_total INTEGER NOT NULL
  );
`

export function openDatabase(path: string): Database {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)
  migrate(db)
  seed(db)
  return db
}

/** Columns added after the first release. Existing databases gain them in place. */
const ORDER_COLUMNS = {
  snap_token: 'TEXT',
  payment_url: 'TEXT',
  paid_at: 'TEXT',
  expires_at: 'TEXT',
}

function migrate(db: Database) {
  const existing = new Set(
    (db.prepare('PRAGMA table_info(orders)').all() as unknown as { name: string }[]).map(
      (column) => column.name,
    ),
  )
  for (const [name, type] of Object.entries(ORDER_COLUMNS)) {
    if (!existing.has(name)) db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${type}`)
  }
  db.exec(
    "CREATE INDEX IF NOT EXISTS orders_awaiting ON orders (status, expires_at) WHERE status = 'awaiting_payment'",
  )
}

/** Runs the callback in one transaction, and undoes everything if it throws. */
export function transaction<T>(db: Database, work: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function seed(db: Database) {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number }
  if (existing.count > 0) return

  const insertCategory = db.prepare(
    'INSERT INTO categories (slug, name, description, intro, art, art_color, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  const insertProduct = db.prepare(`
    INSERT INTO products (id, slug, name, category, art, rail_kind, price, compare_at_price,
      description, details, material, colors, sizes, is_new, featured, image, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertVariant = db.prepare(
    'INSERT INTO variants (product_id, color, size, stock) VALUES (?, ?, ?, ?)',
  )

  transaction(db, () => {
    categories.forEach((category, position) => {
      insertCategory.run(
        category.slug,
        category.name,
        category.description,
        category.intro,
        category.art,
        category.artColor,
        position,
      )
    })

    products.forEach((product, position) => {
      insertProduct.run(
        product.id,
        product.slug,
        product.name,
        product.category,
        product.art,
        product.railKind ?? null,
        product.price,
        product.compareAtPrice ?? null,
        product.description,
        JSON.stringify(product.details),
        product.material,
        JSON.stringify(product.colors),
        JSON.stringify(product.sizes),
        product.isNew ? 1 : 0,
        product.featured ? 1 : 0,
        product.image ?? null,
        position,
      )

      for (const color of product.colors) {
        for (const size of product.sizes) {
          const soldOut = product.soldOut?.includes(`${color.name}|${size}`)
          insertVariant.run(product.id, color.name, size, soldOut ? 0 : DEFAULT_STOCK)
        }
      }
    })
  })
}

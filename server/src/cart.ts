import { sql, type Transaction } from 'kysely'
import { z } from 'zod'
import type { Database, Schema } from './db/index.js'

/** The same limit as the store's cart. */
export const MAX_CART_QUANTITY = 10
const MAX_CART_LINES = 50

const cartItemSchema = z.object({
  productId: z.string().trim().min(1).max(120),
  color: z.string().trim().min(1).max(60),
  size: z.string().trim().min(1).max(60),
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
})

export const cartSchema = z.object({ items: z.array(cartItemSchema).max(MAX_CART_LINES) })

export type CartItem = z.infer<typeof cartItemSchema>

const keyOf = (item: Pick<CartItem, 'productId' | 'color' | 'size'>) => `${item.productId}|${item.color}|${item.size}`

/** Keeps the first position of each variant and adds up repeated ones. */
function combine(items: CartItem[]) {
  const lines = new Map<string, CartItem>()
  for (const item of items) {
    const existing = lines.get(keyOf(item))
    if (existing) existing.quantity += item.quantity
    else lines.set(keyOf(item), { ...item })
  }
  return [...lines.values()]
}

/** Drops variants that do not exist, and caps each line at the limit and at what is in stock. */
async function fit(db: Database | Transaction<Schema>, items: CartItem[]) {
  if (items.length === 0) return []
  const variants = await db
    .selectFrom('variants')
    .select(['product_id', 'color', 'size', 'stock'])
    .where('product_id', 'in', [...new Set(items.map((item) => item.productId))])
    .execute()
  const stock = new Map(variants.map((row) => [keyOf({ productId: row.product_id, color: row.color, size: row.size }), row.stock]))
  return items.flatMap((item) => {
    const left = stock.get(keyOf(item))
    if (left === undefined) return []
    // A sold out line stays at one, so the cart can say it is sold out instead of losing it silently.
    return [{ ...item, quantity: Math.max(1, Math.min(MAX_CART_QUANTITY, item.quantity, left)) }]
  })
}

export async function readCart(db: Database, userId: string) {
  const rows = await db
    .selectFrom('cart_items as c')
    .innerJoin('variants as v', (join) =>
      join.onRef('v.product_id', '=', 'c.product_id').onRef('v.color', '=', 'c.color').onRef('v.size', '=', 'c.size'),
    )
    .select(['c.product_id', 'c.color', 'c.size', 'c.quantity', 'c.updated_at'])
    .where('c.user_id', '=', userId)
    .orderBy('c.position')
    .execute()
  return {
    items: rows.map((row) => ({ productId: row.product_id, color: row.color, size: row.size, quantity: row.quantity })),
    updatedAt: rows.reduce<Date | null>((latest, row) => (!latest || row.updated_at > latest ? row.updated_at : latest), null),
  }
}

async function write(trx: Transaction<Schema>, userId: string, items: CartItem[]) {
  await trx.deleteFrom('cart_items').where('user_id', '=', userId).execute()
  if (items.length === 0) return
  await trx
    .insertInto('cart_items')
    .values(
      items.map((item, position) => ({
        user_id: userId,
        product_id: item.productId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        position,
        updated_at: new Date(),
      })),
    )
    .execute()
}

/** The signed in cart, as the store last showed it. */
export async function replaceCart(db: Database, userId: string, items: CartItem[]) {
  await db.transaction().execute(async (trx) => {
    // One writer at a time per shopper, so two tabs saving at once never mix their lines.
    await sql`SELECT pg_advisory_xact_lock(hashtext(${`cart:${userId}`}))`.execute(trx)
    await write(trx, userId, await fit(trx, combine(items)))
  })
  return readCart(db, userId)
}

/** A guest cart joins the account's cart on sign in. Lines already there add up. */
export async function mergeCart(db: Database, userId: string, guest: CartItem[]) {
  if (guest.length === 0) return readCart(db, userId)
  await db.transaction().execute(async (trx) => {
    await sql`SELECT pg_advisory_xact_lock(hashtext(${`cart:${userId}`}))`.execute(trx)
    const saved = await trx
      .selectFrom('cart_items')
      .select(['product_id', 'color', 'size', 'quantity'])
      .where('user_id', '=', userId)
      .orderBy('position')
      .execute()
    const current = saved.map((row) => ({ productId: row.product_id, color: row.color, size: row.size, quantity: row.quantity }))
    await write(trx, userId, await fit(trx, combine([...current, ...guest])))
  })
  return readCart(db, userId)
}

/** Lines just ordered leave the account's cart, in the order's own transaction. */
export async function removeOrdered(trx: Transaction<Schema>, userId: string, lines: Pick<CartItem, 'productId' | 'color' | 'size'>[]) {
  if (lines.length === 0) return
  await trx
    .deleteFrom('cart_items')
    .where('user_id', '=', userId)
    .where((eb) =>
      eb.or(lines.map((line) => eb.and([eb('product_id', '=', line.productId), eb('color', '=', line.color), eb('size', '=', line.size)]))),
    )
    .execute()
}

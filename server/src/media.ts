import { createHash } from 'node:crypto'
import sharp, { type OutputInfo } from 'sharp'
import type { Database } from './db/index.js'
import { HttpError } from './errors.js'

/** Large enough for a sharp product photo on a wide screen, small enough to load fast. */
const MAX_WIDTH = 1600
const MAX_HEIGHT = 2000
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

export const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/**
 * Turns an upload into a WebP no larger than needed, with EXIF rotation applied
 * and metadata such as GPS dropped. Transparency is kept for rail cut-outs.
 * The id is the hash of the result, so the same picture is stored once.
 */
export async function storeImage(db: Database, input: Buffer) {
  let output: { data: Buffer; info: OutputInfo }
  try {
    output = await sharp(input, { failOn: 'error', limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 90 })
      .toBuffer({ resolveWithObject: true })
  } catch {
    throw new HttpError(422, 'invalid_image', 'File bukan gambar yang bisa dibaca. Pakai JPG, PNG, WebP, atau AVIF.')
  }

  const id = createHash('sha256').update(output.data).digest('hex').slice(0, 32)
  await db
    .insertInto('media')
    .values({
      id,
      mime: 'image/webp',
      width: output.info.width,
      height: output.info.height,
      bytes: output.data.length,
      data: output.data,
    })
    .onConflict((oc) => oc.column('id').doNothing())
    .execute()
  return { id, width: output.info.width, height: output.info.height }
}

export async function readMedia(db: Database, id: string) {
  if (!/^[0-9a-f]{32}$/.test(id)) return null
  return db.selectFrom('media').select(['mime', 'data']).where('id', '=', id).executeTakeFirst()
}

export async function mediaSizes(db: Database, ids: string[]) {
  if (!ids.length) return new Map<string, { width: number; height: number }>()
  const rows = await db.selectFrom('media').select(['id', 'width', 'height']).where('id', 'in', ids).execute()
  return new Map(rows.map((row) => [row.id, { width: row.width, height: row.height }]))
}

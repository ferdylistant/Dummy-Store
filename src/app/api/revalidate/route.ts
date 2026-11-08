import { timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { STORE_CACHE_TAG } from '@/services/api'

/** Shared with the API (STORE_REVALIDATE_SECRET there). Development has a fixed one. */
function secret() {
  return process.env.REVALIDATE_SECRET ?? (process.env.NODE_ENV === 'production' ? '' : 'dev-revalidate-secret')
}

/**
 * The API calls this after the dashboard saves a product, category, or
 * setting, so the store shows the change on the next visit instead of
 * waiting for its cache to run out.
 */
export async function POST(request: Request) {
  const expected = Buffer.from(secret())
  const given = Buffer.from(request.headers.get('x-revalidate-secret') ?? '')
  if (!expected.length || expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }
  // Nothing stale is served: the next request reads the API again.
  revalidateTag(STORE_CACHE_TAG, { expire: 0 })
  return Response.json({ revalidated: true })
}

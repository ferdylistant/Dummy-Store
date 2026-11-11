const PUBLIC_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const IS_SERVER = typeof window === 'undefined'

/** The server can reach the API over a private address, the browser cannot. */
const BASE_URL = `${IS_SERVER ? (process.env.API_URL ?? PUBLIC_URL) : PUBLIC_URL}/api`

// A cold API on Vercel and a sleeping Neon database can take a while to answer
// the first request, so the server waits longer than the browser.
const TIMEOUT_MS = IS_SERVER ? 25_000 : 15_000
const REVALIDATE_SECONDS = 60
/** Every cached read from the API. Dashboard changes clear it (see app/api/revalidate). */
export const STORE_CACHE_TAG = 'store'

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit, retries = 0): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      // The browser sends the login cookie, so the API knows who is shopping.
      ...(IS_SERVER ? {} : { credentials: 'include' as const }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    if (retries > 0) return retryAfterPause(path, init, retries)
    throw new ApiError(0, 'network_error', 'Tidak bisa terhubung ke server. Coba lagi.')
  }
  // A function that is still starting can answer 5xx once. Reads are safe to ask again.
  if (response.status >= 500 && retries > 0) return retryAfterPause(path, init, retries)

  if (response.status === 204) return null as T
  if (response.ok) return (await response.json()) as T

  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string; details?: { message?: string }[] }
  } | null
  throw new ApiError(
    response.status,
    body?.error?.code ?? 'request_failed',
    body?.error?.details?.[0]?.message ?? body?.error?.message ?? 'Permintaan gagal. Coba lagi.',
  )
}

async function retryAfterPause<T>(path: string, init: RequestInit, retries: number): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 800))
  return request<T>(path, init, retries - 1)
}

/** Pages cache catalog reads briefly. The browser always asks for fresh data. Reads retry once. */
export function apiGet<T>(path: string) {
  return request<T>(
    path,
    IS_SERVER ? { next: { revalidate: REVALIDATE_SECONDS, tags: [STORE_CACHE_TAG] } } : { cache: 'no-store' },
    1,
  )
}

export function apiSend<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return request<T>(path, {
    method,
    headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function apiPost<T>(path: string, body: unknown, headers: Record<string, string> = {}) {
  return apiSend<T>('POST', path, body, headers)
}

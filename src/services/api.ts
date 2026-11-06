const PUBLIC_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const IS_SERVER = typeof window === 'undefined'

/** The server can reach the API over a private address, the browser cannot. */
const BASE_URL = `${IS_SERVER ? (process.env.API_URL ?? PUBLIC_URL) : PUBLIC_URL}/api`

const TIMEOUT_MS = 8000
const REVALIDATE_SECONDS = 60

export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new ApiError(0, 'network_error', 'Tidak bisa terhubung ke server. Coba lagi.')
  }

  if (response.ok) return (await response.json()) as T

  const body = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string }
  } | null
  throw new ApiError(
    response.status,
    body?.error?.code ?? 'request_failed',
    body?.error?.message ?? 'Permintaan gagal. Coba lagi.',
  )
}

/** Pages cache catalog reads briefly. The browser always asks for fresh data. */
export function apiGet<T>(path: string) {
  return request<T>(
    path,
    IS_SERVER ? { next: { revalidate: REVALIDATE_SECONDS } } : { cache: 'no-store' },
  )
}

export function apiPost<T>(path: string, body: unknown, headers: Record<string, string> = {}) {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

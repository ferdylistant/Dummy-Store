'use client'

import { createAuthClient } from 'better-auth/react'

/** Talks to Better Auth on the Express API. Cookies carry the session. */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  basePath: '/api/auth',
  fetchOptions: { credentials: 'include' },
})

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Email atau password salah.',
  EMAIL_NOT_VERIFIED: 'Email belum dikonfirmasi. Kami sudah mengirim ulang tautannya ke email Anda.',
  USER_ALREADY_EXISTS: 'Email ini sudah terdaftar. Silakan masuk.',
  PASSWORD_TOO_SHORT: 'Password minimal 8 karakter.',
  INVALID_PASSWORD: 'Password saat ini salah.',
  INVALID_TOKEN: 'Tautan sudah tidak berlaku. Minta tautan baru.',
  TOO_MANY_REQUESTS: 'Terlalu banyak percobaan. Coba lagi sebentar.',
}

export function authErrorMessage(error: { code?: string; status?: number } | null | undefined) {
  if (!error) return ''
  if (error.status === 429) return MESSAGES.TOO_MANY_REQUESTS
  return (error.code && MESSAGES[error.code]) || 'Terjadi kendala. Coba lagi.'
}

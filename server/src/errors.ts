import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'

export class HttpError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'not_found', 'Alamat API tidak ditemukan.'))
}

// Express recognizes error handlers by their four parameters.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'validation_failed',
        message: 'Data yang dikirim belum lengkap atau tidak valid.',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
    return
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    })
    return
  }

  // Body parser errors carry their own client status, such as 400 or 413.
  const status = (error as { status?: number }).status
  if (status && status >= 400 && status < 500) {
    res.status(status).json({
      error: { code: 'bad_request', message: 'Permintaan tidak bisa diproses.' },
    })
    return
  }

  console.error(error)
  res.status(500).json({
    error: { code: 'internal_error', message: 'Terjadi kendala di server. Coba lagi nanti.' },
  })
}

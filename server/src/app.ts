import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { z } from 'zod'
import type { Database } from './db/index.js'
import { errorHandler, HttpError, notFoundHandler } from './errors.js'
import { createOrder, orderSchema } from './orders.js'
import {
  findProductBySlug,
  listCategories,
  findCategory,
  productFacets,
  queryProducts,
  relatedProducts,
} from './repositories/catalog.js'

const list = z
  .string()
  .max(500)
  .transform((value) => value.split(',').filter(Boolean))
const flag = z.enum(['true', 'false']).transform((value) => value === 'true')

const productQuerySchema = z.object({
  category: z.enum(['baju', 'celana', 'bandana', 'merchandise']).optional(),
  q: z.string().max(80).optional(),
  sizes: list.optional(),
  colors: list.optional(),
  ids: list.optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['rekomendasi', 'terbaru', 'termurah', 'termahal']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).optional(),
  featured: flag.optional(),
  isNew: flag.optional(),
  rail: flag.optional(),
})

const idempotencyKeySchema = z.string().min(8).max(100).optional()

export interface AppOptions {
  corsOrigins: string[]
  /** Orders allowed per IP address per minute. */
  ordersPerMinute?: number
}

export function createApp(db: Database, options: AppOptions) {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: options.corsOrigins, allowedHeaders: ['Content-Type', 'Idempotency-Key'] }))
  app.use(express.json({ limit: '32kb' }))

  app.get('/health', (_req, res) => {
    db.prepare('SELECT 1').get()
    res.json({ status: 'ok' })
  })

  app.get('/api/categories', (_req, res) => {
    res.json({ items: listCategories(db) })
  })

  app.get('/api/categories/:slug', (req, res) => {
    const category = findCategory(db, req.params.slug)
    if (!category) throw new HttpError(404, 'not_found', 'Kategori tidak ditemukan.')
    res.json(category)
  })

  app.get('/api/products', (req, res) => {
    res.json(queryProducts(db, productQuerySchema.parse(req.query)))
  })

  app.get('/api/products/facets', (req, res) => {
    const { category } = productQuerySchema.pick({ category: true }).parse(req.query)
    res.json(productFacets(db, category))
  })

  app.get('/api/products/:slug', (req, res) => {
    const product = findProductBySlug(db, req.params.slug)
    if (!product) throw new HttpError(404, 'not_found', 'Produk tidak ditemukan.')
    res.json(product)
  })

  app.get('/api/products/:slug/related', (req, res) => {
    const product = findProductBySlug(db, req.params.slug)
    if (!product) throw new HttpError(404, 'not_found', 'Produk tidak ditemukan.')
    const { limit } = z
      .object({ limit: z.coerce.number().int().min(1).max(12).default(4) })
      .parse(req.query)
    res.json({ items: relatedProducts(db, product, limit) })
  })

  app.post(
    '/api/orders',
    rateLimit({
      windowMs: 60_000,
      limit: options.ordersPerMinute ?? 20,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: { code: 'rate_limited', message: 'Terlalu banyak percobaan. Coba lagi sebentar.' },
      },
    }),
    (req, res) => {
      const input = orderSchema.parse(req.body)
      const key = idempotencyKeySchema.parse(req.get('Idempotency-Key'))
      res.status(201).json(createOrder(db, input, key))
    },
  )

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

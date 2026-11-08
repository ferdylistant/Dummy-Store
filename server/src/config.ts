const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databasePath: process.env.DATABASE_PATH ?? 'data/store.db',
  corsOrigins,
  siteUrl: (process.env.SITE_URL ?? corsOrigins[0] ?? 'http://localhost:3000').replace(/\/$/, ''),
  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY?.trim() ?? '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY?.trim() ?? '',
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  },
}

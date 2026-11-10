import type { NextConfig } from 'next'

const API_URL = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

const nextConfig: NextConfig = {
  // Pictures uploaded in the dashboard live in the API. Serving them under the
  // store's own address keeps them first-party and lets next/image optimize them.
  async rewrites() {
    return [
      { source: '/media/:id', destination: `${API_URL}/api/media/:id` },
      // On Vercel the browser calls the API through the store's own address, so
      // sign in cookies belong to the store. The store's own /api/revalidate route wins.
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
    ]
  },
}

export default nextConfig

import type { NextConfig } from 'next'

const API_URL = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

const nextConfig: NextConfig = {
  // Safe defaults for every page. A full Content-Security-Policy is left out on
  // purpose: Midtrans Snap and Vercel Analytics load scripts that a strict
  // policy would block, so only the parts that cannot break them are set.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
        ],
      },
    ]
  },
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

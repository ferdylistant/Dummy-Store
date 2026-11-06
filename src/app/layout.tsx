import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Modern Ecommerce',
    template: '%s | Modern Ecommerce',
  },
  description: 'Toko online baju, celana, bandana, dan merchandise.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-svh antialiased">{children}</body>
    </html>
  )
}

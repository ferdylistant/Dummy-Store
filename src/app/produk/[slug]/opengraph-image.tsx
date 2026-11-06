import { ImageResponse } from 'next/og'
import { formatRupiah } from '@/lib/format'
import { siteConfig } from '@/lib/site'
import { getProductBySlug } from '@/services/products'

export const alt = 'Produk Dummy Store'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export const revalidate = 60

export function generateStaticParams() {
  return []
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        color: '#1d1d1f',
        backgroundColor: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', fontSize: 34, fontWeight: 700 }}>{siteConfig.name}</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700 }}>
          {product?.name ?? siteConfig.name}
        </div>
        <div style={{ display: 'flex', marginTop: 20, fontSize: 44, color: '#0066cc' }}>
          {product ? formatRupiah(product.price) : siteConfig.tagline}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {product?.colors.map((color) => (
          <div
            key={color.name}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              border: '2px solid #d2d2d7',
              backgroundColor: color.hex,
            }}
          />
        ))}
      </div>
    </div>,
    size,
  )
}

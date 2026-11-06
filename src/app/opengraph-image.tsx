import { ImageResponse } from 'next/og'
import { siteConfig } from '@/lib/site'

export const alt = siteConfig.name
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 72,
        color: '#f8fafc',
        backgroundColor: '#1e293b',
      }}
    >
      <div style={{ display: 'flex', fontSize: 92, fontWeight: 700 }}>{siteConfig.name}</div>
      <div style={{ display: 'flex', marginTop: 20, fontSize: 42, color: '#cbd5e1' }}>
        {siteConfig.tagline}
      </div>
    </div>,
    size,
  )
}

import { useId, type ReactNode } from 'react'
import type { ProductArtKind } from '@/types/catalog'

/*
 * Placeholder illustrations until real product photos exist. Set `image` on a
 * product and ProductImage shows the photo instead.
 */

const LINE = 'rgba(15, 23, 42, 0.28)'

type ArtProps = { color: string; shade: string }

function Outline({ d, color, shade }: ArtProps & { d: string }) {
  return (
    <>
      <path d={d} fill={color} />
      <path d={d} fill={shade} stroke={LINE} strokeWidth="1" strokeLinejoin="round" />
    </>
  )
}

function Seam({ d }: { d: string }) {
  return <path d={d} fill="none" stroke={LINE} strokeWidth="1" strokeLinecap="round" />
}

const ART: Record<ProductArtKind, (props: ArtProps) => ReactNode> = {
  tee: (p) => (
    <>
      <Outline {...p} d="M44,45 C38,47 33,50 31,55 C24,64 17,76 13,92 C18,100 24,106 30,110 C35,106 42,102 48,102 C47,84 45,62 44,45 Z" />
      <Outline {...p} d="M156,45 C162,47 167,50 169,55 C176,64 183,76 187,92 C182,100 176,106 170,110 C165,106 158,102 152,102 C153,84 155,62 156,45 Z" />
      <Outline {...p} d="M80,34 C88,45 112,45 120,34 C132,36 146,40 156,45 L152,102 L153,226 C128,231 72,231 47,226 L48,102 L44,45 C54,40 68,36 80,34 Z" />
      <Seam d="M76,36 C86,50 114,50 124,36" />
      <Seam d="M50,219 C74,223 126,223 150,219" />
    </>
  ),
  shirt: (p) => (
    <>
      <Outline {...p} d="M40,47 C30,53 26,63 25,78 L21,216 L45,218 L47,98 C46,80 44,63 40,47 Z" />
      <Outline {...p} d="M160,47 C170,53 174,63 175,78 L179,216 L155,218 L153,98 C154,80 156,63 160,47 Z" />
      <Outline {...p} d="M80,34 C88,40 112,40 120,34 L160,47 L163,232 C150,240 124,238 100,234 C76,238 50,240 37,232 L40,47 Z" />
      <Outline {...p} d="M100,48 L80,34 C78,42 74,52 69,62 L90,64 Z" />
      <Outline {...p} d="M100,48 L120,34 C122,42 126,52 131,62 L110,64 Z" />
      <Seam d="M100,48 L100,234" />
      <Seam d="M116,88 L144,88 L144,118 L130,124 L116,118 Z" />
      {[76, 106, 136, 166, 196].map((y) => (
        <circle key={y} cx="100" cy={y} r="2" fill={LINE} />
      ))}
    </>
  ),
  hoodie: (p) => (
    <>
      <Outline {...p} d="M72,42 C64,28 68,12 86,8 L114,8 C132,12 136,28 128,42 C116,30 84,30 72,42 Z" />
      <Outline {...p} d="M40,48 C30,54 25,64 24,80 L18,218 C24,223 35,224 43,221 L46,100 C45,82 43,64 40,48 Z" />
      <Outline {...p} d="M160,48 C170,54 175,64 176,80 L182,218 C176,223 165,224 157,221 L154,100 C155,82 157,64 160,48 Z" />
      <Outline {...p} d="M80,36 C88,47 112,47 120,36 L160,48 L165,228 C141,233 59,233 35,228 L40,48 Z" />
      <Seam d="M62,148 L138,148 L150,196 L50,196 Z" />
      <Seam d="M92,50 L90,100" />
      <Seam d="M108,50 L110,100" />
      <Seam d="M36,213 L164,213" />
    </>
  ),
  sweater: (p) => (
    <>
      <Outline {...p} d="M42,46 C32,52 27,62 26,76 L20,216 C26,221 36,222 44,219 L47,98 C46,80 45,62 42,46 Z" />
      <Outline {...p} d="M158,46 C168,52 173,62 174,76 L180,216 C174,221 164,222 156,219 L153,98 C154,80 155,62 158,46 Z" />
      <Outline {...p} d="M80,34 C88,46 112,46 120,34 L158,46 L163,226 C140,231 60,231 37,226 L42,46 Z" />
      <Seam d="M75,37 C85,53 115,53 125,37" />
      <Seam d="M38,211 L162,211" />
      <Seam d="M21,203 L45,206" />
      <Seam d="M179,203 L155,206" />
    </>
  ),
  jacket: (p) => (
    <>
      <Outline {...p} d="M38,48 C28,54 24,64 23,80 L19,218 C26,222 37,222 44,219 L46,100 C45,82 42,64 38,48 Z" />
      <Outline {...p} d="M162,48 C172,54 176,64 177,80 L181,218 C174,222 163,222 156,219 L154,100 C155,82 158,64 162,48 Z" />
      <Outline {...p} d="M80,34 C88,40 112,40 120,34 L162,48 L166,230 L34,230 L38,48 Z" />
      <Outline {...p} d="M100,58 L80,34 C72,40 64,50 58,64 L90,72 Z" />
      <Outline {...p} d="M100,58 L120,34 C128,40 136,50 142,64 L110,72 Z" />
      <Seam d="M100,58 L100,230" />
      <Seam d="M46,152 L88,152 L88,198 L46,198 Z" />
      <Seam d="M112,152 L154,152 L154,198 L112,198 Z" />
      <Seam d="M112,92 L142,92 L142,122 L112,122 Z" />
    </>
  ),
  pants: (p) => (
    <>
      <Outline {...p} d="M60,22 L140,22 L150,232 L108,232 L100,100 L92,232 L50,232 Z" />
      <Seam d="M59,36 L141,36" />
      <Seam d="M100,36 L100,100" />
      <Seam d="M62,40 C70,56 80,60 90,60" />
      <Seam d="M138,40 C130,56 120,60 110,60" />
    </>
  ),
  shorts: (p) => (
    <>
      <Outline {...p} d="M54,62 L146,62 L158,178 L108,178 L100,116 L92,178 L42,178 Z" />
      <Seam d="M53,76 L147,76" />
      <Seam d="M100,76 L100,116" />
      <Seam d="M45,168 L92,168" />
      <Seam d="M108,168 L155,168" />
    </>
  ),
  bandana: (p) => (
    <>
      <Outline {...p} d="M100,30 L190,120 L100,210 L10,120 Z" />
      <path d="M100,50 L170,120 L100,190 L30,120 Z" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeDasharray="3 5" />
      {[
        [100, 120, 10],
        [100, 86, 5],
        [100, 154, 5],
        [66, 120, 5],
        [134, 120, 5],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.75)" />
      ))}
    </>
  ),
  cap: (p) => (
    <>
      <Outline {...p} d="M44,136 L160,136 C176,142 190,154 192,166 C160,154 100,150 44,154 Z" />
      <Outline {...p} d="M44,138 C44,86 74,64 106,64 C140,64 160,92 160,138 Z" />
      <Seam d="M104,64 C88,84 82,110 82,138" />
      <Seam d="M106,64 C124,84 130,110 130,138" />
      <circle cx="105" cy="64" r="4" fill={p.color} stroke={LINE} />
    </>
  ),
  tote: (p) => (
    <>
      <path d="M72,94 C72,44 128,44 128,94" fill="none" stroke={p.color} strokeWidth="7" />
      <path d="M72,94 C72,44 128,44 128,94" fill="none" stroke={LINE} strokeWidth="7" strokeOpacity="0.45" />
      <Outline {...p} d="M46,92 L154,92 L162,222 L38,222 Z" />
      <Seam d="M46,104 L154,104" />
    </>
  ),
  mug: (p) => (
    <>
      <path d="M136,106 C170,100 170,156 136,152" fill="none" stroke={p.color} strokeWidth="11" />
      <path d="M136,106 C170,100 170,156 136,152" fill="none" stroke={LINE} strokeWidth="11" strokeOpacity="0.4" />
      <Outline {...p} d="M52,74 L138,74 L138,178 C138,190 128,194 120,194 L70,194 C62,194 52,190 52,178 Z" />
      <Seam d="M52,84 L138,84" />
    </>
  ),
  sticker: (p) => (
    <>
      <circle cx="100" cy="120" r="78" fill="#fff" stroke={LINE} />
      <circle cx="100" cy="120" r="68" fill={p.color} />
      <path d="M100,76 L113,106 L146,109 L121,131 L129,163 L100,146 L71,163 L79,131 L54,109 L87,106 Z" fill="rgba(255,255,255,0.85)" />
    </>
  ),
  pin: (p) => (
    <>
      <circle cx="100" cy="120" r="58" fill="rgba(15,23,42,0.55)" />
      <circle cx="100" cy="120" r="51" fill={p.color} />
      <path d="M100,88 C86,104 80,118 80,128 C80,142 90,150 100,150 C110,150 120,142 120,128 C120,118 114,104 100,88 Z" fill="rgba(255,255,255,0.8)" />
    </>
  ),
  socks: (p) => (
    <>
      <Outline {...p} d="M76,34 L128,34 L128,132 L158,164 C172,180 158,206 134,194 L92,172 C80,166 76,158 76,146 Z" />
      <Seam d="M76,56 L128,56" />
      {[88, 100, 112].map((x) => (
        <Seam key={x} d={`M${x},36 L${x},54`} />
      ))}
    </>
  ),
}

export function ProductArt({
  kind,
  color,
  className,
}: {
  kind: ProductArtKind
  color: string
  className?: string
}) {
  const id = useId()
  return (
    <svg viewBox="0 0 200 250" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.14" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      {ART[kind]({ color, shade: `url(#${id})` })}
    </svg>
  )
}

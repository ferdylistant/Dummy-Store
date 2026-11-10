import { MessageCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { SocialNetwork } from '@/services/store'

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      {children}
    </svg>
  )
}

const Instagram = () => (
  <Svg>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </Svg>
)

const TikTok = () => (
  <Svg>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </Svg>
)

const Facebook = () => (
  <Svg>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </Svg>
)

const YouTube = () => (
  <Svg>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </Svg>
)

/** Nomor lokal (08…) menjadi format internasional untuk wa.me. */
function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  const international = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${international}`
}

// Links come from the dashboard settings. Empty ones are not shown.
const NETWORKS: { key: SocialNetwork; label: string; icon: ReactNode }[] = [
  { key: 'instagram', label: 'Instagram', icon: <Instagram /> },
  { key: 'tiktok', label: 'TikTok', icon: <TikTok /> },
  { key: 'facebook', label: 'Facebook', icon: <Facebook /> },
  { key: 'youtube', label: 'YouTube', icon: <YouTube /> },
]

export function SocialLinks({
  phone,
  socials = {},
  storeName,
  className,
}: {
  phone?: string
  socials?: Partial<Record<SocialNetwork, string>>
  storeName: string
  className?: string
}) {
  const whatsapp = phone ? whatsappHref(phone) : null
  const links = [
    ...NETWORKS.map((network) => ({ ...network, href: socials[network.key] ?? '' })),
    ...(whatsapp ? [{ label: 'WhatsApp', href: whatsapp, icon: <MessageCircle className="size-5" aria-hidden="true" /> }] : []),
  ].filter((item) => item.href)

  if (links.length === 0) return null

  return (
    <ul aria-label="Media sosial" className={cn('flex flex-wrap gap-2', className)}>
      {links.map((item) => (
        <li key={item.label}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.label} ${storeName}`}
            title={item.label}
            className="inline-flex size-10 items-center justify-center rounded-full border border-input text-muted-foreground transition-colors duration-200 hover:border-foreground hover:text-foreground"
          >
            {item.icon}
          </a>
        </li>
      ))}
    </ul>
  )
}
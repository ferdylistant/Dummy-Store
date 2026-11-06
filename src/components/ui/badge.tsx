import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const TONES = {
  neutral: 'bg-foreground text-background',
  promo: 'bg-accent text-accent-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: keyof typeof TONES
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

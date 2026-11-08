'use client'

import { m } from 'motion/react'
import { useCalmMotion } from '@/lib/use-calm-motion'
import Link from 'next/link'
import { PaperTag } from '@/components/ui/paper-tag'

/** A link hanging from a rail by a thread. It swings from the top on hover. */
export function RailTagLink({ href, label }: { href: string; label: string }) {
  const calm = useCalmMotion()

  return (
    <m.span
      className="inline-block"
      style={{ transformOrigin: '50% 0' }}
      // The tap gesture makes Motion add tabindex="0", which would put this wrapper in
      // the tab order next to its link, so it is taken out explicitly.
      tabIndex={-1}
      // useCalmMotion matches the server on the first render, so hydration agrees.
      whileHover={calm ? undefined : { rotate: 5 }}
      whileTap={calm ? undefined : { rotate: -3 }}
      transition={{ type: 'spring', stiffness: 220, damping: 7 }}
    >
      <span aria-hidden="true" className="mx-auto block h-6 w-px bg-input" />
      <Link href={href} className="block rounded-lg drop-shadow-sm">
        <PaperTag className="min-w-28 font-medium">{label}</PaperTag>
      </Link>
    </m.span>
  )
}

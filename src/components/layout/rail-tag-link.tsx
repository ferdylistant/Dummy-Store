'use client'

import { m, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { PaperTag } from '@/components/ui/paper-tag'

/** A link hanging from a rail by a thread. It swings from the top on hover. */
export function RailTagLink({ href, label }: { href: string; label: string }) {
  const reduced = useReducedMotion()

  return (
    <m.span
      className="inline-block"
      style={{ transformOrigin: '50% 0' }}
      whileHover={reduced ? undefined : { rotate: 5 }}
      whileTap={reduced ? undefined : { rotate: -3 }}
      transition={{ type: 'spring', stiffness: 220, damping: 7 }}
    >
      <span aria-hidden="true" className="mx-auto block h-6 w-px bg-input" />
      <Link href={href} className="block rounded-lg drop-shadow-sm">
        <PaperTag className="min-w-28 font-medium">{label}</PaperTag>
      </Link>
    </m.span>
  )
}

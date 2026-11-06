'use client'

import { ArrowRight } from 'lucide-react'
import { m, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * The store's signature call to action: a garment tag on a string. It pivots
 * around the punched hole, like the pieces hanging on the home page rail.
 */
export function HangTagLink({ href, children }: { href: string; children: ReactNode }) {
  const reduced = useReducedMotion()

  return (
    <m.span
      className="relative inline-block"
      style={{ transformOrigin: '20px 50%' }}
      whileHover={reduced ? undefined : { rotate: -5 }}
      whileTap={reduced ? undefined : { rotate: 3 }}
      transition={{ type: 'spring', stiffness: 240, damping: 8 }}
    >
      <Link
        href={href}
        className="group flex h-14 items-stretch rounded-r-xl rounded-l-[1.25rem] font-semibold"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 40 56"
          className="h-14 w-10 shrink-0 text-foreground"
        >
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M40 0H26a6 6 0 0 0-4.2 1.8L2.6 21a10 10 0 0 0 0 14l19.2 19.2A6 6 0 0 0 26 56h14ZM20 22a6 6 0 1 0 0 12a6 6 0 1 0 0-12Z"
          />
        </svg>
        <span className="-ml-px flex items-center gap-2 rounded-r-xl bg-foreground pr-5 pl-1 text-background">
          {children}
          <ArrowRight
            aria-hidden="true"
            className="size-5 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </Link>
      <svg
        aria-hidden="true"
        viewBox="0 0 44 60"
        fill="none"
        className="pointer-events-none absolute -top-8 left-0 h-[60px] w-11 overflow-visible text-muted-foreground"
      >
        <path
          d="M20 60C13 44 3 38 9 22S33 12 31 0"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    </m.span>
  )
}

'use client'

import { domMax, LazyMotion, MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

/** Loads animation features once and honors the visitor's reduced motion setting. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domMax}>{children}</LazyMotion>
    </MotionConfig>
  )
}

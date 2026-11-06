'use client'

import { Check } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import type { ComponentProps } from 'react'
import { Button } from '@/components/ui/button'

export function AddToCartButton({
  added,
  label,
  ...props
}: ComponentProps<typeof Button> & { added: boolean; label: string }) {
  return (
    <Button {...props}>
      <span className="grid overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <m.span
            key={added ? 'added' : 'idle'}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2"
          >
            {added && <Check aria-hidden="true" className="size-5" />}
            {added ? 'Ditambahkan' : label}
          </m.span>
        </AnimatePresence>
      </span>
    </Button>
  )
}

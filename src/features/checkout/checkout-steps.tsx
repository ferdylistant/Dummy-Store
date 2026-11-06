'use client'

import { Check } from 'lucide-react'
import { m } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * Progress drawn as a seam: stitches ahead, solid thread behind. Finished
 * steps can be reopened, and steps ahead stay locked until they are reached.
 */
export function CheckoutSteps({
  titles,
  current,
  onSelect,
}: {
  titles: readonly string[]
  current: number
  onSelect: (step: number) => void
}) {
  const inset = `${100 / titles.length / 2}%`

  return (
    <nav aria-label="Langkah checkout">
      <ol className="relative flex">
        <li aria-hidden="true" className="absolute top-5 h-px" style={{ left: inset, right: inset }}>
          <span className="absolute inset-x-0 border-t border-dashed border-input" />
          <m.span
            className="absolute inset-x-0 h-0.5 origin-left -translate-y-px bg-foreground"
            initial={false}
            animate={{ scaleX: current / (titles.length - 1) }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </li>
        {titles.map((title, index) => {
          const done = index < current
          const active = index === current
          return (
            <li key={title} className="relative flex-1">
              <button
                type="button"
                disabled={!done}
                aria-current={active ? 'step' : undefined}
                aria-label={`Langkah ${index + 1}: ${title}${done ? ', selesai' : ''}`}
                onClick={() => onSelect(index)}
                className="group mx-auto flex flex-col items-center gap-2 enabled:cursor-pointer"
              >
                <span
                  className={cn(
                    'grid size-10 place-items-center rounded-full border text-sm font-semibold transition-[background-color,border-color,color,transform] duration-200',
                    done && 'border-foreground bg-foreground text-background group-hover:scale-105',
                    active && 'border-foreground bg-background text-foreground ring-4 ring-muted',
                    !done && !active && 'border-input bg-background text-muted-foreground',
                  )}
                >
                  {done ? (
                    <m.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                    >
                      <Check aria-hidden="true" className="size-5" />
                    </m.span>
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    'text-xs sm:text-sm',
                    active ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {title}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

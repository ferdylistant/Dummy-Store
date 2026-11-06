'use client'

import { SlidersHorizontal } from 'lucide-react'
import { m } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

/**
 * Fades results after a filter change. It animates only on change, so the
 * server-rendered list is never hidden on first load.
 */
export function ResultsFade({ signature, children }: { signature: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const previous = useRef(signature)

  useEffect(() => {
    if (previous.current === signature) return
    previous.current = signature
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    ref.current?.animate(
      [
        { opacity: 0.4, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 200, easing: 'ease-out' },
    )
  }, [signature])

  return <div ref={ref}>{children}</div>
}

/**
 * Segmented control with a sliding thumb. Each option is a real link, so it
 * works without JavaScript. The thumb moves right away, before the data lands.
 */
export function SortTabs({
  value,
  options,
}: {
  value: string
  options: { value: string; label: string; href: string }[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useOptimistic(value)

  function handleClick(event: MouseEvent<HTMLAnchorElement>, option: (typeof options)[number]) {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    startTransition(() => {
      setSelected(option.value)
      router.push(option.href, { scroll: false })
    })
  }

  return (
    <nav aria-label="Urutkan produk" className="w-full sm:w-auto">
      <ul className="grid grid-cols-4 rounded-full bg-muted p-0.5">
        {options.map((option) => {
          const active = option.value === selected
          return (
            <li key={option.value} className="relative">
              {active && (
                <m.span
                  layoutId="sort-thumb"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-full bg-background shadow-sm"
                />
              )}
              <Link
                rel="nofollow"
                scroll={false}
                href={option.href}
                aria-current={active ? 'true' : undefined}
                onClick={(event) => handleClick(event, option)}
                className={cn(
                  'relative grid h-11 place-items-center rounded-full px-2 text-sm transition-colors duration-200 sm:px-4',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function FilterDrawer({
  activeCount,
  total,
  children,
}: {
  activeCount: number
  total: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" className="lg:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filter{activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filter"
        side="left"
        footer={
          <Button className="w-full" onClick={() => setOpen(false)}>
            Lihat {total} produk
          </Button>
        }
      >
        <div className="p-4">{children}</div>
      </Drawer>
    </>
  )
}

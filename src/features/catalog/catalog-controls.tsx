'use client'

import { SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'

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

export function SortSelect({
  value,
  options,
}: {
  value: string
  options: { value: string; label: string; href: string }[]
}) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="urut" className="text-sm text-muted-foreground">
        Urutkan
      </label>
      <select
        id="urut"
        value={value}
        onChange={(event) => {
          const option = options.find((item) => item.value === event.target.value)
          if (option) router.push(option.href, { scroll: false })
        }}
        className="h-11 cursor-pointer rounded-full border border-input bg-card px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
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

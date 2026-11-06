'use client'

import { SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'

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
        className="h-11 cursor-pointer rounded-lg border border-input bg-card px-2 text-sm"
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

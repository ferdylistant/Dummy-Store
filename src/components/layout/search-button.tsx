'use client'

import { Search } from 'lucide-react'
import Form from 'next/form'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Drawer } from '@/components/ui/drawer'
import type { NavItem } from '@/lib/site'

export function SearchButton({ navigation }: { navigation: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Cari produk"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Search aria-hidden="true" className="size-5" />
      </Button>
      <Drawer open={open} onClose={close} title="Cari produk" side="top">
        <Container className="max-w-3xl pt-2 pb-10">
          <Form action="/produk" role="search" onSubmit={close}>
            <label htmlFor="header-search" className="sr-only">
              Kata kunci
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="header-search"
                name="q"
                type="search"
                autoFocus
                placeholder="Kaos, celana, bandana"
                className="h-14 w-full rounded-xl border border-input bg-card pr-4 pl-12 text-lg placeholder:text-muted-foreground"
              />
            </div>
          </Form>
          <p className="mt-6 text-xs text-muted-foreground">Telusuri</p>
          <ul className="mt-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="flex min-h-11 items-center font-medium"
                >
                  <span className="link-stitch">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Drawer>
    </>
  )
}

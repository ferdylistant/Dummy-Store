import type { ReactNode } from 'react'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Container } from '@/components/ui/container'

export function InfoPage({
  title,
  path,
  intro,
  children,
}: {
  title: string
  path: string
  intro?: string
  children: ReactNode
}) {
  return (
    <Container className="py-6 lg:py-8">
      <Breadcrumbs
        items={[
          { label: 'Beranda', href: '/' },
          { label: title, href: path },
        ]}
      />
      <div className="mt-4 max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight lg:text-5xl">{title}</h1>
        {intro && <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{intro}</p>}
        <div className="mt-8 space-y-8 leading-relaxed [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:text-muted-foreground">
          {children}
        </div>
      </div>
    </Container>
  )
}

import type { ReactNode } from 'react'
import { Container } from '@/components/ui/container'
import { Logo } from '@/components/layout/logo'

/** A centered card on a muted page, shared by every sign in screen. */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string
  intro?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="bg-muted py-12 lg:py-20">
      <Container className="max-w-md">
        <div className="rounded-3xl bg-card p-6 sm:p-8">
          <span className="grid size-11 place-items-center rounded-full bg-muted">
            <Logo />
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">{title}</h1>
          {intro && <p className="mt-2 leading-relaxed text-muted-foreground">{intro}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </Container>
    </div>
  )
}

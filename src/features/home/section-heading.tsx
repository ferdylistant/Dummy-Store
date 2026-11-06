import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function SectionHeading({
  id,
  title,
  href,
  linkLabel,
}: {
  id?: string
  title: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 lg:mb-12">
      <h2 id={id} className="text-3xl font-semibold tracking-tight lg:text-5xl">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="group inline-flex min-h-11 shrink-0 items-center gap-0.5 font-medium"
        >
          <span className="link-stitch">{linkLabel}</span>
          <ChevronRight
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  )
}

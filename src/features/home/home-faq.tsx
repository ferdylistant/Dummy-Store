import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ButtonArrow, buttonClasses } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { faqItems } from '@/content/help'

export function HomeFaq() {
  return (
    <section aria-labelledby="tanya" className="py-16 lg:py-28">
      <Container className="grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="tanya" className="text-4xl font-semibold tracking-tight text-balance lg:text-6xl">
            Ada pertanyaan?
          </h2>
          <p className="mt-4 max-w-sm leading-relaxed text-muted-foreground">
            Jawaban singkat untuk hal yang paling sering ditanyakan sebelum berbelanja.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/bantuan" className={buttonClasses({ variant: 'action' })}>
              Pusat Bantuan
              <ButtonArrow />
            </Link>
            <Link href="/kontak" className="inline-flex min-h-11 items-center font-medium">
              <span className="link-stitch">Hubungi kami</span>
            </Link>
          </div>
        </div>

        <div className="border-t border-dashed border-input">
          {faqItems.map((item, index) => (
            <details
              key={item.question}
              name="faq"
              open={index === 0}
              className="accordion group relative border-b border-dashed border-input"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 py-5 text-lg font-medium lg:gap-4 lg:py-6 lg:text-xl [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="w-7 shrink-0 text-sm text-muted-foreground tabular-nums lg:w-9"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">{item.question}</span>
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-muted transition-colors duration-200 group-open:bg-foreground group-open:text-background"
                >
                  <Plus className="size-5 transition-transform duration-300 group-open:rotate-45" />
                </span>
              </summary>
              <p className="max-w-prose pb-6 pl-10 leading-relaxed text-muted-foreground lg:pr-14 lg:pl-13">
                {item.answer}
              </p>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 origin-left scale-x-0 bg-foreground transition-transform duration-500 group-open:scale-x-100"
              />
            </details>
          ))}
        </div>
      </Container>
    </section>
  )
}

import { Container } from '@/components/ui/container'

export default function Loading() {
  return (
    <Container className="py-6 lg:py-8">
      <div role="status" aria-label="Memuat produk">
        <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
        <div className="mt-6 h-10 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="aspect-[4/6] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    </Container>
  )
}

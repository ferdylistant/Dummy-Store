import { Container } from '@/components/ui/container'
import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/skeleton'
import { ProductCardSkeleton } from '@/features/products/product-skeletons'

/** Heights of the pieces hanging on the rail, from left to right. */
const PIECES = ['h-64', 'h-64', 'h-64', 'h-64', 'h-60', 'h-72', 'h-60', 'h-64']

/** The piece facing the front. On phones it is the only one shown. */
const FRONT_PIECE = 5

const TILE_LAYOUT = ['col-span-2 md:row-span-2', 'col-span-2', 'col-span-1', 'col-span-1']

/** Same structure as the home page: rail hero, category tiles, products. */
export function HomeSkeleton() {
  return (
    <SkeletonRegion label="Memuat beranda">
      <section className="overflow-hidden">
        <div className="flex flex-col items-center gap-3 px-6 pt-12 lg:pt-20">
          <Skeleton className="h-12 w-4/5 max-w-4xl rounded-xl lg:h-[4.5rem]" />
          <Skeleton className="h-12 w-3/5 rounded-xl lg:hidden" />
        </div>

        <div className="relative mt-8 lg:mt-12">
          <Skeleton className="h-2 rounded-none" />
          <div className="mt-8 flex justify-center gap-5 px-4 lg:gap-8">
            {PIECES.map((height, index) => (
              <div
                key={index}
                className={
                  index === FRONT_PIECE
                    ? 'flex flex-col items-center'
                    : 'hidden flex-col items-center md:flex'
                }
              >
                <div className="-mt-8 h-8 w-px bg-border" />
                <Skeleton
                  className={`${height} rounded-2xl ${index === FRONT_PIECE ? 'w-52' : 'w-12'}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 px-6 pt-8 pb-8">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <Skeleton className="h-14 w-48 rounded-r-xl rounded-l-[1.25rem]" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-28">
        <Container>
          <SkeletonLine row="mb-8 h-9 lg:mb-12 lg:h-12" bar="h-7 lg:h-10" className="w-72 max-w-full" />
          <div className="grid grid-cols-2 gap-3 md:auto-rows-[18rem] md:grid-cols-4 md:gap-4">
            {TILE_LAYOUT.map((layout, index) => (
              <Skeleton key={index} className={`min-h-60 rounded-3xl ${layout}`} />
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-16 lg:pb-28">
        <Container>
          <SkeletonLine row="mb-8 h-9 lg:mb-12 lg:h-12" bar="h-7 lg:h-10" className="w-64 max-w-full" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-6 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </Container>
      </section>
    </SkeletonRegion>
  )
}

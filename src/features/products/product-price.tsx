import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/catalog'

export function ProductPrice({ product, className }: { product: Product; className?: string }) {
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2 font-semibold tabular-nums', className)}>
      <span>
        <span className="sr-only">Harga </span>
        {formatRupiah(product.price)}
      </span>
      {product.compareAtPrice && (
        <s className="text-sm font-normal text-muted-foreground">
          <span className="sr-only">Harga sebelumnya </span>
          {formatRupiah(product.compareAtPrice)}
        </s>
      )}
    </p>
  )
}

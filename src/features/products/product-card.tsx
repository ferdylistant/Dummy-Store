import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { isProductInStock } from '@/lib/seo'
import type { Product } from '@/types/catalog'
import { ProductImage } from './product-image'
import { ProductPrice } from './product-price'

const CARD_SIZES = '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw'

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-shadow duration-200 hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <ProductImage
          product={product}
          sizes={CARD_SIZES}
          priority={priority}
          className="transition-transform duration-200 group-hover:scale-[1.03]"
        />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {discount > 0 && <Badge tone="promo">Hemat {discount}%</Badge>}
          {product.isNew && <Badge>Baru</Badge>}
          {!isProductInStock(product) && <Badge tone="warning">Habis</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 md:p-4">
        <h3 className="line-clamp-2 text-sm font-medium md:text-base">
          <Link href={`/produk/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <ProductPrice product={product} className="text-sm md:text-base" />
        <p className="mt-auto pt-1 text-xs text-muted-foreground">
          {product.colors.length > 1 ? `${product.colors.length} warna` : product.colors[0].name}
        </p>
      </div>
    </article>
  )
}

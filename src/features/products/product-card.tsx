import Link from 'next/link'
import { isProductInStock } from '@/lib/seo'
import type { Product } from '@/types/catalog'
import { ProductImage } from './product-image'
import { ProductPrice } from './product-price'

const CARD_SIZES = '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw'

function productLabel(product: Product) {
  if (!isProductInStock(product)) return 'Stok habis'
  if (product.compareAtPrice) {
    return `Hemat ${Math.round((1 - product.price / product.compareAtPrice) * 100)}%`
  }
  return product.isNew ? 'Baru' : null
}

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const label = productLabel(product)

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        <ProductImage
          product={product}
          sizes={CARD_SIZES}
          priority={priority}
          className="transition-transform duration-200 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col pt-3">
        <p className="min-h-4 text-xs font-semibold text-accent">{label}</p>
        <h3 className="line-clamp-2 text-sm font-medium md:text-base">
          <Link href={`/produk/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <ProductPrice product={product} className="mt-0.5 text-sm font-normal md:text-base" />
        <div className="mt-2 flex gap-1.5">
          <span className="sr-only">Warna: {product.colors.map((c) => c.name).join(', ')}</span>
          {product.colors.map((color) => (
            <span
              key={color.name}
              aria-hidden="true"
              className="size-3 rounded-full border border-black/10"
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
      </div>
    </article>
  )
}

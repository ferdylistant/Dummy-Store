import Image from 'next/image'
import { mediaSrc } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { Product } from '@/types/catalog'
import { ProductArt } from './product-art'

/** Fills its parent, which must be positioned and sized. */
export function ProductImage({
  product,
  color,
  sizes,
  priority,
  className,
}: {
  product: Product
  color?: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  const photo = product.images?.[0]
  const src = photo ? mediaSrc(photo.url) : product.image
  if (src) {
    return (
      <Image
        src={src}
        alt={photo?.alt || product.name}
        fill
        sizes={sizes}
        priority={priority}
        className={cn('object-cover', className)}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={`Ilustrasi ${product.name}`}
      className={cn('absolute inset-0 flex items-center justify-center p-[12%]', className)}
    >
      <ProductArt
        kind={product.art}
        color={color ?? product.colors[0].hex}
        className="size-full drop-shadow-sm"
      />
    </div>
  )
}

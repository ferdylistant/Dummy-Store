import type { ReactNode } from 'react'
import { formatRupiah } from '@/lib/format'

export function OrderSummary({
  subtotal,
  shipping,
  children,
}: {
  subtotal: number
  /** Omit when the shipping method is not chosen yet. */
  shipping?: number
  children?: ReactNode
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="tabular-nums">{formatRupiah(subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Ongkir</dt>
        <dd className="tabular-nums">
          {shipping === undefined
            ? 'Dihitung saat checkout'
            : shipping === 0
              ? 'Gratis'
              : formatRupiah(shipping)}
        </dd>
      </div>
      {children}
      <div className="flex justify-between gap-4 border-t border-border pt-3 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular-nums">{formatRupiah(subtotal + (shipping ?? 0))}</dd>
      </div>
    </dl>
  )
}

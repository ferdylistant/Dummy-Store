'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function QuantityStepper({
  value,
  onChange,
  max,
  label,
}: {
  value: number
  onChange: (value: number) => void
  max: number
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-full border border-input"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Kurangi jumlah"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus aria-hidden="true" className="size-4" />
      </Button>
      <span aria-live="polite" className="w-8 text-center font-medium tabular-nums">
        {value}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Tambah jumlah"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus aria-hidden="true" className="size-4" />
      </Button>
    </div>
  )
}

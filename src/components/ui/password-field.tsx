'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function PasswordField({
  id,
  label,
  error,
  hint,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { id: string; label: string; error?: string; hint?: string }) {
  const [visible, setVisible] = useState(false)
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full rounded-xl border border-input bg-card pr-12 pl-3 text-base aria-invalid:border-destructive',
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
          aria-pressed={visible}
          className="absolute top-0 right-0 grid size-11 place-items-center rounded-xl text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

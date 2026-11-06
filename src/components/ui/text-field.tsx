import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const INPUT_CLASSES =
  'w-full rounded-xl border border-input bg-card px-3 text-base text-foreground placeholder:text-muted-foreground aria-invalid:border-destructive'

interface FieldProps {
  label: string
  error?: string
  hint?: string
}

function FieldMessages({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <>
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
    </>
  )
}

function describedBy(id: string, error?: string, hint?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
}

export function TextField({
  label,
  error,
  hint,
  id,
  required,
  className,
  ...props
}: ComponentProps<'input'> & FieldProps & { id: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(INPUT_CLASSES, 'h-11')}
        {...props}
      />
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  )
}

export function TextAreaField({
  label,
  error,
  hint,
  id,
  required,
  className,
  ...props
}: ComponentProps<'textarea'> & FieldProps & { id: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(INPUT_CLASSES, 'min-h-24 py-2')}
        {...props}
      />
      <FieldMessages id={id} error={error} hint={hint} />
    </div>
  )
}

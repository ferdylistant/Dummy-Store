import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const VARIANTS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
  outline: 'border border-input bg-transparent text-foreground hover:bg-muted',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-12 px-6 text-base',
  icon: 'size-11',
}

interface ButtonStyle {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  className?: string
}

/** Shared styles, so links can look like buttons. */
export function buttonClasses({ variant = 'primary', size = 'md', className }: ButtonStyle = {}) {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  )
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & ButtonStyle) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />
}

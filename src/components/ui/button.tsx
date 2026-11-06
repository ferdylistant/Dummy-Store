import { ArrowRight, type LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const VARIANTS = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  /** The main step forward on a screen. Pair with ButtonArrow. */
  action: 'group justify-between bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
  /** Fills from the bottom on hover. */
  outline:
    'relative isolate overflow-hidden border border-input bg-transparent text-foreground duration-300 before:absolute before:inset-0 before:-z-10 before:origin-bottom before:scale-y-0 before:bg-foreground before:transition-transform before:duration-300 hover:border-foreground hover:text-background hover:before:scale-y-100',
  ghost: 'bg-transparent text-foreground hover:bg-muted',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
}

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-12 px-6 text-base',
  action: 'h-14 gap-4 pr-2 pl-6 text-base',
  icon: 'size-11',
}

interface ButtonStyle {
  variant?: keyof typeof VARIANTS
  size?: keyof typeof SIZES
  className?: string
}

/** Shared styles, so links can look like buttons. */
export function buttonClasses({ variant = 'primary', size, className }: ButtonStyle = {}) {
  return cn(
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size ?? (variant === 'action' ? 'action' : 'md')],
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

/** Round icon at the end of an action button. The arrow passes through on hover. */
export function ButtonArrow() {
  const arrow = 'absolute size-5 transition-transform duration-300'
  return (
    <span
      aria-hidden="true"
      className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-foreground text-primary"
    >
      <ArrowRight className={cn(arrow, 'group-hover:translate-x-8 group-disabled:translate-x-0')} />
      <ArrowRight
        className={cn(arrow, '-translate-x-8 group-hover:translate-x-0 group-disabled:-translate-x-8')}
      />
    </span>
  )
}

/** Same round holder for actions that are not a step forward. */
export function ButtonIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-foreground text-primary"
    >
      <Icon className={cn('size-5 transition-transform duration-300', className)} />
    </span>
  )
}

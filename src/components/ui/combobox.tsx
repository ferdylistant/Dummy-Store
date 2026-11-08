'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface ComboboxOption {
  value: string
  label: string
  /** Shown faintly on the right, such as a postal code. */
  hint?: string
}

/** Matches "kab bandung" with "Kabupaten Bandung", ignoring case and spacing. */
function matches(label: string, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const text = label.toLowerCase()
  return words.every((word) => text.includes(word))
}

/**
 * A text field that filters a long list as you type, for choices too many
 * for buttons. Follows the WAI-ARIA combobox pattern: arrow keys move, Enter
 * picks, Escape closes and restores the chosen value.
 */
export function Combobox({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  loading,
  error,
  required,
  emptyText = 'Tidak ada yang cocok.',
}: {
  id: string
  label: string
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  error?: string
  required?: boolean
  emptyText?: string
}) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const selected = options.find((option) => option.value === value)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const shown = useMemo(
    () => (query ? options.filter((option) => matches(option.label, query)) : options),
    [options, query],
  )

  // Keeps the highlighted option in view while moving with the keyboard.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function show() {
    if (disabled) return
    setQuery('')
    setActive(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  function choose(option: ComboboxOption) {
    onChange(option.value)
    setOpen(false)
    setQuery('')
  }

  const describedBy = [error && `${id}-error`].filter(Boolean).join(' ') || undefined

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-busy={loading || undefined}
          autoComplete="off"
          disabled={disabled}
          required={required}
          value={open ? query : (selected?.label ?? '')}
          placeholder={loading ? 'Memuat...' : open && selected ? selected.label : placeholder}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={show}
          onClick={() => !open && show()}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              if (!open) return show()
              setActive((index) => Math.min(index + 1, shown.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((index) => Math.max(index - 1, 0))
            } else if (event.key === 'Enter' && open) {
              event.preventDefault()
              if (shown[active]) choose(shown[active])
            } else if (event.key === 'Escape' && open) {
              event.preventDefault()
              setOpen(false)
              setQuery('')
            }
          }}
          className="h-11 w-full rounded-xl border border-input bg-card pr-10 pl-3 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive"
        />
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-[calc(100%-0.25rem)] z-30 mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {shown.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">{loading ? 'Memuat...' : emptyText}</li>
          ) : (
            shown.map((option, index) => {
              const isSelected = option.value === value
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(option)
                  }}
                  onMouseMove={() => setActive(index)}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm',
                    index === active && 'bg-muted',
                  )}
                >
                  <Check aria-hidden="true" className={cn('size-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {option.hint && <span className="text-muted-foreground tabular-nums">{option.hint}</span>}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

'use client'

import { MapPin, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { TextField } from '@/components/ui/text-field'
import { cn } from '@/lib/utils'
import { getStoreConfig, searchRegions, type Region } from '@/services/account'

export interface RegionValue {
  district: string
  city: string
  province: string
  postalCode: string
  areaId?: string
}

let regionsEnabled: Promise<boolean> | null = null
function useRegionsEnabled() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    regionsEnabled ??= getStoreConfig()
      .then((config) => config.regions)
      .catch(() => false)
    regionsEnabled.then(setEnabled)
  }, [])
  return enabled
}

function describe(value: RegionValue) {
  return `${value.district}, ${value.city}, ${value.province} ${value.postalCode}`
}

/**
 * District, city, province, and postal code from one search, so none of them
 * is typed by hand. Falls back to plain fields when area search is off.
 */
export function RegionField({
  idPrefix,
  value,
  onChange,
  error,
}: {
  idPrefix: string
  value: RegionValue
  onChange: (value: RegionValue) => void
  error?: string
}) {
  const enabled = useRegionsEnabled()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Region[]>([])
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState(!value.areaId)

  useEffect(() => {
    if (!enabled || query.trim().length < 3) return
    let current = true
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const found = await searchRegions(query.trim())
        if (!current) return
        setResults(found)
        setActive(0)
        setOpen(true)
        setFailed(false)
      } catch {
        if (current) setFailed(true)
      } finally {
        if (current) setSearching(false)
      }
    }, 300)
    return () => {
      current = false
      window.clearTimeout(timer)
    }
  }, [query, enabled])

  if (enabled === null) {
    return <div className="h-[4.75rem] animate-pulse rounded-xl bg-muted" aria-hidden="true" />
  }

  if (!enabled) {
    const set = (key: keyof RegionValue) => (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, areaId: undefined, [key]: event.target.value })
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <TextField id={`${idPrefix}-district`} label="Kecamatan" required value={value.district} onChange={set('district')} autoComplete="address-level3" />
        <TextField id={`${idPrefix}-city`} label="Kota atau kabupaten" required value={value.city} onChange={set('city')} autoComplete="address-level2" />
        <TextField id={`${idPrefix}-province`} label="Provinsi" required value={value.province} onChange={set('province')} autoComplete="address-level1" />
        <TextField id={`${idPrefix}-postal`} label="Kode pos" required inputMode="numeric" value={value.postalCode} onChange={set('postalCode')} autoComplete="postal-code" />
        {error && <p role="alert" className="text-sm text-destructive md:col-span-2">{error}</p>}
      </div>
    )
  }

  function choose(region: Region) {
    onChange({
      district: region.district,
      city: region.city,
      province: region.province,
      postalCode: region.postalCode,
      areaId: region.id,
    })
    setOpen(false)
    setQuery('')
    setEditing(false)
  }

  if (!editing && value.district) {
    return (
      <div>
        <p className="mb-1 text-sm font-medium">Kecamatan, kota, provinsi, dan kode pos</p>
        <div className="flex items-center gap-3 rounded-xl border border-input bg-card p-3">
          <MapPin aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 text-sm">{describe(value)}</p>
          <button
            type="button"
            onClick={() => {
              setEditing(true)
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
            className="min-h-11 shrink-0 px-1 text-sm font-medium"
          >
            <span className="link-stitch">Ubah</span>
          </button>
        </div>
      </div>
    )
  }

  const inputId = `${idPrefix}-region`
  return (
    <div className="relative">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
        Kecamatan atau kode pos <span aria-hidden="true">*</span>
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ''}`}
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={(event) => {
            if (!open || results.length === 0) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((index) => Math.min(index + 1, results.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((index) => Math.max(index - 1, 0))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              choose(results[active])
            } else if (event.key === 'Escape') {
              setOpen(false)
            }
          }}
          placeholder="Contoh: Coblong atau 40132"
          className="h-11 w-full rounded-xl border border-input bg-card pr-3 pl-9 text-base placeholder:text-muted-foreground aria-invalid:border-destructive"
        />
      </div>
      <p id={`${inputId}-hint`} className="mt-1 text-sm text-muted-foreground">
        {searching ? 'Mencari...' : failed ? 'Pencarian gagal. Coba lagi.' : 'Ketik minimal 3 huruf, lalu pilih dari daftar.'}
      </p>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Hasil wilayah"
          className="absolute inset-x-0 top-[4.75rem] z-30 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">Wilayah tidak ditemukan. Coba kata lain.</li>
          ) : (
            results.map((region, index) => (
              <li
                key={region.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(region)
                }}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'flex min-h-11 cursor-pointer flex-col justify-center rounded-lg px-3 py-2 text-sm',
                  index === active && 'bg-muted',
                )}
              >
                <span className="font-medium">
                  {region.district}, {region.city}
                </span>
                <span className="text-muted-foreground">
                  {region.province} {region.postalCode}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

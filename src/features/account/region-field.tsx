'use client'

import { useEffect, useState } from 'react'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { getRegionChildren, type RegionOption } from '@/services/account'

/** A full Indonesian region, down to the village and its postal code. */
export interface RegionValue {
  /** Kepmendagri village code, empty until a village is chosen. */
  regionCode: string
  province: string
  city: string
  district: string
  village: string
  postalCode: string
}

export const EMPTY_REGION: RegionValue = {
  regionCode: '',
  province: '',
  city: '',
  district: '',
  village: '',
  postalCode: '',
}

const LEVELS = [
  { key: 'province', label: 'Provinsi', placeholder: 'Pilih provinsi' },
  { key: 'city', label: 'Kota atau kabupaten', placeholder: 'Pilih kota atau kabupaten' },
  { key: 'district', label: 'Kecamatan', placeholder: 'Pilih kecamatan' },
  { key: 'village', label: 'Desa atau kelurahan', placeholder: 'Pilih desa atau kelurahan' },
] as const

/** The codes above a village code: "32.73.02.1004" gives 32, 32.73, 32.73.02, and itself. */
function chainOf(regionCode: string) {
  const parts = regionCode.split('.')
  return parts.length === 4 ? [1, 2, 3, 4].map((length) => parts.slice(0, length).join('.')) : ['', '', '', '']
}

/** Loads the options for one level once its parent is chosen. */
function useLevel(parent: string | null) {
  const [state, setState] = useState<{ parent: string | null; items: RegionOption[]; failed: boolean }>({
    parent: null,
    items: [],
    failed: false,
  })

  useEffect(() => {
    if (parent === null) return
    let active = true
    getRegionChildren(parent)
      .then((items) => active && setState({ parent, items, failed: false }))
      .catch(() => active && setState({ parent, items: [], failed: true }))
    return () => {
      active = false
    }
  }, [parent])

  const ready = parent !== null && state.parent === parent
  return { items: ready ? state.items : [], loading: parent !== null && !ready, failed: ready && state.failed }
}

/**
 * Province, then city or regency, then district, then village. Each list
 * follows the choice above it, and the postal code comes with the village.
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
  // Picks above the village live here until a village completes the address.
  const [picked, setPicked] = useState<string[]>(() => chainOf(value.regionCode))
  const chain = value.regionCode ? chainOf(value.regionCode) : picked

  const levels = [
    useLevel(''),
    useLevel(chain[0] || null),
    useLevel(chain[1] || null),
    useLevel(chain[2] || null),
  ]

  function pick(level: number, code: string) {
    const next = [...chain.slice(0, level), code, ...['', '', '', ''].slice(level + 1)]
    setPicked(next)
    if (level < 3) {
      // A new choice above the village clears everything below it.
      if (value.regionCode) onChange(EMPTY_REGION)
      return
    }
    const names = next.map((item, index) => levels[index].items.find((option) => option.code === item))
    const village = names[3]
    if (!village?.postalCode) return
    onChange({
      regionCode: village.code,
      province: names[0]?.name ?? '',
      city: names[1]?.name ?? '',
      district: names[2]?.name ?? '',
      village: village.name,
      postalCode: village.postalCode,
    })
  }

  const failed = levels.some((level) => level.failed)

  return (
    <fieldset className="grid gap-4 md:grid-cols-2">
      <legend className="sr-only">Wilayah</legend>
      {LEVELS.map((level, index) => {
        const options: ComboboxOption[] = levels[index].items.map((item) => ({
          value: item.code,
          label: item.name,
          hint: item.postalCode,
        }))
        const locked = index > 0 && !chain[index - 1]
        return (
          <Combobox
            key={level.key}
            id={`${idPrefix}-${level.key}`}
            label={level.label}
            required
            options={options}
            value={chain[index]}
            onChange={(code) => pick(index, code)}
            placeholder={locked ? `Pilih ${LEVELS[index - 1].label.toLowerCase()} dulu` : level.placeholder}
            disabled={locked}
            loading={!locked && levels[index].loading}
            error={index === 3 ? error : undefined}
          />
        )
      })}
      <div>
        <p className="mb-1 text-sm font-medium" id={`${idPrefix}-postal-label`}>
          Kode pos
        </p>
        <p
          aria-labelledby={`${idPrefix}-postal-label`}
          className="flex h-11 items-center rounded-xl bg-muted px-3 text-base tabular-nums"
        >
          {value.postalCode || <span className="text-muted-foreground">Terisi otomatis</span>}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Mengikuti desa atau kelurahan yang dipilih.</p>
      </div>
      {failed && (
        <p role="alert" className="text-sm text-destructive md:col-span-2">
          Daftar wilayah gagal dimuat. Periksa koneksi, lalu buka lagi halaman ini.
        </p>
      )}
    </fieldset>
  )
}

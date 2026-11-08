import { z } from 'zod'
import type { Database } from './db/index.js'

export interface Region {
  /** Biteship area id, used later for shipping rates. */
  id: string
  province: string
  city: string
  district: string
  postalCode: string
}

export interface RegionProvider {
  search(query: string): Promise<Region[]>
}

const CACHE_LIMIT = 500

/** Indonesian areas with postal codes from Biteship, cached to save quota. */
export function createBiteshipRegions(apiKey: string): RegionProvider {
  const cache = new Map<string, Region[]>()

  return {
    async search(query) {
      const key = query.trim().toLowerCase()
      const cached = cache.get(key)
      if (cached) return cached

      const url = new URL('https://api.biteship.com/v1/maps/areas')
      url.searchParams.set('countries', 'ID')
      url.searchParams.set('input', key)
      url.searchParams.set('type', 'single')
      const response = await fetch(url, {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(8000),
      })
      const body = (await response.json().catch(() => ({}))) as {
        areas?: {
          id: string
          administrative_division_level_1_name?: string
          administrative_division_level_2_name?: string
          administrative_division_level_3_name?: string
          postal_code?: number | string
        }[]
        error?: string
      }
      if (!response.ok) throw new Error(`Biteship ${response.status}: ${body.error ?? ''}`)

      const regions = (body.areas ?? [])
        .filter((area) => area.postal_code)
        .map((area) => ({
          id: area.id,
          province: area.administrative_division_level_1_name ?? '',
          city: area.administrative_division_level_2_name ?? '',
          district: area.administrative_division_level_3_name ?? '',
          postalCode: String(area.postal_code),
        }))

      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
      cache.set(key, regions)
      return regions
    },
  }
}

export interface RegionOption {
  code: string
  name: string
  postalCode?: string
}

/** Provinces when parent is empty, otherwise the regions directly under it. */
export async function regionChildren(db: Database, parent: string | null): Promise<RegionOption[]> {
  const query = db.selectFrom('regions').select(['code', 'name', 'postal_code']).orderBy('name')
  const rows = await (parent ? query.where('parent', '=', parent) : query.where('level', '=', 1)).execute()
  return rows.map((row) => (row.postal_code ? { code: row.code, name: row.name, postalCode: row.postal_code } : { code: row.code, name: row.name }))
}

export interface ResolvedVillage {
  regionCode: string
  province: string
  city: string
  district: string
  village: string
  postalCode: string
}

/**
 * Every name of an address comes from the village code, never from what the
 * browser sent, so an address always matches real regions.
 */
export async function resolveVillage(db: Database, code: string): Promise<ResolvedVillage | null> {
  const parts = code.split('.')
  if (parts.length !== 4) return null
  const chain = [1, 2, 3, 4].map((length) => parts.slice(0, length).join('.'))
  const rows = await db.selectFrom('regions').select(['code', 'name', 'postal_code']).where('code', 'in', chain).execute()
  const byCode = new Map(rows.map((row) => [row.code, row]))
  const [province, city, district, village] = chain.map((item) => byCode.get(item))
  if (!province || !city || !district || !village?.postal_code) return null
  return {
    regionCode: code,
    province: province.name,
    city: city.name,
    district: district.name,
    village: village.name,
    postalCode: village.postal_code,
  }
}

export const regionCodeSchema = z
  .string()
  .regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/, 'Pilih desa atau kelurahan dari daftar.')

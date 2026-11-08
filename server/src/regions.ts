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

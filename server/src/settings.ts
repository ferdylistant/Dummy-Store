import { sql } from 'kysely'
import { z } from 'zod'
import type { Database } from './db/index.js'
import { regionCodeSchema } from './regions.js'

const rupiah = z.number().int().min(0).max(100_000_000)

/** Each network only accepts a link to its own site, so the footer cannot point anywhere else. */
export const SOCIAL_HOSTS = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  facebook: ['facebook.com', 'fb.com'],
  youtube: ['youtube.com', 'youtu.be'],
} as const
export type SocialNetwork = keyof typeof SOCIAL_HOSTS

const NETWORK_NAMES: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
}

function socialLink(network: SocialNetwork) {
  const hosts: readonly string[] = SOCIAL_HOSTS[network]
  return z
    .string()
    .trim()
    .max(200)
    .refine((value) => {
      if (!value) return true
      try {
        const url = new URL(value)
        const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '')
        return url.protocol === 'https:' && hosts.includes(host)
      } catch {
        return false
      }
    }, `Tulis tautan lengkap ${NETWORK_NAMES[network]}, misalnya https://${hosts[0]}/namatoko.`)
}

const socialsSchema = z
  .object({
    instagram: socialLink('instagram').default(''),
    tiktok: socialLink('tiktok').default(''),
    facebook: socialLink('facebook').default(''),
    youtube: socialLink('youtube').default(''),
  })
  .default({ instagram: '', tiktok: '', facebook: '', youtube: '' })

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(120),
  email: z.email('Email toko tidak valid.'),
  phone: z
    .string()
    .trim()
    .regex(/^$|^(\+62|62|0)8[0-9]{7,12}$/, 'Nomor ponsel tidak valid.'),
  logoMediaId: z.string().max(64).nullable(),
  announcement: z.object({
    enabled: z.boolean(),
    /** {minimum} is replaced with the free shipping minimum, written in Rupiah. */
    text: z.string().trim().max(160),
  }),
  freeShippingMin: rupiah,
  flatRates: z.object({ reguler: rupiah, ekspres: rupiah }),
  returnDays: z.number().int().min(0).max(90),
  /** Footer links. Empty ones are not shown. */
  socials: socialsSchema,
})

export const originSettingsSchema = z.object({
  name: z.string().trim().max(80),
  phone: z
    .string()
    .trim()
    .regex(/^$|^(\+62|62|0)8[0-9]{7,12}$/, 'Nomor ponsel tidak valid.'),
  address: z.string().trim().max(300),
  /** Empty until set. Shipping rates need it. */
  regionCode: z.union([z.literal(''), regionCodeSchema]),
})

const productIds = z.array(z.string().min(1).max(40)).max(24)

export const homeSettingsSchema = z.object({
  /** Garments on the hanging rail at the top of the home page, in order. */
  rail: productIds,
  /** The piece the rail opens on. */
  railFeatured: z.string().max(40).nullable(),
  featured: productIds,
  newArrivals: productIds,
  sale: productIds,
})

export const SETTINGS = {
  store: storeSettingsSchema,
  origin: originSettingsSchema,
  home: homeSettingsSchema,
} as const

export type SettingsKey = keyof typeof SETTINGS
export type Settings = { [K in SettingsKey]: z.infer<(typeof SETTINGS)[K]> }

export const DEFAULT_SETTINGS: Settings = {
  store: {
    name: 'Dummy Store',
    tagline: 'Baju, celana, bandana, dan merchandise',
    email: 'halo@dummystore.example',
    phone: '',
    logoMediaId: null,
    announcement: { enabled: true, text: 'Gratis ongkir reguler untuk belanja mulai {minimum}' },
    freeShippingMin: 300_000,
    flatRates: { reguler: 20_000, ekspres: 35_000 },
    returnDays: 14,
    socials: { instagram: '', tiktok: '', facebook: '', youtube: '' },
  },
  origin: { name: '', phone: '', address: '', regionCode: '' },
  // Empty lists fall back to the product flags, so a new store still has a home page.
  home: { rail: [], railFeatured: null, featured: [], newArrivals: [], sale: [] },
}

export async function getSettings<K extends SettingsKey>(db: Database, key: K): Promise<Settings[K]> {
  const row = await db.selectFrom('settings').select('value').where('key', '=', key).executeTakeFirst()
  // Stored values merge over the defaults, so a field added later still has a value.
  const parsed = SETTINGS[key].partial().safeParse(row?.value ?? {})
  return { ...DEFAULT_SETTINGS[key], ...(parsed.success ? parsed.data : {}) } as Settings[K]
}

export async function saveSettings<K extends SettingsKey>(db: Database, key: K, value: unknown) {
  const parsed = SETTINGS[key].parse(value) as Settings[K]
  await db
    .insertInto('settings')
    .values({ key, value: JSON.stringify(parsed), updated_at: sql`now()` })
    .onConflict((oc) => oc.column('key').doUpdateSet({ value: JSON.stringify(parsed), updated_at: sql`now()` }))
    .execute()
  return parsed
}

const rupiahFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

/** The store's public face: no origin address, no internal ids beyond the logo. */
export async function publicSettings(db: Database, mediaUrl: (id: string) => string) {
  const store = await getSettings(db, 'store')
  return {
    name: store.name,
    tagline: store.tagline,
    email: store.email,
    phone: store.phone,
    logoUrl: store.logoMediaId ? mediaUrl(store.logoMediaId) : null,
    announcement: store.announcement.enabled
      ? store.announcement.text.replaceAll('{minimum}', rupiahFormat.format(store.freeShippingMin).replace(/\s/g, ' '))
      : null,
    freeShippingMin: store.freeShippingMin,
    flatRates: store.flatRates,
    returnDays: store.returnDays,
    // Only the networks the shop filled in.
    socials: Object.fromEntries(Object.entries(store.socials ?? {}).filter(([, href]) => href)),
  }
}

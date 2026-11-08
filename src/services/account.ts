import { apiGet, apiSend } from './api'

export interface Address {
  id: number
  label: string
  recipient: string
  phone: string
  address: string
  district: string
  city: string
  province: string
  /** Null for addresses saved before villages were required. */
  village: string | null
  postalCode: string
  /** Kepmendagri village code. Null means the address must be completed. */
  regionCode: string | null
  isDefault: boolean
}

/** The server fills every region name and the postal code from regionCode. */
export interface AddressInput {
  label: string
  recipient: string
  phone: string
  address: string
  regionCode: string
  isDefault?: boolean
}

export interface RegionOption {
  code: string
  name: string
  /** Only villages carry one. */
  postalCode?: string
}

const regionLists = new Map<string, Promise<RegionOption[]>>()

/** Provinces when parent is empty, otherwise the regions under it. Cached per page. */
export function getRegionChildren(parent = '') {
  let list = regionLists.get(parent)
  if (!list) {
    list = apiGet<{ items: RegionOption[] }>(
      `/regions/children${parent ? `?parent=${encodeURIComponent(parent)}` : ''}`,
    ).then(({ items }) => items)
    // A failed request is not kept, so the next try asks again.
    list.catch(() => regionLists.delete(parent))
    regionLists.set(parent, list)
  }
  return list
}

export interface Preferences {
  orderUpdates: boolean
  promotions: boolean
}

export interface OrderHistoryItem {
  orderNumber: string
  status: 'awaiting_payment' | 'paid' | 'expired' | 'cancelled' | 'refunded'
  total: number
  createdAt: string
  shippingMethod: 'reguler' | 'ekspres'
  items: { productId: string; name: string; color: string; size: string; quantity: number; lineTotal: number }[]
}

export interface StoreConfig {
  payments: boolean
  regions: boolean
  google: boolean
}

export const getStoreConfig = () => apiGet<StoreConfig>('/config')

export async function getAddresses() {
  const { items } = await apiGet<{ items: Address[] }>('/me/addresses')
  return items
}

export const createAddress = (input: AddressInput) => apiSend<Address>('POST', '/me/addresses', input)
export const updateAddress = (id: number, input: AddressInput) =>
  apiSend<Address>('PUT', `/me/addresses/${id}`, input)
export const deleteAddress = (id: number) => apiSend<null>('DELETE', `/me/addresses/${id}`)

export const getPreferences = () => apiGet<Preferences>('/me/preferences')
export const savePreferences = (input: Preferences) => apiSend<Preferences>('PUT', '/me/preferences', input)

export async function getOrderHistory() {
  const { items } = await apiGet<{ items: OrderHistoryItem[] }>('/me/orders')
  return items
}

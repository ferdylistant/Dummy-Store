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
  postalCode: string
  areaId: string | null
  isDefault: boolean
}

export type AddressInput = Omit<Address, 'id' | 'isDefault' | 'areaId'> & {
  areaId?: string
  isDefault?: boolean
}

export interface Region {
  id: string
  province: string
  city: string
  district: string
  postalCode: string
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
  items: { productId: string; name: string; color: string; size: string; quantity: number; lineTotal: number }[]
}

export interface StoreConfig {
  payments: boolean
  regions: boolean
  google: boolean
}

export const getStoreConfig = () => apiGet<StoreConfig>('/config')

export async function searchRegions(query: string) {
  const { items } = await apiGet<{ items: Region[] }>(`/regions?q=${encodeURIComponent(query)}`)
  return items
}

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

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { TextAreaField, TextField } from '@/components/ui/text-field'
import { ApiError } from '@/services/api'
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
  type Address,
  type AddressInput,
} from '@/services/account'
import { AccountSection } from './account-shell'
import { RegionField } from './region-field'

export const regionSchema = z
  .object({
    district: z.string().trim(),
    city: z.string().trim(),
    province: z.string().trim(),
    postalCode: z.string().trim(),
    areaId: z.string().optional(),
  })
  .refine(
    (value) =>
      value.district.length >= 3 &&
      value.city.length >= 3 &&
      value.province.length >= 3 &&
      /^[0-9]{5}$/.test(value.postalCode),
    { message: 'Pilih kecamatan dan kode pos dari daftar, atau lengkapi semua kolom wilayah.' },
  )

const addressFormSchema = z.object({
  label: z.string().trim().min(1, 'Beri label, misalnya Rumah.').max(30),
  recipient: z.string().trim().min(3, 'Tulis nama penerima.').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+62|62|0)8[0-9]{7,12}$/, 'Tulis nomor ponsel yang valid, misalnya 081234567890.'),
  address: z.string().trim().min(10, 'Tulis nama jalan, nomor rumah, RT/RW.').max(500),
  region: regionSchema,
  isDefault: z.boolean(),
})

type AddressForm = z.infer<typeof addressFormSchema>

const EMPTY_REGION = { district: '', city: '', province: '', postalCode: '' }

export function formatAddress(address: Pick<Address, 'address' | 'district' | 'city' | 'province' | 'postalCode'>) {
  return `${address.address}, ${address.district}, ${address.city}, ${address.province} ${address.postalCode}`
}

function AddressEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Address
  onSaved: () => void
  onCancel: () => void
}) {
  const [error, setError] = useState('')
  const form = useForm<AddressForm>({
    resolver: zodResolver(addressFormSchema),
    mode: 'onTouched',
    defaultValues: initial
      ? {
          label: initial.label,
          recipient: initial.recipient,
          phone: initial.phone,
          address: initial.address,
          region: {
            district: initial.district,
            city: initial.city,
            province: initial.province,
            postalCode: initial.postalCode,
            areaId: initial.areaId ?? undefined,
          },
          isDefault: initial.isDefault,
        }
      : { label: 'Rumah', recipient: '', phone: '', address: '', region: EMPTY_REGION, isDefault: false },
  })
  const { errors } = form.formState

  return (
    <form
      noValidate
      className="grid gap-4 md:grid-cols-2"
      onSubmit={form.handleSubmit(async ({ region, ...values }) => {
        setError('')
        const input: AddressInput = { ...values, ...region }
        try {
          if (initial) await updateAddress(initial.id, input)
          else await createAddress(input)
          onSaved()
        } catch (failure) {
          setError(failure instanceof ApiError ? failure.message : 'Alamat gagal disimpan.')
        }
      })}
    >
      <TextField id="addr-label" label="Label" required error={errors.label?.message} {...form.register('label')} />
      <TextField id="addr-recipient" label="Nama penerima" autoComplete="name" required error={errors.recipient?.message} {...form.register('recipient')} />
      <TextField id="addr-phone" label="Nomor ponsel" type="tel" inputMode="tel" autoComplete="tel" required className="md:col-span-2" error={errors.phone?.message} {...form.register('phone')} />
      <div className="md:col-span-2">
        <Controller
          control={form.control}
          name="region"
          render={({ field, fieldState }) => (
            <RegionField
              idPrefix="addr"
              value={field.value}
              onChange={(value) => {
                field.onChange(value)
                field.onBlur()
              }}
              error={fieldState.error?.message ?? (fieldState.error as { root?: { message?: string } } | undefined)?.root?.message}
            />
          )}
        />
      </div>
      <TextAreaField id="addr-street" label="Nama jalan, nomor rumah, RT/RW" autoComplete="street-address" required className="md:col-span-2" error={errors.address?.message} {...form.register('address')} />
      <label className="flex min-h-11 items-center gap-3 md:col-span-2">
        <input type="checkbox" className="size-5 accent-primary" {...form.register('isDefault')} />
        <span className="text-sm">Jadikan alamat utama</span>
      </label>
      {error && <p role="alert" className="text-sm text-destructive md:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {initial ? 'Simpan Perubahan' : 'Simpan Alamat'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  )
}

export function AddressBook() {
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const [error, setError] = useState('')

  async function load() {
    try {
      setAddresses(await getAddresses())
    } catch {
      setError('Alamat gagal dimuat. Muat ulang halaman.')
    }
  }

  useEffect(() => {
    getAddresses()
      .then(setAddresses)
      .catch(() => setError('Alamat gagal dimuat. Muat ulang halaman.'))
  }, [])

  return (
    <AccountSection
      title="Alamat"
      description="Alamat utama dipilih otomatis saat checkout."
      action={
        editing === null && (
          <Button variant="outline" onClick={() => setEditing('new')}>
            <Plus aria-hidden="true" className="size-4" />
            Tambah Alamat
          </Button>
        )
      }
    >
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {editing !== null ? (
        <AddressEditor
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await load()
          }}
        />
      ) : !addresses ? (
        <div role="status" aria-label="Memuat alamat" className="grid gap-3">
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <MapPin aria-hidden="true" className="size-10 text-muted-foreground" />
          <p className="font-medium">Belum ada alamat tersimpan</p>
          <p className="text-sm text-muted-foreground">Alamat juga bisa disimpan saat checkout.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-2xl border border-border p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{address.label}</p>
                {address.isDefault && (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">Utama</span>
                )}
              </div>
              <p className="mt-1 text-sm">
                {address.recipient} · {address.phone}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{formatAddress(address)}</p>
              <div className="mt-3 flex flex-wrap gap-x-4">
                <button type="button" className="min-h-11 text-sm font-medium" onClick={() => setEditing(address)}>
                  <span className="link-stitch">Ubah</span>
                </button>
                {!address.isDefault && (
                  <button
                    type="button"
                    className="min-h-11 text-sm font-medium"
                    onClick={async () => {
                      await updateAddress(address.id, { ...address, areaId: address.areaId ?? undefined, isDefault: true })
                      load()
                    }}
                  >
                    <span className="link-stitch">Jadikan utama</span>
                  </button>
                )}
                <button
                  type="button"
                  className="min-h-11 text-sm font-medium text-destructive"
                  onClick={async () => {
                    if (!window.confirm(`Hapus alamat ${address.label}?`)) return
                    await deleteAddress(address.id)
                    load()
                  }}
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountSection>
  )
}

'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Info, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Button, buttonClasses } from '@/components/ui/button'
import { TextAreaField, TextField } from '@/components/ui/text-field'
import { OrderSummary } from '@/features/cart/order-summary'
import { useCart } from '@/features/cart/store'
import { useCartLines } from '@/features/cart/use-cart-lines'
import { formatRupiah } from '@/lib/format'
import { shippingCost, SHIPPING_OPTIONS } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { createOrder } from '@/services/orders'
import { checkoutSchema, type CheckoutValues } from './schema'

const PAYMENT_OPTIONS = [
  { value: 'transfer', label: 'Transfer bank', hint: 'Bayar melalui rekening virtual' },
  { value: 'ewallet', label: 'Dompet digital', hint: 'Bayar dengan aplikasi dompet digital' },
  { value: 'cod', label: 'Bayar di tempat', hint: 'Bayar saat pesanan diterima' },
] as const

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-border bg-card p-4 md:p-6">
      <legend className="float-left mb-4 w-full text-lg font-semibold">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}

function OptionCard({
  label,
  hint,
  aside,
  checked,
  input,
}: {
  label: string
  hint: string
  aside?: string
  checked: boolean
  input: ReactNode
}) {
  return (
    <label
      className={cn(
        'flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
        checked ? 'border-primary' : 'border-input',
      )}
    >
      {input}
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
      {aside && <span className="text-sm font-medium tabular-nums">{aside}</span>}
    </label>
  )
}

export function CheckoutForm() {
  const router = useRouter()
  const items = useCart((state) => state.items)
  const clear = useCart((state) => state.clear)
  const { lines, subtotal, isLoading } = useCartLines()
  const [submitError, setSubmitError] = useState(false)
  const [ordered, setOrdered] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
    defaultValues: { shippingMethod: 'reguler', paymentMethod: 'transfer' },
  })

  const shippingMethod = useWatch({ control, name: 'shippingMethod' })
  const paymentMethod = useWatch({ control, name: 'paymentMethod' })
  const shipping = shippingCost(subtotal, shippingMethod)

  async function onSubmit(customer: CheckoutValues) {
    setSubmitError(false)
    try {
      const { orderNumber } = await createOrder({ customer, items })
      setOrdered(true)
      clear()
      router.replace(`/checkout/berhasil?pesanan=${encodeURIComponent(orderNumber)}`)
    } catch {
      setSubmitError(true)
    }
  }

  if (isLoading) {
    return (
      <div role="status" aria-label="Memuat checkout" className="grid gap-4">
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (lines.length === 0 && !ordered) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
        <ShoppingBag aria-hidden="true" className="size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Belum ada barang untuk dibayar</h2>
        <Link href="/produk" className={buttonClasses()}>
          Mulai Belanja
        </Link>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6 lg:grid-cols-3 lg:gap-8"
    >
      <div className="grid gap-6 lg:col-span-2">
        <p className="flex gap-2 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
          <Info aria-hidden="true" className="size-5 shrink-0" />
          Ini mode contoh. Pesanan belum diproses dan tidak ada pembayaran sungguhan.
        </p>

        <FormSection title="Kontak">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              error={errors.email?.message}
              {...register('email')}
            />
            <TextField
              id="phone"
              label="Nomor ponsel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              hint="Dipakai kurir untuk menghubungi Anda."
              required
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
        </FormSection>

        <FormSection title="Alamat pengiriman">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id="fullName"
              label="Nama penerima"
              autoComplete="name"
              required
              className="md:col-span-2"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <TextAreaField
              id="address"
              label="Alamat lengkap"
              autoComplete="street-address"
              required
              className="md:col-span-2"
              error={errors.address?.message}
              {...register('address')}
            />
            <TextField
              id="city"
              label="Kota atau kabupaten"
              autoComplete="address-level2"
              required
              error={errors.city?.message}
              {...register('city')}
            />
            <TextField
              id="province"
              label="Provinsi"
              autoComplete="address-level1"
              required
              error={errors.province?.message}
              {...register('province')}
            />
            <TextField
              id="postalCode"
              label="Kode pos"
              inputMode="numeric"
              autoComplete="postal-code"
              required
              error={errors.postalCode?.message}
              {...register('postalCode')}
            />
            <TextField
              id="notes"
              label="Catatan untuk kurir"
              error={errors.notes?.message}
              {...register('notes')}
            />
          </div>
        </FormSection>

        <FormSection title="Metode pengiriman">
          <div className="grid gap-3">
            {(Object.keys(SHIPPING_OPTIONS) as (keyof typeof SHIPPING_OPTIONS)[]).map((method) => {
              const cost = shippingCost(subtotal, method)
              return (
                <OptionCard
                  key={method}
                  label={SHIPPING_OPTIONS[method].label}
                  hint={SHIPPING_OPTIONS[method].eta}
                  aside={cost === 0 ? 'Gratis' : formatRupiah(cost)}
                  checked={shippingMethod === method}
                  input={
                    <input
                      type="radio"
                      value={method}
                      className="size-5 accent-primary"
                      {...register('shippingMethod')}
                    />
                  }
                />
              )
            })}
          </div>
        </FormSection>

        <FormSection title="Metode pembayaran">
          <div className="grid gap-3">
            {PAYMENT_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                label={option.label}
                hint={option.hint}
                checked={paymentMethod === option.value}
                input={
                  <input
                    type="radio"
                    value={option.value}
                    className="size-5 accent-primary"
                    {...register('paymentMethod')}
                  />
                }
              />
            ))}
          </div>
        </FormSection>
      </div>

      <aside
        aria-label="Ringkasan pesanan"
        className="rounded-xl border border-border bg-card p-4 md:p-6 lg:sticky lg:top-24 lg:self-start"
      >
        <h2 className="mb-4 text-lg font-semibold">Ringkasan pesanan</h2>
        <ul className="mb-4 space-y-2 border-b border-border pb-4 text-sm">
          {lines.map((line) => (
            <li key={line.key} className="flex justify-between gap-4">
              <span>
                {line.product.name} <span className="text-muted-foreground">x{line.quantity}</span>
              </span>
              <span className="tabular-nums">{formatRupiah(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <OrderSummary subtotal={subtotal} shipping={shipping} />
        {submitError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Pesanan gagal dibuat. Periksa koneksi Anda, lalu coba lagi.
          </p>
        )}
        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-4 w-full">
          {isSubmitting ? 'Memproses...' : 'Buat Pesanan'}
        </Button>
      </aside>
    </form>
  )
}

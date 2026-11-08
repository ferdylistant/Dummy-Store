'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ChevronDown, Clock, ShieldCheck, ShoppingBag } from 'lucide-react'
import { m } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useForm, useWatch, type FieldErrors, type UseFormSetValue } from 'react-hook-form'
import { Button, ButtonArrow, buttonClasses } from '@/components/ui/button'
import { TextAreaField, TextField } from '@/components/ui/text-field'
import { formatAddress, regionOf } from '@/features/account/address-book'
import { EMPTY_REGION, RegionField, type RegionValue } from '@/features/account/region-field'
import { CartLoadError } from '@/features/cart/cart-load-error'
import { OrderSummary } from '@/features/cart/order-summary'
import { useCart } from '@/features/cart/store'
import { useCartLines, type CartLine } from '@/features/cart/use-cart-lines'
import { authClient } from '@/lib/auth-client'
import { formatRupiah } from '@/lib/format'
import { PAYMENT_GROUPS } from '@/lib/payment-methods'
import { shippingCost, SHIPPING_OPTIONS } from '@/lib/pricing'
import { useStoreSettings } from '@/features/store/store-settings'
import { cn } from '@/lib/utils'
import { getAddresses, type Address } from '@/services/account'
import { ApiError } from '@/services/api'
import { createOrder } from '@/services/orders'
import { CheckoutSkeleton } from './checkout-skeleton'
import { CheckoutSteps } from './checkout-steps'
import { checkoutSchema, type CheckoutValues } from './schema'
import { loadSnap, openSnap } from './snap'

const STEPS = [
  {
    title: 'Data Diri',
    fields: ['email', 'phone', 'fullName', 'address', 'regionCode', 'notes'],
  },
  { title: 'Pengiriman', fields: ['shippingMethod'] },
  { title: 'Pembayaran', fields: ['paymentMethod'] },
] as const

const STEP_TITLES = STEPS.map((step) => step.title)
const LAST_STEP = STEPS.length - 1

const NEW_ADDRESS = 'baru'

function setRegion(setValue: UseFormSetValue<CheckoutValues>, region: RegionValue, validate: boolean) {
  const options = { shouldValidate: validate, shouldDirty: true }
  setValue('regionCode', region.regionCode, options)
  setValue('province', region.province, options)
  setValue('city', region.city, options)
  setValue('district', region.district, options)
  setValue('village', region.village, options)
  setValue('postalCode', region.postalCode, options)
}

function fillAddress(setValue: UseFormSetValue<CheckoutValues>, address: Address | null) {
  const options = { shouldValidate: false, shouldDirty: true }
  setValue('fullName', address?.recipient ?? '', options)
  setValue('phone', address?.phone ?? '', options)
  setValue('address', address?.address ?? '', options)
  setRegion(setValue, address ? regionOf(address) : EMPTY_REGION, false)
}

/** Saved addresses from before villages were required cannot be shipped to. */
const usable = (address: Address) => Boolean(address.regionCode)

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
        'flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
        checked ? 'border-foreground bg-muted' : 'border-input hover:border-foreground',
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

function ReviewRow({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 text-sm">
        <p className="font-medium">{title}</p>
        <div className="mt-0.5 text-muted-foreground [overflow-wrap:anywhere]">{children}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Ubah ${title.toLowerCase()}`}
        className="min-h-11 shrink-0 cursor-pointer px-1 text-sm font-medium"
      >
        <span className="link-stitch">Ubah</span>
      </button>
    </div>
  )
}

function OrderLines({ lines }: { lines: CartLine[] }) {
  return (
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
  )
}

export function CheckoutForm() {
  const router = useRouter()
  const items = useCart((state) => state.items)
  const clear = useCart((state) => state.clear)
  const { lines, subtotal, isLoading, isError, retry } = useCartLines()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [submitError, setSubmitError] = useState('')
  const [unfinished, setUnfinished] = useState(false)
  const [ordered, setOrdered] = useState(false)
  // Stays the same across retries, so reopening payment reuses the same order.
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const { data: session } = authClient.useSession()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressChoice, setAddressChoice] = useState<string>(NEW_ADDRESS)
  const [saveAddress, setSaveAddress] = useState(true)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shownStep = useRef(0)

  const {
    register,
    handleSubmit,
    trigger,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
    defaultValues: { shippingMethod: 'reguler', ...EMPTY_REGION },
  })

  const userId = session?.user.id
  const userEmail = session?.user.email

  // A signed in shopper starts from their default address, like a marketplace app.
  useEffect(() => {
    if (!userId) return
    if (userEmail && !getValues('email')) setValue('email', userEmail)
    let current = true
    getAddresses()
      .then((saved) => {
        if (!current || saved.length === 0) return
        setAddresses(saved)
        const preferred = saved.find((item) => item.isDefault && usable(item)) ?? saved.find(usable)
        if (preferred && !getValues('address')) {
          fillAddress(setValue, preferred)
          setAddressChoice(String(preferred.id))
        }
      })
      .catch(() => {})
    return () => {
      current = false
    }
  }, [userId, userEmail, getValues, setValue])

  function chooseAddress(choice: string) {
    setAddressChoice(choice)
    fillAddress(setValue, addresses.find((item) => String(item.id) === choice) ?? null)
  }

  const newAddress = addressChoice === NEW_ADDRESS

  const values = useWatch({ control })
  const shippingMethod = values.shippingMethod ?? 'reguler'
  const store = useStoreSettings()
  const shipping = shippingCost(subtotal, shippingMethod, store)

  // The browser back button moves between steps instead of leaving the form.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      setDirection(-1)
      setStep((event.state?.checkoutStep as number | undefined) ?? 0)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (shownStep.current === step) return
    shownStep.current = step
    window.scrollTo({ top: 0 })
    headingRef.current?.focus({ preventScroll: true })
  }, [step])

  function goTo(next: number) {
    setSubmitError('')
    setDirection(next > step ? 1 : -1)
    setStep(next)
    window.history.pushState({ checkoutStep: next }, '')
  }

  function finish(orderNumber: string) {
    setOrdered(true)
    clear()
    router.replace(`/checkout/berhasil?pesanan=${encodeURIComponent(orderNumber)}`)
  }

  async function onSubmit(customer: CheckoutValues) {
    setSubmitError('')
    setUnfinished(false)
    try {
      const order = await createOrder(
        { customer, items, saveAddress: Boolean(session) && newAddress && saveAddress },
        idempotencyKey,
      )
      // Transfers, QR codes, and e-wallets are shown on the order page with the store's own UI.
      if (!order.payment || order.payment.instructions.kind !== 'snap') {
        finish(order.orderNumber)
        return
      }

      // Cards open Midtrans, because the bank's 3D Secure check must run on its page.
      await loadSnap(order.payment.scriptUrl, order.payment.clientKey)
      const outcome = await openSnap(order.payment.instructions.token)
      if (outcome === 'success' || outcome === 'pending') finish(order.orderNumber)
      else if (outcome === 'close') setUnfinished(true)
      else setSubmitError('Pembayaran gagal diproses. Coba lagi atau pilih metode lain.')
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : 'Jendela pembayaran gagal dibuka. Periksa koneksi, lalu coba lagi.',
      )
    }
  }

  /** A field from an earlier step can only fail here if its step was skipped. */
  function onInvalid(fieldErrors: FieldErrors<CheckoutValues>) {
    const invalid = STEPS.findIndex((item) =>
      (item.fields as readonly string[]).some((field) => field in fieldErrors),
    )
    if (invalid >= 0) goTo(invalid)
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === LAST_STEP) {
      await handleSubmit(onSubmit, onInvalid)(event)
      return
    }
    const valid = await trigger([...STEPS[step].fields], { shouldFocus: true })
    if (valid) goTo(step + 1)
  }

  if (isLoading) return <CheckoutSkeleton />

  if (isError) return <CartLoadError onRetry={retry} />

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

  const summary = (
    <>
      <OrderLines lines={lines} />
      <OrderSummary subtotal={subtotal} shipping={shipping} />
    </>
  )

  return (
    <div className="grid gap-8 lg:grid-cols-3 lg:gap-12">
      <div className="min-w-0 lg:col-span-2">
        <CheckoutSteps titles={STEP_TITLES} current={step} onSelect={goTo} />

        <details className="group mt-6 rounded-xl bg-muted p-4 lg:hidden">
          <summary className="flex min-h-7 items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
            <span>Ringkasan pesanan</span>
            <span className="flex items-center gap-2 tabular-nums">
              {formatRupiah(subtotal + shipping)}
              <ChevronDown
                aria-hidden="true"
                className="size-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              />
            </span>
          </summary>
          <div className="mt-4">{summary}</div>
        </details>

        <form noValidate onSubmit={handleFormSubmit} className="mt-8">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight outline-none lg:text-3xl"
          >
            {STEPS[step].title}
          </h2>

          <m.div
            key={step}
            initial={{ opacity: 0, x: direction * 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22 }}
            className="mt-6"
          >
            {step === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {!session && (
                  <p className="rounded-xl bg-muted p-3 text-sm md:col-span-2">
                    Punya akun?{' '}
                    <Link href="/masuk?next=/checkout" className="font-medium">
                      <span className="link-stitch">Masuk</span>
                    </Link>{' '}
                    untuk memakai alamat tersimpan. Tanpa akun juga bisa.
                  </p>
                )}
                {addresses.length > 0 && (
                  <fieldset className="grid gap-3 md:col-span-2">
                    <legend className="mb-2 text-sm font-medium">Kirim ke</legend>
                    {addresses.map((address) =>
                      usable(address) ? (
                        <OptionCard
                          key={address.id}
                          label={`${address.label} · ${address.recipient}`}
                          hint={`${address.phone} · ${formatAddress(address)}`}
                          aside={address.isDefault ? 'Utama' : undefined}
                          checked={addressChoice === String(address.id)}
                          input={
                            <input
                              type="radio"
                              name="saved-address"
                              value={address.id}
                              checked={addressChoice === String(address.id)}
                              onChange={() => chooseAddress(String(address.id))}
                              className="size-5 accent-primary"
                            />
                          }
                        />
                      ) : (
                        <div key={address.id} className="rounded-xl border border-dashed border-input p-4 text-sm">
                          <p className="font-medium">
                            {address.label} · {address.recipient}
                          </p>
                          <p className="mt-0.5 text-muted-foreground">
                            Belum ada desa atau kelurahan, jadi belum bisa dipakai.{' '}
                            <Link href="/akun/alamat" className="font-medium text-foreground">
                              <span className="link-stitch">Lengkapi di Akun</span>
                            </Link>
                          </p>
                        </div>
                      ),
                    )}
                    <OptionCard
                      label="Alamat baru"
                      hint="Tulis alamat lain untuk pesanan ini."
                      checked={newAddress}
                      input={
                        <input
                            type="radio"
                            name="saved-address"
                            value={NEW_ADDRESS}
                            checked={addressChoice === String(NEW_ADDRESS)}
                            onChange={() => chooseAddress(NEW_ADDRESS)}
                            className="size-5 accent-primary"
                          />
                      }
                    />
                  </fieldset>
                )}
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
                  className={newAddress ? undefined : 'hidden'}
                  label="Nomor ponsel"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  hint="Dipakai kurir untuk menghubungi Anda."
                  required
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                <TextField
                  id="fullName"
                  label="Nama penerima"
                  autoComplete="name"
                  required
                  className={cn('md:col-span-2', !newAddress && 'hidden')}
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />
                <TextAreaField
                  id="address"
                  label="Nama jalan, nomor rumah, RT/RW"
                  autoComplete="street-address"
                  required
                  className={cn('md:col-span-2', !newAddress && 'hidden')}
                  error={errors.address?.message}
                  {...register('address')}
                />
                {newAddress && (
                  <div className="md:col-span-2">
                    <RegionField
                      idPrefix="checkout"
                      value={{
                        regionCode: values.regionCode ?? '',
                        province: values.province ?? '',
                        city: values.city ?? '',
                        district: values.district ?? '',
                        village: values.village ?? '',
                        postalCode: values.postalCode ?? '',
                      }}
                      onChange={(region) => setRegion(setValue, region, Boolean(region.regionCode))}
                      error={errors.regionCode?.message}
                    />
                  </div>
                )}
                {session && newAddress && (
                  <label className="flex min-h-11 items-center gap-3 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(event) => setSaveAddress(event.target.checked)}
                      className="size-5 accent-primary"
                    />
                    <span className="text-sm">Simpan alamat ini ke akun saya</span>
                  </label>
                )}
                <TextField
                  id="notes"
                  label="Catatan untuk kurir"
                  error={errors.notes?.message}
                  {...register('notes')}
                />
              </div>
            )}

            {step === 1 && (
              <fieldset className="grid gap-3">
                <legend className="sr-only">Metode pengiriman</legend>
                {(Object.keys(SHIPPING_OPTIONS) as (keyof typeof SHIPPING_OPTIONS)[]).map(
                  (method) => {
                    const cost = shippingCost(subtotal, method, store)
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
                  },
                )}
              </fieldset>
            )}

            {step === 2 && (
              <>
                <fieldset
                  aria-describedby={errors.paymentMethod ? 'payment-error' : undefined}
                  className="grid gap-6"
                >
                  <legend className="sr-only">Metode pembayaran</legend>
                  {PAYMENT_GROUPS.map((group) => (
                    <div key={group.title}>
                      <p className="font-medium">{group.title}</p>
                      <p className="text-sm text-muted-foreground">{group.hint}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {group.methods.map((method) => {
                          const checked = values.paymentMethod === method.value
                          return (
                            <label
                              key={method.value}
                              className={cn(
                                'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring',
                                group.methods.length === 1 && 'col-span-2 sm:col-span-3',
                                checked
                                  ? 'border-foreground bg-muted'
                                  : 'border-input hover:border-foreground',
                              )}
                            >
                              <input
                                type="radio"
                                value={method.value}
                                className="size-5 shrink-0 accent-primary"
                                {...register('paymentMethod')}
                              />
                              {method.label}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {errors.paymentMethod && (
                    <p id="payment-error" role="alert" className="text-sm text-destructive">
                      {errors.paymentMethod.message}
                    </p>
                  )}
                </fieldset>

                <div className="mt-6 grid gap-2 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
                    Diproses aman oleh Midtrans. Nomor virtual account atau kode QR langsung tampil
                    setelah Anda menekan Bayar Sekarang.
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock aria-hidden="true" className="size-4 shrink-0" />
                    Batas bayar 24 jam untuk transfer, 1 jam untuk QRIS dan dompet digital.
                  </p>
                </div>

                <section aria-labelledby="tinjau" className="mt-8">
                  <h3 id="tinjau" className="font-semibold">
                    Tinjau pesanan
                  </h3>
                  <div className="mt-1 divide-y divide-border border-y border-border">
                    <ReviewRow title="Email" onEdit={() => goTo(0)}>
                      {values.email}
                    </ReviewRow>
                    <ReviewRow title="Alamat pengiriman" onEdit={() => goTo(0)}>
                      {values.fullName}
                      <br />
                      {values.phone}
                      <br />
                      {values.address}, {values.village}, {values.district}, {values.city},{' '}
                      {values.province} {values.postalCode}
                    </ReviewRow>
                    <ReviewRow title="Metode pengiriman" onEdit={() => goTo(1)}>
                      {SHIPPING_OPTIONS[shippingMethod].label},{' '}
                      {SHIPPING_OPTIONS[shippingMethod].eta}
                    </ReviewRow>
                  </div>
                </section>
              </>
            )}
          </m.div>

          {unfinished && (
            <p role="status" className="mt-4 rounded-xl bg-muted p-3 text-sm">
              Pembayaran belum selesai. Pesanan Anda tetap tersimpan, tekan Bayar Sekarang untuk
              melanjutkan.
            </p>
          )}
          {submitError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {step > 0 ? (
              <Button variant="outline" size="lg" onClick={() => goTo(step - 1)}>
                <ArrowLeft aria-hidden="true" className="size-5" />
                Kembali
              </Button>
            ) : (
              <Link href="/keranjang" className={buttonClasses({ variant: 'outline', size: 'lg' })}>
                <ArrowLeft aria-hidden="true" className="size-5" />
                Keranjang
              </Link>
            )}
            <Button type="submit" variant="action" disabled={isSubmitting}>
              {step === LAST_STEP
                ? isSubmitting
                  ? 'Membuka pembayaran...'
                  : 'Bayar Sekarang'
                : `Lanjut ke ${STEPS[step + 1].title}`}
              <ButtonArrow />
            </Button>
          </div>
        </form>
      </div>

      <aside
        aria-label="Ringkasan pesanan"
        className="hidden rounded-3xl bg-muted p-6 lg:sticky lg:top-24 lg:block lg:self-start"
      >
        <h2 className="mb-4 text-lg font-semibold">Ringkasan pesanan</h2>
        {summary}
      </aside>
    </div>
  )
}

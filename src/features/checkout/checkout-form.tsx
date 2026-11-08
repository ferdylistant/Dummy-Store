'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ChevronDown, Clock, ShieldCheck, ShoppingBag } from 'lucide-react'
import { m } from 'motion/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { Button, ButtonArrow, buttonClasses } from '@/components/ui/button'
import { TextAreaField, TextField } from '@/components/ui/text-field'
import { CartLoadError } from '@/features/cart/cart-load-error'
import { OrderSummary } from '@/features/cart/order-summary'
import { useCart } from '@/features/cart/store'
import { useCartLines, type CartLine } from '@/features/cart/use-cart-lines'
import { formatRupiah } from '@/lib/format'
import { shippingCost, SHIPPING_OPTIONS } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { ApiError } from '@/services/api'
import { createOrder } from '@/services/orders'
import { CheckoutSkeleton } from './checkout-skeleton'
import { CheckoutSteps } from './checkout-steps'
import { checkoutSchema, type CheckoutValues } from './schema'
import { loadSnap, openSnap } from './snap'

const STEPS = [
  {
    title: 'Data Diri',
    fields: ['email', 'phone', 'fullName', 'address', 'city', 'province', 'postalCode', 'notes'],
  },
  { title: 'Pengiriman', fields: ['shippingMethod'] },
  { title: 'Pembayaran', fields: [] },
] as const

const STEP_TITLES = STEPS.map((step) => step.title)
const LAST_STEP = STEPS.length - 1

const PAYMENT_METHODS = ['Virtual account bank', 'QRIS', 'Dompet digital', 'Kartu kredit']

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
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shownStep = useRef(0)

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onTouched',
    defaultValues: { shippingMethod: 'reguler' },
  })

  const values = useWatch({ control })
  const shippingMethod = values.shippingMethod ?? 'reguler'
  const shipping = shippingCost(subtotal, shippingMethod)

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
      const order = await createOrder({ customer, items }, idempotencyKey)
      if (!order.payment) {
        finish(order.orderNumber)
        return
      }

      await loadSnap(order.payment.scriptUrl, order.payment.clientKey)
      const outcome = await openSnap(order.payment.token)
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
            )}

            {step === 1 && (
              <fieldset className="grid gap-3">
                <legend className="sr-only">Metode pengiriman</legend>
                {(Object.keys(SHIPPING_OPTIONS) as (keyof typeof SHIPPING_OPTIONS)[]).map(
                  (method) => {
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
                  },
                )}
              </fieldset>
            )}

            {step === 2 && (
              <>
                <div className="rounded-2xl bg-muted p-5">
                  <p className="flex items-center gap-2 font-medium">
                    <ShieldCheck aria-hidden="true" className="size-5" />
                    Pembayaran aman lewat Midtrans
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Pilih cara bayar di jendela pembayaran yang terbuka setelah Anda menekan Bayar
                    Sekarang.
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <li
                        key={method}
                        className="rounded-full bg-background px-3 py-1 text-sm font-medium"
                      >
                        {method}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock aria-hidden="true" className="size-4" />
                    Batas pembayaran 24 jam setelah pesanan dibuat.
                  </p>
                </div>

                <section aria-labelledby="tinjau" className="mt-8">
                  <h3 id="tinjau" className="font-semibold">
                    Tinjau pesanan
                  </h3>
                  <div className="mt-1 divide-y divide-border border-y border-border">
                    <ReviewRow title="Kontak" onEdit={() => goTo(0)}>
                      {values.email}
                      <br />
                      {values.phone}
                    </ReviewRow>
                    <ReviewRow title="Alamat pengiriman" onEdit={() => goTo(0)}>
                      {values.fullName}
                      <br />
                      {values.address}, {values.city}, {values.province} {values.postalCode}
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

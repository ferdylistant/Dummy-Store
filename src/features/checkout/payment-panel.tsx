'use client'

import { Check, ChevronDown, Copy, Smartphone } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { buttonClasses } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'
import {
  BANK_NAMES,
  MANDIRI_GUIDES,
  QR_GUIDES,
  SHOPEEPAY_GUIDES,
  VA_GUIDES,
  type PaymentGuide,
} from '@/lib/payment-guides'
import { cn } from '@/lib/utils'
import type { PaymentInstructions } from '@/services/orders'

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  // Long numbers in groups of four are easier to read out at an ATM. Short codes stay whole.
  const grouped = value.length > 8 ? value.replace(/(\d{4})(?=\d)/g, '$1 ') : value

  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{grouped}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 2000)
            } catch {
              setCopied(false)
            }
          }}
          className={buttonClasses({ variant: 'outline' })}
          aria-label={`Salin ${label.toLowerCase()}`}
        >
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          {copied ? 'Tersalin' : 'Salin'}
        </button>
      </div>
      <p role="status" className="sr-only">
        {copied ? `${label} tersalin` : ''}
      </p>
    </div>
  )
}

/** Draws the QR code in the page, so it never depends on an outside image. */
function QrImage({ text, imageUrl, label }: { text: string | null; imageUrl: string | null; label: string }) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    if (!text) return
    let active = true
    QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then((value) => {
      if (active) setSvg(value)
    })
    return () => {
      active = false
    }
  }, [text])

  return (
    <div className="mx-auto w-full max-w-64 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-border">
      {text ? (
        svg ? (
          <div role="img" aria-label={label} className="[&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="aspect-square animate-pulse rounded-lg bg-muted" aria-hidden="true" />
        )
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Midtrans serves this image per transaction
        <img src={imageUrl} alt={label} className="aspect-square w-full" />
      ) : null}
    </div>
  )
}

function Guides({ guides }: { guides: PaymentGuide[] }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Cara bayar</h2>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {guides.map((guide, index) => (
          <details key={guide.channel} open={index === 0} className="group">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
              {guide.channel}
              <ChevronDown
                aria-hidden="true"
                className="size-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <ol className="mb-4 grid gap-2 text-sm leading-relaxed text-muted-foreground">
              {guide.steps.map((step, stepIndex) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground tabular-nums">
                    {stepIndex + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>
    </div>
  )
}

function useCountdown(deadline: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  if (!deadline) return null
  const left = Math.max(0, Date.parse(deadline) - now)
  const hours = Math.floor(left / 3_600_000)
  const minutes = Math.floor((left % 3_600_000) / 60_000)
  const seconds = Math.floor((left % 60_000) / 1000)
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

const deadlineFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' })

/** The number, code, or app link for an unpaid order, with steps to pay it. */
export function PaymentPanel({
  orderNumber,
  total,
  expiresAt,
  instructions,
  onOpenCard,
}: {
  orderNumber: string
  total: number
  expiresAt: string | null
  instructions: PaymentInstructions
  onOpenCard?: () => void
}) {
  const countdown = useCountdown(expiresAt)

  let title: string
  let main: React.ReactNode
  let guides: PaymentGuide[] = []

  switch (instructions.kind) {
    case 'va':
      title = `Virtual account ${BANK_NAMES[instructions.bank]}`
      main = <CopyValue label="Nomor virtual account" value={instructions.number} />
      guides = VA_GUIDES[instructions.bank]
      break
    case 'bill':
      title = 'Mandiri Bill Payment'
      main = (
        <div className="grid gap-5">
          <CopyValue label="Kode perusahaan" value={instructions.billerCode} />
          <CopyValue label="Kode bayar" value={instructions.billKey} />
        </div>
      )
      guides = MANDIRI_GUIDES
      break
    case 'qr':
      title = instructions.provider === 'gopay' ? 'GoPay' : 'QRIS'
      main = (
        <div className="grid gap-4">
          <QrImage
            text={instructions.qrString}
            imageUrl={instructions.qrUrl}
            label={`Kode QR pembayaran ${title} untuk pesanan ${orderNumber}`}
          />
          {instructions.appUrl && (
            <a href={instructions.appUrl} className={cn(buttonClasses({ variant: 'primary' }), 'md:hidden')}>
              <Smartphone aria-hidden="true" className="size-4" />
              Buka GoPay
            </a>
          )}
        </div>
      )
      guides = QR_GUIDES[instructions.provider]
      break
    case 'app':
      title = 'ShopeePay'
      main = (
        <div className="grid gap-4">
          <a href={instructions.appUrl} className={buttonClasses({ variant: 'primary' })}>
            <Smartphone aria-hidden="true" className="size-4" />
            Buka ShopeePay
          </a>
          <div className="hidden md:block">
            <p className="mb-3 text-center text-sm text-muted-foreground">Atau scan dengan kamera ponsel</p>
            <QrImage text={instructions.appUrl} imageUrl={null} label="Kode QR untuk membuka ShopeePay di ponsel" />
          </div>
        </div>
      )
      guides = SHOPEEPAY_GUIDES
      break
    case 'snap':
      title = 'Kartu kredit atau debit'
      main = (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Data kartu dan kode OTP dimasukkan di halaman aman Midtrans dan bank Anda.
          </p>
          {onOpenCard ? (
            <button type="button" onClick={onOpenCard} className={buttonClasses({ variant: 'primary' })}>
              Bayar dengan Kartu
            </button>
          ) : (
            <a href={instructions.redirectUrl} className={buttonClasses({ variant: 'primary' })}>
              Bayar dengan Kartu
            </a>
          )}
        </div>
      )
      break
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <section aria-labelledby="bayar" className="rounded-3xl bg-muted p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Menunggu pembayaran</p>
        <h1 id="bayar" className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
          {title}
        </h1>
        <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-dashed border-input py-4">
          <div>
            <dt className="text-sm text-muted-foreground">Total tagihan</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{formatRupiah(total)}</dd>
          </div>
          {countdown && (
            <div>
              <dt className="text-sm text-muted-foreground">Sisa waktu</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums" aria-live="off">
                {countdown}
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-6">{main}</div>
        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
          Bayar tepat {formatRupiah(total)}
          {expiresAt && <> sebelum {deadlineFormat.format(new Date(expiresAt))}</>}. Pesanan{' '}
          <span className="font-medium text-foreground tabular-nums">{orderNumber}</span> otomatis
          diproses setelah pembayaran masuk, halaman ini ikut diperbarui.
        </p>
      </section>
      {guides.length > 0 && <Guides guides={guides} />}
    </div>
  )
}

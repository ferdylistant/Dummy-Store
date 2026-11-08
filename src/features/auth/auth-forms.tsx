'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, ButtonArrow } from '@/components/ui/button'
import { PasswordField } from '@/components/ui/password-field'
import { TextField } from '@/components/ui/text-field'
import { authClient, authErrorMessage } from '@/lib/auth-client'
import { GoogleButton } from './google-button'

const email = z.email('Tulis email yang valid, misalnya nama@email.com.')
const password = z.string().min(8, 'Password minimal 8 karakter.').max(128)

function origin() {
  return window.location.origin
}

function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl bg-muted p-3 text-sm text-destructive">
      {message}
    </p>
  )
}

function SentNotice({ email: address, children }: { email: string; children?: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center text-center">
      <span className="grid size-14 place-items-center rounded-full bg-muted">
        <MailCheck aria-hidden="true" className="size-7" />
      </span>
      <p className="mt-4 font-medium">Cek email Anda</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Kami mengirim tautan ke <span className="font-medium text-foreground">{address}</span>. Buka
        tautan itu untuk melanjutkan. Periksa juga folder spam.
      </p>
      {children}
    </div>
  )
}

export function SignInForm({ next }: { next: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const form = useForm({
    resolver: zodResolver(z.object({ email, password: z.string().min(1, 'Tulis password Anda.') })),
    mode: 'onTouched',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError('')
    const { error: failure } = await authClient.signIn.email({
      ...values,
      callbackURL: `${origin()}${next}`,
    })
    if (failure) {
      setError(authErrorMessage(failure))
      return
    }
    router.replace(next)
    router.refresh()
  })

  return (
    <>
      <GoogleButton next={next} />
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <FormError message={error} />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <div>
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Link href="/lupa-password" className="mt-2 inline-flex min-h-9 items-center text-sm font-medium">
            <span className="link-stitch">Lupa password?</span>
          </Link>
        </div>
        <Button type="submit" variant="action" disabled={form.formState.isSubmitting} className="mt-2">
          {form.formState.isSubmitting ? 'Memproses...' : 'Masuk'}
          <ButtonArrow />
        </Button>
      </form>
    </>
  )
}

export function SignUpForm({ next }: { next: string }) {
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const form = useForm({
    resolver: zodResolver(
      z.object({ name: z.string().trim().min(2, 'Tulis nama Anda.').max(80), email, password }),
    ),
    mode: 'onTouched',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError('')
    const { error: failure } = await authClient.signUp.email({
      ...values,
      callbackURL: `${origin()}${next}`,
    })
    if (failure) {
      setError(authErrorMessage(failure))
      return
    }
    setSentTo(values.email)
  })

  if (sentTo) {
    return (
      <SentNotice email={sentTo}>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() =>
            authClient.sendVerificationEmail({ email: sentTo, callbackURL: `${origin()}${next}` })
          }
        >
          Kirim ulang tautan
        </Button>
      </SentNotice>
    )
  }

  return (
    <>
      <GoogleButton next={next} />
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        <FormError message={error} />
        <TextField
          id="name"
          label="Nama"
          autoComplete="name"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <PasswordField
          id="password"
          label="Password"
          autoComplete="new-password"
          hint="Minimal 8 karakter."
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" variant="action" disabled={form.formState.isSubmitting} className="mt-2">
          {form.formState.isSubmitting ? 'Memproses...' : 'Daftar'}
          <ButtonArrow />
        </Button>
      </form>
    </>
  )
}

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')
  const form = useForm({ resolver: zodResolver(z.object({ email })), mode: 'onTouched' })

  const onSubmit = form.handleSubmit(async (values) => {
    setError('')
    const { error: failure } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: `${origin()}/atur-ulang-password`,
    })
    // The reply is the same whether or not the email exists, so accounts stay private.
    if (failure?.status === 429) setError(authErrorMessage(failure))
    else setSentTo(values.email)
  })

  if (sentTo) return <SentNotice email={sentTo} />

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-4">
      <FormError message={error} />
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <Button type="submit" variant="action" disabled={form.formState.isSubmitting}>
        Kirim Tautan
        <ButtonArrow />
      </Button>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const form = useForm({
    resolver: zodResolver(
      z
        .object({ password, confirm: z.string() })
        .refine((value) => value.password === value.confirm, {
          path: ['confirm'],
          message: 'Password tidak sama.',
        }),
    ),
    mode: 'onTouched',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setError('')
    const { error: failure } = await authClient.resetPassword({ newPassword: values.password, token })
    if (failure) {
      setError(authErrorMessage(failure))
      return
    }
    router.replace('/masuk?reset=1')
  })

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-4">
      <FormError message={error} />
      <PasswordField
        id="password"
        label="Password baru"
        autoComplete="new-password"
        hint="Minimal 8 karakter."
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <PasswordField
        id="confirm"
        label="Ulangi password baru"
        autoComplete="new-password"
        error={form.formState.errors.confirm?.message}
        {...form.register('confirm')}
      />
      <Button type="submit" variant="action" disabled={form.formState.isSubmitting}>
        Simpan Password
        <ButtonArrow />
      </Button>
    </form>
  )
}

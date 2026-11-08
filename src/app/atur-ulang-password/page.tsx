import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/features/auth/auth-shell'
import { ResetPasswordForm } from '@/features/auth/auth-forms'

export const metadata: Metadata = { title: 'Atur Ulang Password', robots: { index: false, follow: false } }

export default async function ResetPasswordPage(props: PageProps<'/atur-ulang-password'>) {
  const { token, error } = await props.searchParams
  const valid = typeof token === 'string' && !error

  return (
    <AuthShell
      mode="pulih"
      title={valid ? 'Buat password baru' : 'Tautan tidak berlaku'}
      intro={valid ? undefined : 'Tautan ini sudah kedaluwarsa atau pernah dipakai. Minta tautan baru.'}
      footer={
        <Link href={valid ? '/masuk' : '/lupa-password'} className="font-medium text-foreground">
          <span className="link-stitch">{valid ? 'Kembali ke Masuk' : 'Minta tautan baru'}</span>
        </Link>
      }
    >
      {valid && <ResetPasswordForm token={token} />}
    </AuthShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/features/auth/auth-shell'
import { ForgotPasswordForm } from '@/features/auth/auth-forms'

export const metadata: Metadata = { title: 'Lupa Password', robots: { index: false, follow: false } }

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Lupa password"
      intro="Tulis email akun Anda. Kami kirim tautan untuk membuat password baru."
      footer={
        <Link href="/masuk" className="font-medium text-foreground">
          <span className="link-stitch">Kembali ke Masuk</span>
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}

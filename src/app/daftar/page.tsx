import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/features/auth/auth-shell'
import { SignUpForm } from '@/features/auth/auth-forms'
import { safeNext } from '@/lib/safe-next'

export const metadata: Metadata = { title: 'Daftar', robots: { index: false, follow: false } }

export default async function SignUpPage(props: PageProps<'/daftar'>) {
  const next = safeNext((await props.searchParams).next)

  return (
    <AuthShell
      title="Buat akun"
      intro="Simpan alamat untuk checkout lebih cepat dan pantau pengiriman pesanan."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link href={`/masuk?next=${encodeURIComponent(next)}`} className="font-medium text-foreground">
            <span className="link-stitch">Masuk</span>
          </Link>
        </>
      }
    >
      <SignUpForm next={next} />
    </AuthShell>
  )
}

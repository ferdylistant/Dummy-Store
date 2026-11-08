import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/features/auth/auth-shell'
import { SignInForm } from '@/features/auth/auth-forms'
import { safeNext } from '@/lib/safe-next'

export const metadata: Metadata = { title: 'Masuk', robots: { index: false, follow: false } }

export default async function SignInPage(props: PageProps<'/masuk'>) {
  const params = await props.searchParams
  const next = safeNext(params.next)

  return (
    <AuthShell
      mode="masuk"
      next={next}
      title="Masuk"
      intro={
        params.reset
          ? 'Password berhasil diganti. Silakan masuk dengan password baru.'
          : 'Lihat pesanan dan pakai alamat tersimpan saat checkout.'
      }
      footer={
        <>
          Belum punya akun?{' '}
          <Link href={`/daftar?next=${encodeURIComponent(next)}`} className="font-medium text-foreground">
            <span className="link-stitch">Buat akun gratis</span>
          </Link>
        </>
      }
    >
      <SignInForm next={next} />
    </AuthShell>
  )
}

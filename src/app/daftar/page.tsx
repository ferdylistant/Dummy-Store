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
      mode="daftar"
      next={next}
      signedInTo={next}
      title="Buat akun"
      intro="Simpan alamat untuk checkout lebih cepat dan pantau pengiriman pesanan."
      footer={
        <>
          Dengan mendaftar, Anda setuju dengan{' '}
          <Link href="/syarat-ketentuan" className="font-medium text-foreground">
            <span className="link-stitch">Syarat dan Ketentuan</span>
          </Link>{' '}
          serta{' '}
          <Link href="/kebijakan-privasi" className="font-medium text-foreground">
            <span className="link-stitch">Kebijakan Privasi</span>
          </Link>
          .
        </>
      }
    >
      <SignUpForm next={next} />
    </AuthShell>
  )
}

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AccountShell } from '@/features/account/account-shell'

export const metadata: Metadata = { title: 'Akun Saya', robots: { index: false, follow: false } }

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>
}

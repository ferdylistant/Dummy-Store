'use client'

import { CircleUserRound, UserRound } from 'lucide-react'
import Link from 'next/link'
import { buttonClasses } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export function AccountButton() {
  const { data: session } = authClient.useSession()
  const Icon = session ? CircleUserRound : UserRound

  return (
    <Link
      href={session ? '/akun' : '/masuk'}
      aria-label={session ? `Akun saya, ${session.user.name}` : 'Masuk atau daftar'}
      className={buttonClasses({ variant: 'ghost', size: 'icon' })}
    >
      <Icon aria-hidden="true" className="size-5" />
    </Link>
  )
}

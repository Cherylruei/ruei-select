import { redirect } from 'next/navigation'
import { getServerUser, getServerUserProfile } from '@/lib/auth/session'
import AdminShell from '../components/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()

  if (!user) {
    redirect('/admin/login')
  }

  const profile = await getServerUserProfile()

  return (
    <AdminShell
      displayName={profile?.display_name ?? '商家'}
      avatarUrl={profile?.avatar_url ?? null}
    >
      {children}
    </AdminShell>
  )
}

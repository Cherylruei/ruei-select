import { redirect } from 'next/navigation'
import { getServerSession, getServerUserProfile } from '@/lib/auth/session'
import AdminShell from '../components/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()

  if (!session) {
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

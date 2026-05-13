import { redirect } from 'next/navigation'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import AdminShell from './components/AdminShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createRouteHandlerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  let displayName = '商家'
  let avatarUrl: string | null = null

  const match = user.email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  if (match) {
    const serviceClient = createServiceClient()
    const { data } = (await serviceClient
      .from('users')
      .select('display_name, avatar_url')
      .eq('line_id', match[1])
      .single()) as {
      data: { display_name: string; avatar_url: string | null } | null
      error: unknown
    }
    if (data) {
      displayName = data.display_name
      avatarUrl = data.avatar_url
    }
  }

  return (
    <AdminShell displayName={displayName} avatarUrl={avatarUrl}>
      {children}
    </AdminShell>
  )
}

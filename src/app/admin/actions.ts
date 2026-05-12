'use server'

import { redirect } from 'next/navigation'
import { createRouteHandlerClient } from '@/lib/supabase/server'

export async function logout() {
  const supabase = await createRouteHandlerClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

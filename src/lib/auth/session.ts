import { cache } from 'react'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'

// getSession() 讀取 cookie 本地解析 JWT，不打 Supabase API
// Middleware 已用 getUser() 完成安全驗證並更新 token，這裡直接信任 cookie
export const getServerSession = cache(async () => {
  const supabase = await createRouteHandlerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
})

function parseLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

// 從 session 取得 line_id，同一次 render 只解析一次
export const getServerLineId = cache(async (): Promise<string | null> => {
  const session = await getServerSession()
  return parseLineId(session?.user.email)
})

// 查 users 表：id, display_name, avatar_url
// cache() 確保 layout 和 page 共用同一次 DB 查詢結果
export const getServerUserProfile = cache(async () => {
  const lineId = await getServerLineId()
  if (!lineId) return null

  const serviceClient = createServiceClient()
  const { data } = (await serviceClient
    .from('users')
    .select('id, display_name, avatar_url')
    .eq('line_id', lineId)
    .single()) as {
    data: { id: string; display_name: string; avatar_url: string | null } | null
    error: unknown
  }
  return data
})

// 查 stores 表：store id
// 供各 page 使用，避免每個 page 自己重查
export const getServerStore = cache(async () => {
  const profile = await getServerUserProfile()
  if (!profile) return null

  const serviceClient = createServiceClient()
  const { data } = (await serviceClient
    .from('stores')
    .select('id')
    .eq('owner_id', profile.id)
    .maybeSingle()) as { data: { id: string } | null; error: unknown }
  return data
})

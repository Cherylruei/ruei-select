import { cache } from 'react'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'

// Supabase 官方：server-side 必須用 getUser()，不能用 getSession()
// getSession() 不保證能正確讀取 server 端 cookie，可能回傳 null 或過期 session
// cache() 確保同一次 server render 內（layout + page）只打一次 Supabase API
export const getServerUser = cache(async () => {
  const supabase = await createRouteHandlerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

function parseLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

// 從 user 取得 line_id，同一次 render 只解析一次
export const getServerLineId = cache(async (): Promise<string | null> => {
  const user = await getServerUser()
  return parseLineId(user?.email)
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

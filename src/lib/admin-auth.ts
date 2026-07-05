import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'

export type MerchantStoreResult =
  | { ok: true; storeId: string; userId: string }
  | { ok: false; status: 401 | 403 | 404; error: string }

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

/**
 * 解析目前登入的商家所屬賣場。
 * 後台 API 共用：驗證 Supabase Auth session → 確認 role=merchant → 取得其賣場 id。
 */
export async function resolveMerchantStore(): Promise<MerchantStoreResult> {
  const rhc = await createRouteHandlerClient()
  const {
    data: { user },
  } = await rhc.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }

  const lineId = extractLineId(user.email)
  if (!lineId) return { ok: false, status: 401, error: 'Invalid session' }

  const serviceClient = createServiceClient()

  const { data: dbUser } = (await serviceClient
    .from('users')
    .select('id, role')
    .eq('line_id', lineId)
    .single()) as { data: { id: string; role: string } | null; error: unknown }

  if (!dbUser) return { ok: false, status: 401, error: 'User not found' }
  if (dbUser.role !== 'merchant') return { ok: false, status: 403, error: 'Forbidden' }

  const { data: store } = (await serviceClient
    .from('stores')
    .select('id')
    .eq('owner_id', dbUser.id)
    .maybeSingle()) as { data: { id: string } | null; error: unknown }

  if (!store) return { ok: false, status: 404, error: 'Store not found' }

  return { ok: true, storeId: store.id, userId: dbUser.id }
}

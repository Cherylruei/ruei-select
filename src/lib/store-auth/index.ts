import { createServiceClient } from '@/lib/supabase/server'
import { verifyLiffToken } from '@/lib/line/verify-token'
import type { StoreAuthResult } from '@/types'

interface StoreRow {
  id: string
  name: string
  avatar_url: string | null
  slug: string
  line_official_account_url: string | null
}

interface MemberRow {
  id: string
  name: string
  phone: string | null
  line_id: string | null
  applied_at: string
  status: string
}

export type StoreAuthError = 'INVALID_TOKEN' | 'STORE_NOT_FOUND'

export interface StoreAuthSuccess {
  result: StoreAuthResult
}

export interface StoreAuthFailure {
  error: StoreAuthError
}

export async function verifyStoreAccess(
  liffToken: string,
  slug: string
): Promise<StoreAuthSuccess | StoreAuthFailure> {
  // verifyLiffToken 已內建 dev bypass：
  // 'dev-mock-token' → { lineId: 'U_dev_mock' }，以下共用同一套查詢邏輯
  const profile = await verifyLiffToken(liffToken)
  if (!profile) return { error: 'INVALID_TOKEN' }

  const db = createServiceClient()

  const storeResult = (await db
    .from('stores')
    .select('id, name, avatar_url, slug')
    .eq('slug', slug)
    .maybeSingle()) as { data: StoreRow | null; error: { message: string } | null }

  if (storeResult.error && process.env.NODE_ENV === 'development') {
    console.error('[verifyStoreAccess] store query error:', storeResult.error.message)
  }
  const { data: store } = storeResult
  if (!store) return { error: 'STORE_NOT_FOUND' }

  const storeWithUrl: StoreAuthResult['store'] = {
    id: store.id,
    name: store.name,
    avatar_url: store.avatar_url,
    slug: store.slug,
    // line_official_account_url 欄位為 Sprint 4 新增，暫時回傳 null
    line_official_account_url: null,
  }

  const userResult = (await db
    .from('users')
    .select('id')
    .eq('line_id', profile.lineId)
    .maybeSingle()) as { data: { id: string } | null; error: { message: string } | null }

  if (userResult.error && process.env.NODE_ENV === 'development') {
    console.error('[verifyStoreAccess] user query error:', userResult.error.message)
  }
  const { data: user } = userResult

  if (!user) {
    return {
      result: { status: 'none', store: storeWithUrl },
    }
  }

  const memberResult = (await db
    .from('store_members')
    .select('id, name, phone, line_id, applied_at, status')
    .eq('store_id', store.id)
    .eq('user_id', user.id)
    .maybeSingle()) as { data: MemberRow | null; error: { message: string } | null }

  if (memberResult.error && process.env.NODE_ENV === 'development') {
    console.error('[verifyStoreAccess] member query error:', memberResult.error.message)
  }
  const { data: member } = memberResult

  if (!member) {
    return {
      result: { status: 'none', store: storeWithUrl },
    }
  }

  const status = member.status as 'pending' | 'approved' | 'rejected'

  if (status === 'approved') {
    return {
      result: {
        status: 'approved',
        store: storeWithUrl,
        member: {
          id: member.id,
          name: member.name,
          phone: member.phone,
          line_id: member.line_id,
          applied_at: member.applied_at,
        },
      },
    }
  }

  return {
    result: { status, store: storeWithUrl },
  }
}

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
  created_at: string
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
  const profile = await verifyLiffToken(liffToken)
  if (!profile) return { error: 'INVALID_TOKEN' }

  const db = createServiceClient()

  const { data: store } = (await db
    .from('stores')
    .select('id, name, avatar_url, slug')
    .eq('slug', slug)
    .maybeSingle()) as { data: StoreRow | null; error: unknown }

  if (!store) return { error: 'STORE_NOT_FOUND' }

  const storeWithUrl: StoreAuthResult['store'] = {
    id: store.id,
    name: store.name,
    avatar_url: store.avatar_url,
    slug: store.slug,
    // line_official_account_url 欄位為 Sprint 4 新增，暫時回傳 null
    line_official_account_url: null,
  }

  const { data: user } = (await db
    .from('users')
    .select('id')
    .eq('line_id', profile.lineId)
    .maybeSingle()) as { data: { id: string } | null; error: unknown }

  if (!user) {
    return {
      result: { status: 'none', store: storeWithUrl },
    }
  }

  const { data: member } = (await db
    .from('store_members')
    .select('id, name, phone, line_id, created_at, status')
    .eq('store_id', store.id)
    .eq('user_id', user.id)
    .maybeSingle()) as { data: MemberRow | null; error: unknown }

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
          created_at: member.created_at,
        },
      },
    }
  }

  return {
    result: { status, store: storeWithUrl },
  }
}

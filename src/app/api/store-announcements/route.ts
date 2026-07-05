import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import type { StoreAnnouncement } from '@/types'

interface AnnouncementRow extends StoreAnnouncement {
  is_active: boolean
  expires_at: string | null
}

// GET /api/store-announcements?slug= — 前台查詢發布中且未到期的公告
// 註：使用頂層 hyphen 路由（同 store-products），避免與 /api/store/[id] 的動態段名衝突
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug')
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return NextResponse.json({ error: 'Missing LIFF token' }, { status: 401 })

    const outcome = await verifyStoreAccess(token, slug)
    if ('error' in outcome) {
      if (outcome.error === 'INVALID_TOKEN')
        return NextResponse.json({ error: 'Invalid LIFF token' }, { status: 401 })
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }
    if (outcome.result.status !== 'approved')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const storeId = outcome.result.store.id
    const serviceClient = createServiceClient()

    const nowIso = new Date().toISOString()
    const { data, error } = (await serviceClient
      .from('store_announcements')
      .select('id, title, content, type, is_active, expires_at, created_at')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })) as {
      data: AnnouncementRow[] | null
      error: { message: string } | null
    }

    if (error) throw new Error(error.message)

    // 過濾未到期（expires_at NULL 或 > 現在）
    const announcements: StoreAnnouncement[] = (data ?? [])
      .filter((a) => a.expires_at === null || a.expires_at > nowIso)
      .map(({ id, title, content, type, created_at }) => ({ id, title, content, type, created_at }))

    return NextResponse.json({ success: true, data: announcements })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveMerchantStore } from '@/lib/admin-auth'
import type { AdminAnnouncement, AnnouncementType } from '@/types'

const VALID_TYPES: AnnouncementType[] = ['info', 'promo', 'warning']

function isPublished(a: { is_active: boolean; expires_at: string | null }): boolean {
  return a.is_active && (a.expires_at === null || new Date(a.expires_at) > new Date())
}

// GET /api/admin/announcements — 商家查詢自己賣場所有公告
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveMerchantStore()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const serviceClient = createServiceClient()
    const { data, error } = (await serviceClient
      .from('store_announcements')
      .select('id, title, content, type, is_active, expires_at, created_at, updated_at')
      .eq('store_id', auth.storeId)
      .order('created_at', { ascending: false })) as {
      data: AdminAnnouncement[] | null
      error: { message: string } | null
    }

    if (error) throw new Error(error.message)

    const all = data ?? []
    const activeCount = all.filter(isPublished).length

    const isActiveParam = request.nextUrl.searchParams.get('is_active')
    const filtered =
      isActiveParam === 'true'
        ? all.filter((a) => a.is_active)
        : isActiveParam === 'false'
          ? all.filter((a) => !a.is_active)
          : all

    return NextResponse.json({ success: true, data: filtered, active_count: activeCount })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/admin/announcements — 建立公告
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveMerchantStore()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = (await request.json()) as {
      title?: string
      content?: string
      type?: string
      is_active?: boolean
      expires_at?: string | null
    }

    const title = (body.title ?? '').trim()
    const content = (body.content ?? '').trim()

    if (!title) return NextResponse.json({ error: '標題為必填' }, { status: 400 })
    if (title.length > 60)
      return NextResponse.json({ error: '標題不能超過 60 個字' }, { status: 400 })
    if (!content) return NextResponse.json({ error: '內容為必填' }, { status: 400 })
    if (content.length > 300)
      return NextResponse.json({ error: '內容不能超過 300 個字' }, { status: 400 })

    const type: AnnouncementType = VALID_TYPES.includes(body.type as AnnouncementType)
      ? (body.type as AnnouncementType)
      : 'info'

    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = (await (serviceClient.from('store_announcements') as any)
      .insert({
        store_id: auth.storeId,
        title,
        content,
        type,
        is_active: body.is_active ?? true,
        expires_at: body.expires_at ?? null,
      })
      .select('id')
      .single()) as { data: { id: string } | null; error: { message: string } | null }

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, id: data?.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

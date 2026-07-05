import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resolveMerchantStore } from '@/lib/admin-auth'
import type { AnnouncementType } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

const VALID_TYPES: AnnouncementType[] = ['info', 'promo', 'warning']

async function fetchOwnedAnnouncement(id: string, storeId: string): Promise<boolean> {
  const serviceClient = createServiceClient()
  const { data } = (await serviceClient
    .from('store_announcements')
    .select('id, store_id')
    .eq('id', id)
    .maybeSingle()) as { data: { id: string; store_id: string } | null; error: unknown }
  return !!data && data.store_id === storeId
}

// PATCH /api/admin/announcements/[id] — 更新公告
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await resolveMerchantStore()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await context.params
    if (!(await fetchOwnedAnnouncement(id, auth.storeId)))
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })

    const body = (await request.json()) as {
      title?: string
      content?: string
      type?: string
      is_active?: boolean
      expires_at?: string | null
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.title !== undefined) {
      const title = body.title.trim()
      if (!title) return NextResponse.json({ error: '標題為必填' }, { status: 400 })
      if (title.length > 60)
        return NextResponse.json({ error: '標題不能超過 60 個字' }, { status: 400 })
      updates.title = title
    }
    if (body.content !== undefined) {
      const content = body.content.trim()
      if (!content) return NextResponse.json({ error: '內容為必填' }, { status: 400 })
      if (content.length > 300)
        return NextResponse.json({ error: '內容不能超過 300 個字' }, { status: 400 })
      updates.content = content
    }
    if (body.type !== undefined) {
      if (!VALID_TYPES.includes(body.type as AnnouncementType))
        return NextResponse.json({ error: '公告類型不正確' }, { status: 400 })
      updates.type = body.type
    }
    if (body.is_active !== undefined) updates.is_active = body.is_active
    if (body.expires_at !== undefined) updates.expires_at = body.expires_at

    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (serviceClient.from('store_announcements') as any)
      .update(updates)
      .eq('id', id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/admin/announcements/[id] — 刪除公告
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await resolveMerchantStore()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await context.params
    if (!(await fetchOwnedAnnouncement(id, auth.storeId)))
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })

    const serviceClient = createServiceClient()
    const { error } = await serviceClient.from('store_announcements').delete().eq('id', id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { OrderStatus } from '@/types'

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

// 合法的狀態轉移（商家操作）
const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending_purchase: 'ordered',
  ordered: 'allocated',
}

interface PatchBody {
  status: OrderStatus
}

interface OrderRow {
  id: string
  store_id: string
  status: string
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params

    // ── 驗證商家身份 ──────────────────────────────────────────
    const rhc = await createRouteHandlerClient()
    const {
      data: { user },
    } = await rhc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const lineId = extractLineId(user.email)
    if (!lineId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const db = createServiceClient()

    const { data: dbUser } = (await db
      .from('users')
      .select('id, role')
      .eq('line_id', lineId)
      .single()) as { data: { id: string; role: string } | null; error: unknown }

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 })
    if (dbUser.role !== 'merchant')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: store } = (await db
      .from('stores')
      .select('id')
      .eq('owner_id', dbUser.id)
      .maybeSingle()) as { data: { id: string } | null; error: unknown }

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    // ── 取得訂單並驗證歸屬 ────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = (await (db as any)
      .from('orders')
      .select('id, store_id, status')
      .eq('id', orderId)
      .maybeSingle()) as { data: OrderRow | null; error: unknown }

    if (!order || order.store_id !== store.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ── 驗證狀態轉移 ──────────────────────────────────────────
    const body = (await request.json()) as PatchBody
    const { status: newStatus } = body

    const currentStatus = order.status as OrderStatus
    const allowedNext = ALLOWED_TRANSITIONS[currentStatus]

    if (!allowedNext || allowedNext !== newStatus) {
      return NextResponse.json(
        { error: `Cannot transition from '${currentStatus}' to '${newStatus}'` },
        { status: 400 }
      )
    }

    // ── 更新狀態 ──────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (db as any)
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

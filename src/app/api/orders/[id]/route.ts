import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'

interface CancelBody {
  storeSlug: string
}

interface OrderRow {
  id: string
  member_id: string
  status: string
}

// 顧客可取消的狀態
const CANCELLABLE_STATUSES = new Set(['pending_purchase', 'ordered'])

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Missing LIFF token' }, { status: 401 })
    }

    const body = (await request.json()) as CancelBody
    const { storeSlug } = body

    if (!storeSlug) {
      return NextResponse.json({ error: 'Missing storeSlug' }, { status: 400 })
    }

    const outcome = await verifyStoreAccess(token, storeSlug)
    if ('error' in outcome) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (outcome.result.status !== 'approved' || !outcome.result.member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const memberId = outcome.result.member.id
    const db = createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = (await (db as any)
      .from('orders')
      .select('id, member_id, status')
      .eq('id', orderId)
      .maybeSingle()) as { data: OrderRow | null; error: unknown }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.member_id !== memberId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!CANCELLABLE_STATUSES.has(order.status)) {
      return NextResponse.json(
        { error: `Cannot cancel order with status '${order.status}'` },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (db as any)
      .from('orders')
      .update({ status: 'cancelled', cancelled_by: 'customer', cancelled_at: now, updated_at: now })
      .eq('id', orderId)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { OrderStatus, ShippingMethod, PaymentMethod } from '@/types'

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

async function getMerchantStoreId(): Promise<{ storeId: string } | NextResponse> {
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
  if (dbUser.role !== 'merchant') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: store } = (await db
    .from('stores')
    .select('id')
    .eq('owner_id', dbUser.id)
    .maybeSingle()) as { data: { id: string } | null; error: unknown }

  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  return { storeId: store.id }
}

// 合法的批次狀態轉移（與單筆相同）
const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending_purchase: 'ordered',
  ordered: 'allocated',
  settled: 'shipped',
}

interface BatchPatchBody {
  orderIds: string[]
  status: OrderStatus
  shipping_number?: string
  shipping_vendor?: string
  shipping_method?: ShippingMethod
  payment_method?: PaymentMethod
}

interface OrderStatusRow {
  id: string
  store_id: string
  status: string
}

// ── PATCH /api/admin/orders/batch ─────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await getMerchantStoreId()
    if (authResult instanceof NextResponse) return authResult
    const { storeId } = authResult

    const body = (await request.json()) as BatchPatchBody
    const {
      orderIds,
      status: newStatus,
      shipping_number,
      shipping_vendor,
      shipping_method,
      payment_method,
    } = body

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds must be a non-empty array' }, { status: 400 })
    }
    if (orderIds.length > 50) {
      return NextResponse.json(
        { error: 'Cannot update more than 50 orders at once' },
        { status: 400 }
      )
    }
    if (!newStatus) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const db = createServiceClient()

    // 查詢所有訂單，驗證都屬於此賣場
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orders, error: fetchError } = (await (db as any)
      .from('orders')
      .select('id, store_id, status')
      .in('id', orderIds)) as { data: OrderStatusRow[] | null; error: { message: string } | null }

    if (fetchError) throw new Error(fetchError.message)

    const foundIds = new Set((orders ?? []).map((o) => o.id))
    const notFound = orderIds.filter((id) => !foundIds.has(id))
    if (notFound.length > 0) {
      return NextResponse.json(
        { error: `Orders not found: ${notFound.join(', ')}` },
        { status: 404 }
      )
    }

    // 驗證所有訂單屬於此賣場
    const forbidden = (orders ?? []).filter((o) => o.store_id !== storeId)
    if (forbidden.length > 0) {
      return NextResponse.json(
        { error: 'Some orders do not belong to this store' },
        { status: 403 }
      )
    }

    // 驗證所有訂單的 transition 合法性
    const invalidTransitions: string[] = []
    for (const order of orders ?? []) {
      const currentStatus = order.status as OrderStatus
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus]
      if (!allowedNext || allowedNext !== newStatus) {
        invalidTransitions.push(`${order.id}: ${currentStatus} → ${newStatus}`)
      }
    }
    if (invalidTransitions.length > 0) {
      return NextResponse.json(
        { error: `Invalid transitions: ${invalidTransitions.join('; ')}` },
        { status: 400 }
      )
    }

    // settled → shipped 時，shipping_vendor 必填
    if (newStatus === 'shipped' && !shipping_vendor) {
      return NextResponse.json(
        { error: 'shipping_vendor is required when shipping' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFields: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    if (newStatus === 'shipped') {
      if (shipping_number) updateFields.shipping_number = shipping_number
      if (shipping_vendor) updateFields.shipping_vendor = shipping_vendor
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (db as any)
      .from('orders')
      .update(updateFields)
      .in('id', orderIds)

    if (updateError) throw new Error(updateError.message)

    // settled → shipped 時，同步更新 settlements 的物流方式與付款方式
    if (newStatus === 'shipped' && (shipping_method || payment_method)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settlementUpdate: Record<string, any> = {}
      if (shipping_method) settlementUpdate.shipping_method = shipping_method
      if (payment_method) settlementUpdate.payment_method = payment_method

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: settlementError } = await (db as any)
        .from('settlements')
        .update(settlementUpdate)
        .in('order_id', orderIds)

      if (settlementError) throw new Error(settlementError.message)
    }

    return NextResponse.json({ success: true, updated: orderIds.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'

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

interface BatchCheckoutBody {
  orderIds: string[]
}

interface OrderRow {
  id: string
  store_id: string
  status: string
}

// ── POST /api/admin/orders/batch-checkout ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authResult = await getMerchantStoreId()
    if (authResult instanceof NextResponse) return authResult
    const { storeId } = authResult

    const body = (await request.json()) as BatchCheckoutBody
    const { orderIds } = body

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds must be a non-empty array' }, { status: 400 })
    }

    const db = createServiceClient()

    // 驗證所有訂單都屬於此賣場且狀態為 allocated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orders, error: fetchError } = (await (db as any)
      .from('orders')
      .select('id, store_id, status')
      .in('id', orderIds)) as { data: OrderRow[] | null; error: { message: string } | null }

    if (fetchError) throw new Error(fetchError.message)

    const found = new Set((orders ?? []).map((o) => o.id))
    const notFound = orderIds.filter((id) => !found.has(id))
    if (notFound.length > 0) {
      return NextResponse.json(
        { error: `Orders not found: ${notFound.join(', ')}` },
        { status: 404 }
      )
    }

    const forbidden = (orders ?? []).filter((o) => o.store_id !== storeId)
    if (forbidden.length > 0) {
      return NextResponse.json(
        { error: 'Some orders do not belong to this store' },
        { status: 403 }
      )
    }

    const notAllocated = (orders ?? []).filter((o) => o.status !== 'allocated')
    if (notAllocated.length > 0) {
      return NextResponse.json(
        { error: 'All orders must be in allocated status to checkout' },
        { status: 400 }
      )
    }

    // 所有訂單共用同一個 bundle_id，視為整筆出貨單位
    const bundleId = crypto.randomUUID()

    const settlementData = orderIds.map((orderId) => ({
      order_id: orderId,
      bundle_id: bundleId,
      shipping_method: null,
      payment_method: null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: settlementError } = await (db as any).from('settlements').insert(settlementData)
    if (settlementError) throw new Error((settlementError as { message: string }).message)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (db as any)
      .from('orders')
      .update({ status: 'settled', updated_at: new Date().toISOString() })
      .in('id', orderIds)

    if (updateError) throw new Error((updateError as { message: string }).message)

    return NextResponse.json({ success: true, settled: orderIds.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

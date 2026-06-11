import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'

// DB enum 值（前台直接傳入，不需 mapping）
const VALID_SHIPPING = new Set(['pickup', 'convenience', 'maihuobian', 'home_delivery'])
const VALID_PAYMENT = new Set(['cash', 'transfer', 'cod'])

interface SettlementBody {
  storeSlug: string
  orderIds: string[]
  shippingMethod: string
  paymentMethod: string
  recipientName: string
  recipientPhone: string
  city?: string
  district?: string
  address?: string
  cvsBranch?: string
  note?: string
}

interface OrderRow {
  id: string
  member_id: string
  status: string
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Missing LIFF token' }, { status: 401 })
    }

    const body = (await request.json()) as SettlementBody
    const {
      storeSlug,
      orderIds,
      shippingMethod,
      paymentMethod,
      recipientName,
      recipientPhone,
      city,
      district,
      address,
      cvsBranch,
      note,
    } = body

    if (!storeSlug || !orderIds?.length || !shippingMethod || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_SHIPPING.has(shippingMethod) || !VALID_PAYMENT.has(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid shipping or payment method' }, { status: 400 })
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

    // 驗證所有 orderIds 屬於此 member 且狀態為 allocated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orders, error: fetchErr } = (await (db as any)
      .from('orders')
      .select('id, member_id, status')
      .in('id', orderIds)) as { data: OrderRow[] | null; error: { message: string } | null }

    if (fetchErr || !orders) {
      throw new Error(fetchErr?.message ?? 'Failed to fetch orders')
    }

    for (const order of orders) {
      if (order.member_id !== memberId) {
        return NextResponse.json(
          { error: 'Forbidden: order does not belong to you' },
          { status: 403 }
        )
      }
      if (order.status !== 'allocated') {
        return NextResponse.json(
          { error: `Order ${order.id} is not in allocatable state (current: ${order.status})` },
          { status: 400 }
        )
      }
    }

    // 組裝收件地址
    const recipientAddress =
      shippingMethod === 'home_delivery' && city && district && address
        ? `${city}${district}${address}`
        : null

    // 取貨門市（超商 / 賣貨便）
    const storeName =
      shippingMethod === 'convenience' || shippingMethod === 'maihuobian'
        ? (cvsBranch ?? null)
        : null

    // 同一批結單共用一個 bundle_id，讓前後台都能按 bundle 歸組顯示
    const bundleId = crypto.randomUUID()

    // INSERT settlements + UPDATE orders.status 逐筆執行
    for (const orderId of orderIds) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertErr } = await (db as any).from('settlements').insert({
        order_id: orderId,
        bundle_id: bundleId,
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
        recipient_name: recipientName || null,
        recipient_phone: recipientPhone || null,
        recipient_address: recipientAddress,
        store_name: storeName,
        note: note || null,
      })
      if (insertErr) throw new Error(insertErr.message)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateErr } = await (db as any)
        .from('orders')
        .update({ status: 'settled', updated_at: new Date().toISOString() })
        .eq('id', orderId)
      if (updateErr) throw new Error(updateErr.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

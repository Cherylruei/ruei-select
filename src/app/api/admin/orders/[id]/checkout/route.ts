import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

async function getMerchantStoreId(): Promise<
  { storeId: string; db: ReturnType<typeof createServiceClient> } | NextResponse
> {
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

  return { storeId: store.id, db }
}

// ── POST /api/admin/orders/[id]/checkout（代客結單）────────────────────────────

type ShippingMethod = 'pickup' | 'convenience' | 'takkyubin' | 'home_delivery'
type PaymentMethod = 'cash' | 'transfer' | 'cod'

interface CheckoutBody {
  shipping_method: ShippingMethod
  payment_method: PaymentMethod
  recipient_name?: string
  recipient_phone?: string
  recipient_address?: string
  store_name?: string
  note?: string
}

const VALID_SHIPPING: ShippingMethod[] = ['pickup', 'convenience', 'takkyubin', 'home_delivery']
const VALID_PAYMENT: PaymentMethod[] = ['cash', 'transfer', 'cod']

const PHONE_RE = /^09\d{8}$/

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params

    const authResult = await getMerchantStoreId()
    if (authResult instanceof NextResponse) return authResult
    const { storeId, db } = authResult

    // 取得訂單並驗證歸屬
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = (await (db as any)
      .from('orders')
      .select('id, store_id, status')
      .eq('id', orderId)
      .maybeSingle()) as {
      data: { id: string; store_id: string; status: string } | null
      error: unknown
    }

    if (!order || order.store_id !== storeId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.status !== 'allocated') {
      return NextResponse.json(
        { error: 'Order must be in allocated status to checkout' },
        { status: 400 }
      )
    }

    const body = (await request.json()) as CheckoutBody
    const {
      shipping_method,
      payment_method,
      recipient_name,
      recipient_phone,
      recipient_address,
      store_name,
      note,
    } = body

    // 驗證必填
    if (!shipping_method || !VALID_SHIPPING.includes(shipping_method)) {
      return NextResponse.json({ error: 'Invalid shipping_method' }, { status: 400 })
    }
    if (!payment_method || !VALID_PAYMENT.includes(payment_method)) {
      return NextResponse.json({ error: 'Invalid payment_method' }, { status: 400 })
    }

    // 依物流驗證必填欄位
    if (shipping_method === 'convenience' || shipping_method === 'takkyubin') {
      if (!recipient_name?.trim())
        return NextResponse.json({ error: 'recipient_name is required' }, { status: 400 })
      if (!recipient_phone?.trim())
        return NextResponse.json({ error: 'recipient_phone is required' }, { status: 400 })
      if (!PHONE_RE.test(recipient_phone.trim()))
        return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
      if (!store_name?.trim())
        return NextResponse.json({ error: 'store_name is required' }, { status: 400 })
    }
    if (shipping_method === 'home_delivery') {
      if (!recipient_name?.trim())
        return NextResponse.json({ error: 'recipient_name is required' }, { status: 400 })
      if (!recipient_phone?.trim())
        return NextResponse.json({ error: 'recipient_phone is required' }, { status: 400 })
      if (!PHONE_RE.test(recipient_phone.trim()))
        return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 })
      if (!recipient_address?.trim())
        return NextResponse.json({ error: 'recipient_address is required' }, { status: 400 })
    }

    // 新增 settlements 記錄（單筆結單自成一個 bundle）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: settlementError } = await (db as any).from('settlements').insert({
      order_id: orderId,
      bundle_id: crypto.randomUUID(),
      shipping_method,
      payment_method,
      recipient_name: recipient_name?.trim() ?? null,
      recipient_phone: recipient_phone?.trim() ?? null,
      recipient_address: recipient_address?.trim() ?? null,
      store_name: store_name?.trim() ?? null,
      note: note?.trim() ?? null,
    })

    if (settlementError) throw new Error((settlementError as { message: string }).message)

    // 更新訂單狀態為 settled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (db as any)
      .from('orders')
      .update({ status: 'settled', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (updateError) throw new Error((updateError as { message: string }).message)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

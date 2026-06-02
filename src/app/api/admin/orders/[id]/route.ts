import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { AdminOrder, AdminOrderItem, OrderStatus } from '@/types'

// settlement 欄位在此 API 暫不查詢（detail 頁不需要），設為 null

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

// 合法的狀態轉移（商家操作）
const ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending_purchase: 'ordered',
  ordered: 'allocated',
  allocated: 'settled',
  settled: 'shipped',
  shipped: 'completed',
}

// ── 驗證商家身份，回傳 storeId 或錯誤 Response ──────────────────────────────

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

// ── DB 查詢結果型別 ───────────────────────────────────────────────────────────

interface DetailOrderRow {
  id: string
  store_id: string
  member_id: string
  status: string
  created_by: string
  note: string | null
  ordered_at: string
  updated_at: string
  cancelled_by: string | null
  cancelled_at: string | null
  shipping_number: string | null
  shipping_vendor: string | null
  store_members: {
    name: string
    line_id: string
  } | null
  order_items: {
    id: string
    quantity: number
    unit_price: number
    products: { name: string; suppliers: { name: string } | null } | null
    product_variants: { specs: Record<string, string> } | null
  }[]
}

type ShippingVendor = '黑貓' | '7-11' | '全家' | '賣貨便' | '其他'

interface PatchBody {
  status?: OrderStatus
  shipping_number?: string
  shipping_vendor?: ShippingVendor
}

interface OrderRow {
  id: string
  store_id: string
  status: string
}

// ── GET /api/admin/orders/[id] ────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params

    const authResult = await getMerchantStoreId()
    if (authResult instanceof NextResponse) return authResult
    const { storeId, db } = authResult

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = (await (db as any)
      .from('orders')
      .select(
        `id, store_id, member_id, status, created_by, note, ordered_at, updated_at,
         cancelled_by, cancelled_at, shipping_number, shipping_vendor,
         store_members(name, line_id),
         order_items(
           id, quantity, unit_price,
           products(name, suppliers(name)),
           product_variants(specs)
         )`
      )
      .eq('id', orderId)
      .maybeSingle()) as { data: DetailOrderRow | null; error: { message: string } | null }

    if (error) throw new Error(error.message)
    if (!row || row.store_id !== storeId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const order: AdminOrder = {
      id: row.id,
      store_id: row.store_id,
      member_id: row.member_id,
      member_name: row.store_members?.name ?? '未知顧客',
      member_line_id: row.store_members?.line_id ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: row.status as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      created_by: (row.created_by ?? 'customer') as any,
      note: row.note,
      ordered_at: row.ordered_at,
      updated_at: row.updated_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cancelled_by: row.cancelled_by as any,
      cancelled_at: row.cancelled_at,
      shipping_number: row.shipping_number,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shipping_vendor: row.shipping_vendor as any,
      settlement: null,
      items: row.order_items.map(
        (item): AdminOrderItem => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: item.products?.name ?? '',
          variant_specs: item.product_variants?.specs ?? null,
          supplier_name: item.products?.suppliers?.name ?? null,
        })
      ),
    }

    return NextResponse.json({ success: true, data: order })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: orderId } = await params

    // ── 驗證商家身份 ──────────────────────────────────────────
    const authResult = await getMerchantStoreId()
    if (authResult instanceof NextResponse) return authResult
    const { storeId, db } = authResult

    // ── 取得訂單並驗證歸屬 ────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order } = (await (db as any)
      .from('orders')
      .select('id, store_id, status')
      .eq('id', orderId)
      .maybeSingle()) as { data: OrderRow | null; error: unknown }

    if (!order || order.store_id !== storeId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const body = (await request.json()) as PatchBody
    const { status: newStatus, shipping_number, shipping_vendor } = body

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFields: Record<string, any> = { updated_at: new Date().toISOString() }

    // ── 狀態轉移（選填）──────────────────────────────────────
    if (newStatus !== undefined) {
      const currentStatus = order.status as OrderStatus
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus]

      if (!allowedNext || allowedNext !== newStatus) {
        return NextResponse.json(
          { error: `Cannot transition from '${currentStatus}' to '${newStatus}'` },
          { status: 400 }
        )
      }
      updateFields.status = newStatus
    }

    // ── 出貨資訊（僅 settled/shipped 狀態可填）───────────────
    if (shipping_number !== undefined || shipping_vendor !== undefined) {
      const currentStatus = order.status as OrderStatus
      if (currentStatus !== 'settled' && currentStatus !== 'shipped') {
        return NextResponse.json(
          { error: 'Shipping info can only be set when order is settled or shipped' },
          { status: 400 }
        )
      }
      if (shipping_number !== undefined) updateFields.shipping_number = shipping_number
      if (shipping_vendor !== undefined) updateFields.shipping_vendor = shipping_vendor
    }

    if (Object.keys(updateFields).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // ── 執行更新 ──────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (db as any)
      .from('orders')
      .update(updateFields)
      .eq('id', orderId)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

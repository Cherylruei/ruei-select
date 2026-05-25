import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { AdminOrder, AdminOrderItem, OrderStatus, OrderStatusCounts } from '@/types'

// ── 工具：從 Supabase Auth email 取出 line_id ─────────────────────────────────

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

// ── 工具：驗證商家身份，回傳 storeId 或錯誤 Response ─────────────────────────

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

// ── DB 查詢結果型別 ───────────────────────────────────────────────────────────

interface OrderRow {
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
  store_members: {
    name: string
    line_id: string
  } | null
  order_items: {
    id: string
    quantity: number
    unit_price: number
    products: { name: string } | null
    product_variants: { specs: Record<string, string> } | null
  }[]
}

// ── GET /api/admin/orders?status=xxx ─────────────────────────────────────────

const VALID_STATUSES: OrderStatus[] = [
  'pending_purchase',
  'ordered',
  'allocated',
  'settled',
  'shipped',
  'completed',
  'cancelled',
]

export async function GET(request: NextRequest) {
  try {
    const authResult = await getMerchantStoreId()
    if (authResult instanceof NextResponse) return authResult
    const { storeId } = authResult

    const db = createServiceClient()
    const statusParam = request.nextUrl.searchParams.get('status') as OrderStatus | null
    const validStatus = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : null

    // ── 查詢所有訂單（用於計算各狀態數量）──────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allRows, error: countError } = (await (db as any)
      .from('orders')
      .select('status')
      .eq('store_id', storeId)) as {
      data: { status: string }[] | null
      error: { message: string } | null
    }

    if (countError) throw new Error(countError.message)

    const counts: OrderStatusCounts = {
      all: allRows?.length ?? 0,
      pending_purchase: 0,
      ordered: 0,
      allocated: 0,
      settled: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    }
    for (const row of allRows ?? []) {
      const s = row.status as OrderStatus
      if (s in counts) counts[s]++
    }

    // ── 查詢訂單主體（含 join）──────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from('orders')
      .select(
        `id, store_id, member_id, status, created_by, note, ordered_at, updated_at,
         cancelled_by, cancelled_at,
         store_members(name, line_id),
         order_items(
           id, quantity, unit_price,
           products(name),
           product_variants(specs)
         )`
      )
      .eq('store_id', storeId)
      .order('ordered_at', { ascending: false })

    if (validStatus) {
      query = query.eq('status', validStatus)
    }

    const { data: rows, error } = (await query) as {
      data: OrderRow[] | null
      error: { message: string } | null
    }

    if (error) throw new Error(error.message)

    const orders: AdminOrder[] = (rows ?? []).map((row) => ({
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
      items: row.order_items.map(
        (item): AdminOrderItem => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: item.products?.name ?? '',
          variant_specs: item.product_variants?.specs ?? null,
        })
      ),
    }))

    return NextResponse.json({ success: true, data: orders, counts })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST /api/admin/orders（商家代客建立訂單）────────────────────────────────

interface CreateOrderBody {
  memberId: string
  productId: string
  variantId: string
  quantity: number
  note?: string
}

interface VariantRow {
  id: string
  product_id: string
  price: number
}

interface ProductRow {
  id: string
  store_id: string
  status: string
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getMerchantStoreId()
    if (authResult instanceof NextResponse) return authResult
    const { storeId } = authResult

    const body = (await request.json()) as CreateOrderBody
    const { memberId, productId, variantId, quantity, note } = body

    if (!memberId || !productId || !variantId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }

    const db = createServiceClient()

    // 驗證 member 屬於此賣場且 approved
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = (await (db as any)
      .from('store_members')
      .select('id, store_id, status')
      .eq('id', memberId)
      .maybeSingle()) as {
      data: { id: string; store_id: string; status: string } | null
      error: unknown
    }

    if (!member || member.store_id !== storeId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }
    if (member.status !== 'approved') {
      return NextResponse.json({ error: 'Member not approved' }, { status: 400 })
    }

    // 驗證 product 屬於此賣場且 active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: product } = (await (db as any)
      .from('products')
      .select('id, store_id, status')
      .eq('id', productId)
      .maybeSingle()) as { data: ProductRow | null; error: unknown }

    if (!product || product.store_id !== storeId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (product.status !== 'active') {
      return NextResponse.json({ error: 'Product not available' }, { status: 400 })
    }

    // 驗證 variant 屬於此 product
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: variant } = (await (db as any)
      .from('product_variants')
      .select('id, product_id, price')
      .eq('id', variantId)
      .maybeSingle()) as { data: VariantRow | null; error: unknown }

    if (!variant || variant.product_id !== productId) {
      return NextResponse.json({ error: 'Invalid variant' }, { status: 400 })
    }

    // 建立訂單（created_by = 'merchant'）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderError } = (await (db as any)
      .from('orders')
      .insert({
        store_id: storeId,
        member_id: memberId,
        status: 'pending_purchase',
        created_by: 'merchant',
        note: note ?? null,
      })
      .select('id')
      .single()) as { data: { id: string } | null; error: { message: string } | null }

    if (orderError || !order) {
      throw new Error(orderError?.message ?? 'Failed to create order')
    }

    // 建立訂單明細
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemError } = await (db as any).from('order_items').insert({
      order_id: order.id,
      product_id: productId,
      variant_id: variantId,
      quantity,
      unit_price: variant.price,
      unit_cost: null,
    })

    if (itemError) throw new Error(itemError.message)

    return NextResponse.json({ success: true, orderId: order.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

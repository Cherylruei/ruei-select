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

interface DefaultShippingProfile {
  shipping_method: string
  payment_method: string
  recipient_name: string
  recipient_phone: string
  store_name: string | null
  address: string | null
}

// GET /api/admin/members/[memberId]/default-shipping
// 商家取得指定顧客的預設收件資料（by store_member.id）

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const authResult = await getMerchantStoreId()
    if (authResult instanceof NextResponse) return authResult
    const { storeId } = authResult

    const { memberId } = await params
    const db = createServiceClient()

    // 從 store_members 取得 user_id（以確認此顧客屬於此賣場）
    const { data: member } = (await db
      .from('store_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('store_id', storeId)
      .maybeSingle()) as { data: { user_id: string } | null; error: unknown }

    if (!member) return NextResponse.json({ data: null })

    // 取得顧客的預設收件資料
    const { data: profile } = (await db
      .from('customer_shipping_profiles')
      .select(
        'shipping_method, payment_method, recipient_name, recipient_phone, store_name, address'
      )
      .eq('user_id', member.user_id)
      .eq('store_id', storeId)
      .eq('is_default', true)
      .maybeSingle()) as { data: DefaultShippingProfile | null; error: unknown }

    return NextResponse.json({ data: profile })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

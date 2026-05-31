import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { Supplier } from '@/types'

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

async function resolveUserAndStore(
  lineId: string
): Promise<{ userId: string; storeId: string } | null> {
  const serviceClient = createServiceClient()

  const { data: dbUser } = (await serviceClient
    .from('users')
    .select('id')
    .eq('line_id', lineId)
    .single()) as { data: { id: string } | null; error: unknown }

  if (!dbUser) return null

  const { data: store } = (await serviceClient
    .from('stores')
    .select('id')
    .eq('owner_id', dbUser.id)
    .maybeSingle()) as { data: { id: string } | null; error: unknown }

  if (!store) return null

  return { userId: dbUser.id, storeId: store.id }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const rhc = await createRouteHandlerClient()
    const {
      data: { user },
    } = await rhc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const lineId = extractLineId(user.email)
    if (!lineId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const context = await resolveUserAndStore(lineId)
    if (!context) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const serviceClient = createServiceClient()
    const { data: suppliers, error } = (await serviceClient
      .from('suppliers')
      .select('*')
      .eq('store_id', context.storeId)
      .order('created_at', { ascending: false })) as {
      data: Supplier[] | null
      error: unknown
    }

    if (error) throw error

    return NextResponse.json({ success: true, data: suppliers ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const rhc = await createRouteHandlerClient()
    const {
      data: { user },
    } = await rhc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const lineId = extractLineId(user.email)
    if (!lineId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const context = await resolveUserAndStore(lineId)
    if (!context) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const body = (await request.json()) as {
      name?: string
      tag?: string
      line_group?: string
      phone?: string
      currency?: string
      avg_arrival_days?: number | null
      note?: string
      website_url?: string
    }
    const name = body.name?.trim() ?? ''
    const tag = body.tag?.trim() || null
    const line_group = body.line_group?.trim() || null
    const phone = body.phone?.trim() || null
    const currency = (['TWD', 'JPY', 'USD', 'HKD'] as const).includes(body.currency as never)
      ? (body.currency as 'TWD' | 'JPY' | 'USD' | 'HKD')
      : 'TWD'
    const avg_arrival_days =
      typeof body.avg_arrival_days === 'number' && body.avg_arrival_days >= 0
        ? body.avg_arrival_days
        : null
    const note = body.note?.trim() || null
    const website_url = body.website_url?.trim() || null

    if (name.length < 1) {
      return NextResponse.json({ error: '廠商名稱為必填' }, { status: 400 })
    }
    if (name.length > 30) {
      return NextResponse.json({ error: '廠商名稱不能超過 30 個字' }, { status: 400 })
    }
    if (tag && tag.length > 8) {
      return NextResponse.json({ error: '廠商標記不能超過 8 個字' }, { status: 400 })
    }

    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: supplier, error } = (await (serviceClient.from('suppliers') as any)
      .insert({
        store_id: context.storeId,
        name,
        tag,
        line_group,
        phone,
        currency,
        avg_arrival_days,
        note,
        website_url,
      })
      .select()
      .single()) as { data: Supplier | null; error: { message: string } | null }

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, data: supplier }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

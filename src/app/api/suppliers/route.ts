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

    const body = (await request.json()) as { name?: string; note?: string }
    const name = body.name?.trim() ?? ''
    const note = body.note?.trim() || null

    if (name.length < 1) {
      return NextResponse.json({ error: '廠商名稱為必填' }, { status: 400 })
    }
    if (name.length > 30) {
      return NextResponse.json({ error: '廠商名稱不能超過 30 個字' }, { status: 400 })
    }
    if (note && note.length > 100) {
      return NextResponse.json({ error: '備註不能超過 100 個字' }, { status: 400 })
    }

    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: supplier, error } = (await (serviceClient.from('suppliers') as any)
      .insert({ store_id: context.storeId, name, note })
      .select()
      .single()) as { data: Supplier | null; error: { message: string } | null }

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, data: supplier }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

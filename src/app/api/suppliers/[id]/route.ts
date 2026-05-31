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

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

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

    const { data: supplier } = (await serviceClient
      .from('suppliers')
      .select('id, store_id')
      .eq('id', id)
      .single()) as { data: Pick<Supplier, 'id' | 'store_id'> | null; error: unknown }

    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    if (supplier.store_id !== context.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      : undefined
    const avg_arrival_days =
      typeof body.avg_arrival_days === 'number' && body.avg_arrival_days >= 0
        ? body.avg_arrival_days
        : body.avg_arrival_days === null
          ? null
          : undefined
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, unknown> = { name, note, website_url, tag, line_group, phone }
    if (currency !== undefined) patch.currency = currency
    if (avg_arrival_days !== undefined) patch.avg_arrival_days = avg_arrival_days

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = (await (serviceClient.from('suppliers') as any)
      .update(patch)
      .eq('id', id)
      .select()
      .single()) as { data: Supplier | null; error: { message: string } | null }

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params

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

    const { data: supplier } = (await serviceClient
      .from('suppliers')
      .select('id, store_id')
      .eq('id', id)
      .single()) as { data: Pick<Supplier, 'id' | 'store_id'> | null; error: unknown }

    if (!supplier) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    if (supplier.store_id !== context.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check for associated products
    const { data: products } = (await serviceClient
      .from('products')
      .select('id')
      .eq('supplier_id', id)) as { data: { id: string }[] | null; error: unknown }

    const productCount = products?.length ?? 0
    if (productCount > 0) {
      return NextResponse.json(
        { error: `此廠商有 ${productCount} 件商品，請先移除商品再刪除廠商` },
        { status: 409 }
      )
    }

    const { error } = await serviceClient
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('store_id', context.storeId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

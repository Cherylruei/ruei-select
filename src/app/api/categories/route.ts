import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthContext, isNextResponse } from '@/lib/api-helpers'

export async function GET() {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient
      .from('product_categories')
      .select('*')
      .eq('store_id', ctx.storeId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const body = (await request.json()) as { name?: string }
    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: '分類名稱為必填' }, { status: 400 })

    const serviceClient = createServiceClient()

    const { data: existing } = await serviceClient
      .from('product_categories')
      .select('sort_order')
      .eq('store_id', ctx.storeId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const maxOrder = (existing as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1

    const { data, error } = (await serviceClient
      .from('product_categories')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ store_id: ctx.storeId, name, sort_order: maxOrder + 1 } as any)
      .select()
      .single()) as { data: unknown; error: { message: string } | null }

    if (error) throw new Error(error.message)
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthContext, isNextResponse } from '@/lib/api-helpers'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const { id } = await params
    const body = (await request.json()) as { name?: string }
    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: '分類名稱為必填' }, { status: 400 })

    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = serviceClient as any
    const { data, error } = (await db
      .from('product_categories')
      .update({ name })
      .eq('id', id)
      .eq('store_id', ctx.storeId)
      .select()
      .single()) as { data: unknown; error: { message: string } | null }

    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: '分類不存在' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const { id } = await params
    const serviceClient = createServiceClient()
    const { error } = await serviceClient
      .from('product_categories')
      .delete()
      .eq('id', id)
      .eq('store_id', ctx.storeId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

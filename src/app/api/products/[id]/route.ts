import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthContext, isNextResponse } from '@/lib/api-helpers'
import type { Product } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const { id } = await params
    const serviceClient = createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: product, error } = (await (serviceClient as any)
      .from('products')
      .select('*, variants:product_variants(*), product_images(*), supplier:suppliers(name)')
      .eq('id', id)
      .eq('store_id', ctx.storeId)
      .single()) as { data: Product | null; error: { message: string } | null }

    if (error || !product) return NextResponse.json({ error: '商品不存在' }, { status: 404 })

    return NextResponse.json({ success: true, data: product })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface ProductUpdateBody {
  supplier_id?: string | null
  name?: string
  description?: string | null
  description_raw?: string | null
  category_id?: string | null
  is_public?: boolean
  ends_at?: string | null
  status?: 'active' | 'inactive'
  variants?: Array<{
    id?: string
    specs: Record<string, string>
    price: number
    cost?: number | null
    cost_currency?: string
  }>
  images?: Array<{ id?: string; url: string; sort_order: number }>
  deleted_image_ids?: string[]
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const { id } = await params
    const serviceClient = createServiceClient()

    // 確認商品屬於此賣場
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = (await (serviceClient as any)
      .from('products')
      .select('id, store_id')
      .eq('id', id)
      .eq('store_id', ctx.storeId)
      .maybeSingle()) as { data: { id: string; store_id: string } | null; error: unknown }

    if (!existing) return NextResponse.json({ error: '商品不存在或無權限' }, { status: 403 })

    const body = (await request.json()) as ProductUpdateBody

    // 1. 更新商品主體
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updateFields.name = body.name.trim()
    if (body.description !== undefined) updateFields.description = body.description?.trim() || null
    if (body.description_raw !== undefined)
      updateFields.description_raw = body.description_raw?.trim() || null
    if (body.supplier_id !== undefined) updateFields.supplier_id = body.supplier_id || null
    if (body.category_id !== undefined) updateFields.category_id = body.category_id || null
    if (body.is_public !== undefined) updateFields.is_public = body.is_public
    if (body.ends_at !== undefined) updateFields.ends_at = body.ends_at ?? null
    if (body.status !== undefined) updateFields.status = body.status

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (serviceClient as any)
      .from('products')
      .update(updateFields)
      .eq('id', id)

    if (updateError) throw new Error(updateError.message)

    // 2. 更新 variants（刪除舊的，重新建立）
    if (body.variants !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (serviceClient as any).from('product_variants').delete().eq('product_id', id)
      if (body.variants.length > 0) {
        const variantRows = body.variants.map((v) => ({
          product_id: id,
          specs: v.specs,
          price: v.price,
          cost: v.cost ?? null,
          cost_currency: v.cost_currency ?? 'TWD',
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: variantError } = await (serviceClient as any)
          .from('product_variants')
          .insert(variantRows)
        if (variantError) throw new Error(variantError.message)
      }
    }

    // 3. 刪除指定圖片
    if (body.deleted_image_ids && body.deleted_image_ids.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (serviceClient as any)
        .from('product_images')
        .delete()
        .in('id', body.deleted_image_ids)
        .eq('product_id', id)
    }

    // 4. 新增圖片
    if (body.images && body.images.length > 0) {
      const newImages = body.images.filter((img) => !img.id)
      if (newImages.length > 0) {
        const imageRows = newImages.map((img) => ({
          product_id: id,
          url: img.url,
          sort_order: img.sort_order,
        }))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: imageError } = await (serviceClient as any)
          .from('product_images')
          .insert(imageRows)
        if (imageError) throw new Error(imageError.message)
      }
    }

    // 5. 取回最新完整資料
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fullProduct } = (await (serviceClient as any)
      .from('products')
      .select('*, variants:product_variants(*), product_images(*), supplier:suppliers(name)')
      .eq('id', id)
      .single()) as { data: Product | null; error: unknown }

    return NextResponse.json({ success: true, data: fullProduct })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const { id } = await params
    const serviceClient = createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = (await (serviceClient as any)
      .from('products')
      .select('id, store_id')
      .eq('id', id)
      .eq('store_id', ctx.storeId)
      .maybeSingle()) as { data: { id: string } | null; error: unknown }

    if (!existing) return NextResponse.json({ error: '商品不存在或無權限' }, { status: 403 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (serviceClient as any).from('products').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

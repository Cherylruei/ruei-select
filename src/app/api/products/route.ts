import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthContext, isNextResponse } from '@/lib/api-helpers'
import type { Product, ProductVariant, ProductImage } from '@/types'

interface ProductRow extends Omit<Product, 'supplier'> {
  variants: ProductVariant[]
  product_images: ProductImage[]
  supplier: { id: string; name: string } | null
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplier_id')
    const status = searchParams.get('status')

    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (serviceClient as any)
      .from('products')
      .select('*, supplier:suppliers(name)')
      .eq('store_id', ctx.storeId)
      .order('created_at', { ascending: false })

    if (supplierId) query = query.eq('supplier_id', supplierId)
    if (status) query = query.eq('status', status)

    const { data: products, error } = (await query) as {
      data: ProductRow[] | null
      error: { message: string } | null
    }

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, data: products ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface ProductCreateBody {
  supplier_id?: string | null
  name?: string
  description?: string | null
  description_raw?: string | null
  category_id?: string | null
  is_public?: boolean
  variants?: Array<{
    specs: Record<string, string>
    price: number
    cost?: number | null
    cost_currency?: string
  }>
  images?: Array<{ url: string; sort_order: number }>
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const body = (await request.json()) as ProductCreateBody
    const name = body.name?.trim() ?? ''
    if (!name) return NextResponse.json({ error: '商品名稱為必填' }, { status: 400 })
    if (!body.supplier_id) return NextResponse.json({ error: '廠商為必填' }, { status: 400 })

    const serviceClient = createServiceClient()

    // 1. 建立商品
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: product, error: productError } = (await (serviceClient as any)
      .from('products')
      .insert({
        store_id: ctx.storeId,
        supplier_id: body.supplier_id,
        name,
        description: body.description?.trim() || null,
        description_raw: body.description_raw?.trim() || null,
        category_id: body.category_id || null,
        sell_price: null,
        is_public: body.is_public ?? false,
        status: 'active',
      })
      .select()
      .single()) as { data: Product | null; error: { message: string } | null }

    if (productError || !product) throw new Error(productError?.message ?? 'Insert failed')

    // 2. 建立 variants
    if (body.variants && body.variants.length > 0) {
      const variantRows = body.variants.map((v) => ({
        product_id: product.id,
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

    // 3. 建立 images
    if (body.images && body.images.length > 0) {
      const imageRows = body.images.map((img) => ({
        product_id: product.id,
        url: img.url,
        sort_order: img.sort_order,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: imageError } = await (serviceClient as any)
        .from('product_images')
        .insert(imageRows)
      if (imageError) throw new Error(imageError.message)
    }

    // 4. 取回完整商品資料
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fullProduct } = (await (serviceClient as any)
      .from('products')
      .select('*, variants:product_variants(*), product_images(*), supplier:suppliers(name)')
      .eq('id', product.id)
      .single()) as { data: ProductRow | null; error: unknown }

    return NextResponse.json({ success: true, data: fullProduct }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export type { ProductRow, ProductVariant, ProductImage }

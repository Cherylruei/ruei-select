import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const productId = searchParams.get('id')

    if (!slug) return NextResponse.json({ error: 'slug 為必填' }, { status: 400 })

    const serviceClient = createServiceClient()

    // 確認賣場存在且啟用公開商品
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: store } = (await (serviceClient as any)
      .from('stores')
      .select('id, name, avatar_url, allow_public_products')
      .eq('slug', slug)
      .maybeSingle()) as {
      data: {
        id: string
        name: string
        avatar_url: string | null
        allow_public_products: boolean
      } | null
      error: unknown
    }

    if (!store) return NextResponse.json({ error: '賣場不存在' }, { status: 404 })
    if (!store.allow_public_products)
      return NextResponse.json({ error: '此賣場未開放公開商品' }, { status: 404 })

    // 查詢單一商品
    if (productId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: product } = (await (serviceClient as any)
        .from('products')
        .select('*, variants:product_variants(*), product_images(*)')
        .eq('id', productId)
        .eq('store_id', store.id)
        .eq('is_public', true)
        .eq('status', 'active')
        .maybeSingle()) as { data: unknown | null; error: unknown }

      if (!product) return NextResponse.json({ error: '商品不存在' }, { status: 404 })

      return NextResponse.json({ success: true, data: { store, product } })
    }

    // 查詢商品列表
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: products } = (await (serviceClient as any)
      .from('products')
      .select('*, variants:product_variants(price), product_images(url, sort_order)')
      .eq('store_id', store.id)
      .eq('is_public', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false })) as { data: unknown[] | null; error: unknown }

    return NextResponse.json({ success: true, data: { store, products: products ?? [] } })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import type { StoreProductSummary } from '@/types'

interface ProductRow {
  id: string
  name: string
  description: string | null
  category_id: string | null
  product_categories: { name: string } | null
  product_images: { url: string; sort_order: number }[]
  product_variants: { price: number }[]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const slug = searchParams.get('slug')
    const exclude = searchParams.get('exclude')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 50) : undefined

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Missing LIFF token' }, { status: 401 })
    }

    const outcome = await verifyStoreAccess(token, slug)

    if ('error' in outcome) {
      if (outcome.error === 'INVALID_TOKEN') {
        return NextResponse.json({ error: 'Invalid LIFF token' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    if (outcome.result.status !== 'approved') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const storeId = outcome.result.store.id
    const db = createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db as any)
      .from('products')
      .select(
        'id, name, description, category_id, product_categories(name), product_images(url, sort_order), product_variants(price)'
      )
      .eq('store_id', storeId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (exclude) query = query.neq('id', exclude)
    if (limit) query = query.limit(limit)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = (await query) as {
      data: ProductRow[] | null
      error: { message: string } | null
    }

    if (error) throw new Error(error.message)

    const products: StoreProductSummary[] = (rows ?? []).map((row) => {
      const prices = row.product_variants.map((v) => v.price)
      const sortedImages = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order)
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.product_categories?.name ?? null,
        primaryImage: sortedImages[0]?.url ?? null,
        priceRange: {
          min: prices.length > 0 ? Math.min(...prices) : 0,
          max: prices.length > 0 ? Math.max(...prices) : 0,
        },
      }
    })

    return NextResponse.json({ products })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

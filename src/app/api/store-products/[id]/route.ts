import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import type { StoreProductDetail } from '@/types'

interface ProductDetailRow {
  id: string
  name: string
  description: string | null
  category_id: string | null
  product_categories: { name: string } | null
  status: string
  store_id: string
  product_images: { url: string; sort_order: number }[]
  product_variants: { id: string; specs: Record<string, string>; price: number }[]
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = request.nextUrl
    const slug = searchParams.get('slug')

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
    const { data: row, error } = (await (db as any)
      .from('products')
      .select(
        'id, name, description, category_id, product_categories(name), status, store_id, product_images(url, sort_order), product_variants(id, specs, price)'
      )
      .eq('id', id)
      .maybeSingle()) as {
      data: ProductDetailRow | null
      error: { message: string } | null
    }

    if (error) throw new Error(error.message)
    if (!row) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (row.store_id !== storeId)
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    if (row.status !== 'active')
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const sortedImages = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order)

    const product: StoreProductDetail = {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.product_categories?.name ?? null,
      images: sortedImages,
      variants: row.product_variants.map((v) => ({
        id: v.id,
        specs: v.specs,
        price: v.price,
      })),
    }

    return NextResponse.json({ product })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import { toDisplayStatus } from '@/types'
import type { CustomerOrder } from '@/types'

interface OrderCreateBody {
  storeSlug: string
  productId: string
  variantId: string
  quantity: number
}

interface VariantRow {
  id: string
  product_id: string
  price: number
}

interface ProductRow {
  id: string
  store_id: string
  status: string
}

interface OrderItemRow {
  id: string
  quantity: number
  unit_price: number
  product_id: string
  variant_id: string | null
  products: {
    id: string
    name: string
    product_images: { url: string; sort_order: number }[]
  } | null
  product_variants: {
    id: string
    specs: Record<string, string>
  } | null
}

interface OrderRow {
  id: string
  status: string
  ordered_at: string
  order_items: OrderItemRow[]
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Missing LIFF token' }, { status: 401 })
    }

    const body = (await request.json()) as OrderCreateBody
    const { storeSlug, productId, variantId, quantity } = body

    if (!storeSlug || !productId || !variantId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json({ error: 'Quantity must be at least 1' }, { status: 400 })
    }

    const outcome = await verifyStoreAccess(token, storeSlug)

    if ('error' in outcome) {
      if (outcome.error === 'INVALID_TOKEN') {
        return NextResponse.json({ error: 'Invalid LIFF token' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    if (outcome.result.status !== 'approved' || !outcome.result.member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const storeId = outcome.result.store.id
    const memberId = outcome.result.member.id
    const db = createServiceClient()

    // 驗證 product 屬於此賣場且 active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: product } = (await (db as any)
      .from('products')
      .select('id, store_id, status')
      .eq('id', productId)
      .maybeSingle()) as { data: ProductRow | null; error: unknown }

    if (!product || product.store_id !== storeId) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.status !== 'active') {
      return NextResponse.json({ error: 'Product not available' }, { status: 400 })
    }

    // 驗證 variant 屬於此 product
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: variant } = (await (db as any)
      .from('product_variants')
      .select('id, product_id, price')
      .eq('id', variantId)
      .maybeSingle()) as { data: VariantRow | null; error: unknown }

    if (!variant || variant.product_id !== productId) {
      return NextResponse.json({ error: 'Invalid variant' }, { status: 400 })
    }

    // server 端取得 unit_price（不信任 client）
    const unitPrice = variant.price

    // DB transaction：INSERT orders → INSERT order_items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: order, error: orderError } = (await (db as any)
      .from('orders')
      .insert({
        store_id: storeId,
        member_id: memberId,
        status: 'pending_purchase',
        note: null,
      })
      .select('id')
      .single()) as { data: { id: string } | null; error: { message: string } | null }

    if (orderError || !order) {
      throw new Error(orderError?.message ?? 'Failed to create order')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemError } = await (db as any).from('order_items').insert({
      order_id: order.id,
      product_id: productId,
      variant_id: variantId,
      quantity,
      unit_price: unitPrice,
      unit_cost: null,
    })

    if (itemError) {
      throw new Error(itemError.message)
    }

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const storeSlug = searchParams.get('storeSlug')

    if (!storeSlug) {
      return NextResponse.json({ error: 'Missing storeSlug' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Missing LIFF token' }, { status: 401 })
    }

    const outcome = await verifyStoreAccess(token, storeSlug)

    if ('error' in outcome) {
      if (outcome.error === 'INVALID_TOKEN') {
        return NextResponse.json({ error: 'Invalid LIFF token' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    if (outcome.result.status !== 'approved' || !outcome.result.member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const memberId = outcome.result.member.id
    const db = createServiceClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = (await (db as any)
      .from('orders')
      .select(
        `id, status, ordered_at,
         order_items(
           id, quantity, unit_price, product_id, variant_id,
           products(id, name, product_images(url, sort_order)),
           product_variants(id, specs)
         )`
      )
      .eq('member_id', memberId)
      .order('ordered_at', { ascending: false })) as {
      data: OrderRow[] | null
      error: { message: string } | null
    }

    if (error) throw new Error(error.message)

    const orders: CustomerOrder[] = (rows ?? []).map((row) => ({
      id: row.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: row.status as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      displayStatus: toDisplayStatus(row.status as any),
      ordered_at: row.ordered_at,
      items: row.order_items.map((item) => {
        const sortedImages = item.products
          ? [...item.products.product_images].sort((a, b) => a.sort_order - b.sort_order)
          : []
        return {
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product: {
            id: item.products?.id ?? item.product_id,
            name: item.products?.name ?? '',
            primaryImage: sortedImages[0]?.url ?? null,
          },
          variant: item.product_variants
            ? { id: item.product_variants.id, specs: item.product_variants.specs }
            : null,
        }
      }),
    }))

    return NextResponse.json({ orders })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

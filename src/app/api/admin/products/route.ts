import { NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { VariantOption } from '@/types'

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

interface SupplierRow {
  id: string
  name: string
  tag: string | null
}

interface ProductRow {
  id: string
  name: string
  supplier_id: string | null
  supplier: SupplierRow | null
  product_variants: { id: string; specs: Record<string, string>; price: number }[]
}

export interface ProductWithVariants {
  id: string
  name: string
  supplier_id: string | null
  supplier_name: string | null
  supplier_tag: string | null
  variants: VariantOption[]
}

/**
 * GET /api/admin/products
 * 回傳此賣場 active 商品 + 各商品的 variants，供代客建單下拉選取用。
 */
export async function GET() {
  try {
    const rhc = await createRouteHandlerClient()
    const {
      data: { user },
    } = await rhc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const lineId = extractLineId(user.email)
    if (!lineId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const db = createServiceClient()

    const { data: dbUser } = (await db
      .from('users')
      .select('id, role')
      .eq('line_id', lineId)
      .single()) as { data: { id: string; role: string } | null; error: unknown }

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 })
    if (dbUser.role !== 'merchant')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: store } = (await db
      .from('stores')
      .select('id')
      .eq('owner_id', dbUser.id)
      .maybeSingle()) as { data: { id: string } | null; error: unknown }

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = (await (db as any)
      .from('products')
      .select(
        'id, name, supplier_id, supplier:suppliers(id, name, tag), product_variants(id, specs, price)'
      )
      .eq('store_id', store.id)
      .eq('status', 'active')
      .order('name')) as {
      data: ProductRow[] | null
      error: { message: string } | null
    }

    if (error) throw new Error(error.message)

    const products: ProductWithVariants[] = (rows ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      supplier_id: row.supplier_id,
      supplier_name: row.supplier?.name ?? null,
      supplier_tag: row.supplier?.tag ?? null,
      variants: row.product_variants.map((v) => ({
        id: v.id,
        specs: v.specs,
        price: v.price,
      })),
    }))

    return NextResponse.json({ success: true, data: products })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

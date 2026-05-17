import { getServerStore } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import type { Product, ProductVariant, ProductImage, Supplier } from '@/types'
import ProductsClient from './ProductsClient'

interface ProductRow extends Product {
  variants: ProductVariant[]
  product_images: ProductImage[]
  supplier: Supplier | null
}

export default async function ProductsPage() {
  const store = await getServerStore()

  let products: ProductRow[] = []
  let suppliers: Supplier[] = []

  if (store) {
    const serviceClient = createServiceClient()

    const [productsResult, suppliersResult] = await Promise.all([
      serviceClient
        .from('products')
        .select(
          `
          *,
          variants:product_variants(*),
          product_images(*),
          supplier:suppliers(id, name)
        `
        )
        .eq('store_id', store.id)
        .order('created_at', { ascending: false }),
      serviceClient
        .from('suppliers')
        .select('id, name')
        .eq('store_id', store.id)
        .order('name', { ascending: true }),
    ])

    products = (productsResult.data ?? []) as ProductRow[]
    suppliers = (suppliersResult.data ?? []) as Supplier[]
  }

  return (
    <div>
      <div className='mb-6'>
        <h1 className='text-[26px] font-bold text-[var(--neutral-800)] tracking-wide mb-1.5 [font-family:var(--font-zen-maru-gothic)]'>
          商品管理
        </h1>
        <p className='text-[13.5px] text-[var(--neutral-500)]'>
          管理賣場商品、規格定價與公開設定。
        </p>
      </div>

      <ProductsClient initialProducts={products} suppliers={suppliers} />
    </div>
  )
}

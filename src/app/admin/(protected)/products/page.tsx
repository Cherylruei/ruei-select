import Link from 'next/link'
import { getServerStore } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import type { Product, ProductVariant, ProductImage, Supplier, ProductCategory } from '@/types'
import ProductsClient from './ProductsClient'

interface ProductRow extends Product {
  variants: ProductVariant[]
  product_images: ProductImage[]
  supplier: Supplier | null
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string }>
}) {
  const params = await searchParams
  const initialSupplierId = params.supplier ?? ''

  const store = await getServerStore()

  let products: ProductRow[] = []
  let suppliers: Supplier[] = []
  let categories: ProductCategory[] = []

  if (store) {
    const serviceClient = createServiceClient()

    const [productsResult, suppliersResult, categoriesResult] = await Promise.all([
      serviceClient
        .from('products')
        .select(
          `
          *,
          variants:product_variants(*),
          product_images(*),
          supplier:suppliers(id, name, tag)
        `
        )
        .eq('store_id', store.id)
        .order('created_at', { ascending: false }),
      serviceClient
        .from('suppliers')
        .select('id, name, tag, currency, avg_arrival_days')
        .eq('store_id', store.id)
        .order('name', { ascending: true }),
      serviceClient
        .from('product_categories')
        .select('*')
        .eq('store_id', store.id)
        .order('sort_order', { ascending: true }),
    ])

    products = (productsResult.data ?? []) as ProductRow[]
    suppliers = (suppliersResult.data ?? []) as Supplier[]
    categories = (categoriesResult.data ?? []) as ProductCategory[]
  }

  const totalCount = products.length
  const activeCount = products.filter((p) => p.status === 'active').length
  const inactiveCount = products.filter((p) => p.status === 'inactive').length

  return (
    <>
      {/* ── Sticky page topbar ───────────────────────────────────────────── */}
      <div className='sticky top-0 md:top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md px-8 py-5'>
        <div className='font-mono text-[11px] text-fg-subtle mb-2 flex items-center gap-1.5'>
          <Link href='/admin' className='hover:text-fg'>
            後台
          </Link>
          <span>›</span>
          <span className='text-fg'>商品管理</span>
        </div>
        <div className='flex items-center justify-between gap-4 flex-wrap'>
          <div>
            <h1 className='font-display font-bold text-2xl'>商品管理</h1>
            <p className='text-sm text-fg-muted mt-0.5'>
              共 <b className='text-fg'>{totalCount}</b> 件商品 ·{' '}
              <b className='text-success'>{activeCount}</b> 上架中 ·{' '}
              <b className='text-fg-muted'>{inactiveCount}</b> 已下架
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Link
              href='/admin/products/new'
              className='inline-flex items-center gap-2 h-10 rounded-pill bg-primary text-white px-5 font-display font-semibold text-sm shadow-pink hover:bg-primary-hv active:scale-[.97] transition'
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.2'
                strokeLinecap='round'
              >
                <path d='M12 5v14M5 12h14' />
              </svg>
              新增商品
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className='px-8 pt-6 pb-14'>
        <ProductsClient
          initialProducts={products}
          suppliers={suppliers}
          initialCategories={categories}
          initialSupplierId={initialSupplierId}
        />
      </div>
    </>
  )
}

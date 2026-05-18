import { getServerStore } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Supplier, ProductCategory } from '@/types'
import ProductForm from '@/components/products/ProductForm'

export default async function NewProductPage() {
  const store = await getServerStore()
  if (!store) redirect('/admin/login')

  const serviceClient = createServiceClient()
  const [suppliersResult, categoriesResult] = await Promise.all([
    serviceClient
      .from('suppliers')
      .select('id, name')
      .eq('store_id', store.id)
      .order('name', { ascending: true }),
    serviceClient
      .from('product_categories')
      .select('*')
      .eq('store_id', store.id)
      .order('sort_order', { ascending: true }),
  ])

  const suppliers = (suppliersResult.data ?? []) as Supplier[]
  const categories = (categoriesResult.data ?? []) as ProductCategory[]

  return (
    <div>
      <div className='mb-6'>
        <div className='flex items-center gap-2 text-[12.5px] text-[var(--neutral-400)] mb-3'>
          <Link
            href='/admin/products'
            className='hover:text-[var(--neutral-600)] transition-colors'
          >
            商品管理
          </Link>
          <span>/</span>
          <span className='text-[var(--neutral-600)]'>新增商品</span>
        </div>
        <h1 className='text-[26px] font-bold text-[var(--neutral-800)] tracking-wide [font-family:var(--font-zen-maru-gothic)]'>
          新增商品
        </h1>
      </div>

      <ProductForm mode='new' suppliers={suppliers} categories={categories} storeId={store.id} />
    </div>
  )
}

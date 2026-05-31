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
    <>
      {/* ── Sticky page topbar ───────────────────────────────────────────── */}
      <div className='sticky top-0 md:top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md px-9 py-5'>
        <div className='font-mono text-[11px] text-fg-subtle mb-2 flex items-center gap-1.5'>
          <Link href='/admin/products' className='hover:text-fg'>
            商品管理
          </Link>
          <span>/</span>
          <span className='text-fg'>新增商品</span>
        </div>
        <div className='flex items-end justify-between gap-4 flex-wrap'>
          <h1 className='font-display font-bold text-2xl'>新增商品</h1>
          <div className='flex items-center gap-2'>
            <Link
              href='/admin/products'
              className='h-10 px-5 rounded-pill border border-line text-fg font-display font-semibold text-sm hover:bg-sunken transition flex items-center'
            >
              取消
            </Link>
            <Link
              href='/admin/products'
              className='h-10 px-5 rounded-pill bg-secondary-bg text-secondary font-display font-semibold text-sm hover:bg-secondary hover:text-white transition flex items-center'
            >
              儲存草稿
            </Link>
            <button
              type='submit'
              form='product-form'
              className='inline-flex items-center gap-2 h-10 rounded-pill bg-primary text-white px-5 font-display font-semibold text-sm shadow-pink hover:bg-primary-hv active:scale-[.97] transition'
            >
              <svg
                width='15'
                height='15'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.2'
                strokeLinecap='round'
              >
                <path d='M5 12l4 4L19 6' />
              </svg>
              儲存並上架
            </button>
          </div>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className='px-9 py-7 pb-14'>
        <ProductForm mode='new' suppliers={suppliers} categories={categories} storeId={store.id} />
      </div>
    </>
  )
}

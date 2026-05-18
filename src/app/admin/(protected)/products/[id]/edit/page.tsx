import { getServerStore } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { Supplier, ProductWithDetails, ProductCategory } from '@/types'
import ProductForm from '@/components/products/ProductForm'

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const store = await getServerStore()
  if (!store) redirect('/admin/login')

  const serviceClient = createServiceClient()

  const [productResult, suppliersResult, categoriesResult] = (await Promise.all([
    serviceClient
      .from('products')
      .select('*, variants:product_variants(*), product_images(*), supplier:suppliers(id, name)')
      .eq('id', id)
      .eq('store_id', store.id)
      .single(),
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
  ])) as [
    { data: unknown; error: unknown },
    { data: unknown; error: unknown },
    { data: unknown; error: unknown },
  ]

  if (!productResult.data) notFound()

  const product = productResult.data as unknown as ProductWithDetails
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
          <span className='text-[var(--neutral-600)]'>編輯商品</span>
        </div>
        <h1 className='text-[26px] font-bold text-[var(--neutral-800)] tracking-wide [font-family:var(--font-zen-maru-gothic)]'>
          編輯商品
        </h1>
        <p className='text-[13.5px] text-[var(--neutral-500)] mt-1'>{product.name}</p>
      </div>

      <ProductForm
        mode='edit'
        product={product}
        suppliers={suppliers}
        categories={categories}
        storeId={store.id}
      />
    </div>
  )
}

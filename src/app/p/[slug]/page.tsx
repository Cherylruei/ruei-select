import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Store, Product, ProductVariant, ProductImage } from '@/types'
import PublicProductList from './PublicProductList'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

interface PublicProduct extends Product {
  variants: ProductVariant[]
  product_images: ProductImage[]
}

async function getPublicStore(slug: string): Promise<Store | null> {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('stores')
    .select('*')
    .eq('slug', slug)
    .eq('allow_public_products', true)
    .single()
  return data as Store | null
}

async function getPublicProducts(storeId: string): Promise<PublicProduct[]> {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('products')
    .select('*, variants:product_variants(*), product_images(*)')
    .eq('store_id', storeId)
    .eq('is_public', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  return (data ?? []) as PublicProduct[]
}

export async function generateStaticParams() {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('stores')
    .select('slug')
    .eq('allow_public_products', true)
    .limit(100)
  return (data ?? []).map((s: { slug: string }) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const store = await getPublicStore(slug)
  if (!store) return { title: '找不到賣場' }
  return {
    title: `${store.name} — 商品目錄`,
    description: `瀏覽 ${store.name} 的精選商品。`,
    robots: { index: true, follow: true },
    openGraph: {
      title: `${store.name} — 商品目錄`,
      description: `瀏覽 ${store.name} 的精選商品。`,
    },
  }
}

export default async function PublicStorePage({ params }: PageProps) {
  const { slug } = await params
  const store = await getPublicStore(slug)
  if (!store) notFound()

  const products = await getPublicProducts(store.id)

  return <PublicProductList store={store} products={products} />
}

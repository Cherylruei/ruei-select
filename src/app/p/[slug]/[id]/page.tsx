import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Store, ProductWithDetails } from '@/types'
import PublicProductDetail from './PublicProductDetail'

export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string; id: string }>
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

async function getPublicProduct(storeId: string, id: string): Promise<ProductWithDetails | null> {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient
    .from('products')
    .select('*, variants:product_variants(*), product_images(*), supplier:suppliers(id, name)')
    .eq('id', id)
    .eq('store_id', storeId)
    .eq('is_public', true)
    .eq('status', 'active')
    .single()
  return data as unknown as ProductWithDetails | null
}

export async function generateStaticParams() {
  const serviceClient = createServiceClient()
  const { data: stores } = (await serviceClient
    .from('stores')
    .select('id, slug')
    .eq('allow_public_products', true)
    .limit(100)) as unknown as { data: { id: string; slug: string }[] | null }

  if (!stores?.length) return []

  const params: { slug: string; id: string }[] = []
  for (const store of stores) {
    const { data: products } = (await serviceClient
      .from('products')
      .select('id')
      .eq('store_id', store.id)
      .eq('is_public', true)
      .eq('status', 'active')
      .limit(200)) as unknown as { data: { id: string }[] | null }
    for (const p of products ?? []) {
      params.push({ slug: store.slug, id: p.id })
    }
  }
  return params
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id } = await params
  const store = await getPublicStore(slug)
  if (!store) return { title: '找不到賣場' }
  const product = await getPublicProduct(store.id, id)
  if (!product) return { title: '找不到商品' }

  const imageUrl = product.product_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url

  return {
    title: `${product.name} — ${store.name}`,
    description: product.description?.slice(0, 160) ?? `${store.name} 商品`,
    robots: { index: true, follow: true },
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160) ?? `${store.name} 商品`,
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
  }
}

export default async function PublicProductDetailPage({ params }: PageProps) {
  const { slug, id } = await params
  const store = await getPublicStore(slug)
  if (!store) notFound()

  const product = await getPublicProduct(store.id, id)
  if (!product) notFound()

  const minPrice = Math.min(...(product.variants ?? []).map((v) => v.price))
  const maxPrice = Math.max(...(product.variants ?? []).map((v) => v.price))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: (product.product_images ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => i.url),
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'TWD',
      lowPrice: minPrice,
      highPrice: maxPrice,
      availability: 'https://schema.org/InStock',
    },
    seller: {
      '@type': 'Organization',
      name: store.name,
    },
  }

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicProductDetail store={store} product={product} />
    </>
  )
}

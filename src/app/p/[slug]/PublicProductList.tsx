'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Store, Product, ProductVariant, ProductImage, ProductCategory } from '@/types'
import ApplyModal from './components/ApplyModal'

interface PublicProduct extends Product {
  variants: ProductVariant[]
  product_images: ProductImage[]
}

interface Props {
  store: Store
  products: PublicProduct[]
  categories: ProductCategory[]
}

function getPriceRange(variants: ProductVariant[]): string {
  if (!variants || variants.length === 0) return ''
  const prices = variants.map((v) => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `NT$ ${min.toLocaleString()}`
  return `NT$ ${min.toLocaleString()} ~ ${max.toLocaleString()}`
}

export default function PublicProductList({ store, products, categories }: Props) {
  const [showApply, setShowApply] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const visibleProducts =
    selectedCategoryId === null
      ? products
      : products.filter((p) => p.category_id === selectedCategoryId)

  return (
    <div className='min-h-screen bg-[var(--neutral-50)]'>
      {/* 頁首 */}
      <header className='bg-white border-b border-[var(--neutral-200)] sticky top-0 z-10'>
        <div className='max-w-4xl mx-auto px-4 py-3 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            {store.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.avatar_url}
                alt={store.name}
                className='w-9 h-9 rounded-full object-cover border border-[var(--neutral-200)]'
              />
            ) : (
              <div className='w-9 h-9 rounded-full bg-gradient-to-br from-[var(--sage-400)] to-[var(--sage-600)] flex items-center justify-center'>
                <span className='text-white text-[13px] font-bold'>{store.name.charAt(0)}</span>
              </div>
            )}
            <span className='text-[15px] font-semibold text-[var(--neutral-800)] [font-family:var(--font-zen-maru-gothic)]'>
              {store.name}
            </span>
          </div>
          <button
            type='button'
            onClick={() => setShowApply(true)}
            className='px-4 py-2 rounded-xl bg-[var(--sage-500)] hover:bg-[var(--sage-600)] text-white text-[12.5px] font-semibold transition-colors'
          >
            申請加入
          </button>
        </div>
      </header>

      {/* 主體 */}
      <main className='max-w-4xl mx-auto px-4 py-6'>
        {categories.length > 0 && (
          <div className='flex gap-2 flex-wrap mb-5'>
            <button
              type='button'
              onClick={() => setSelectedCategoryId(null)}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors ${
                selectedCategoryId === null
                  ? 'bg-[var(--sage-500)] text-white'
                  : 'bg-white border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:border-[var(--sage-400)] hover:text-[var(--sage-600)]'
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type='button'
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-[var(--sage-500)] text-white'
                    : 'bg-white border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:border-[var(--sage-400)] hover:text-[var(--sage-600)]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {visibleProducts.length === 0 ? (
          <div className='text-center py-20'>
            <svg
              viewBox='0 0 24 24'
              width='36'
              height='36'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.4'
              className='mx-auto mb-3 text-[var(--neutral-300)]'
              aria-hidden='true'
            >
              <rect x='2' y='3' width='20' height='14' rx='2' />
              <line x1='8' y1='21' x2='16' y2='21' />
              <line x1='12' y1='17' x2='12' y2='21' />
            </svg>
            <p className='text-[14px] text-[var(--neutral-500)]'>目前尚無公開商品</p>
          </div>
        ) : (
          <>
            <p className='text-[13px] text-[var(--neutral-400)] mb-4'>
              {visibleProducts.length} 件商品
            </p>
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
              {visibleProducts.map((product) => {
                const thumb = product.product_images?.sort((a, b) => a.sort_order - b.sort_order)[0]
                  ?.url
                const price = getPriceRange(product.variants ?? [])

                return (
                  <Link
                    key={product.id}
                    href={`/p/${store.slug}/${product.id}`}
                    className='bg-white rounded-xl border border-[var(--neutral-200)] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group'
                  >
                    <div className='aspect-square bg-[var(--neutral-100)] overflow-hidden'>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={product.name}
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                          loading='lazy'
                        />
                      ) : (
                        <div className='w-full h-full flex items-center justify-center'>
                          <svg
                            viewBox='0 0 24 24'
                            width='28'
                            height='28'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='1.2'
                            className='text-[var(--neutral-300)]'
                            aria-hidden='true'
                          >
                            <rect x='3' y='3' width='18' height='18' rx='2' />
                            <circle cx='8.5' cy='8.5' r='1.5' />
                            <polyline points='21 15 16 10 5 21' />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className='p-2.5'>
                      <p className='text-[13px] font-medium text-[var(--neutral-800)] line-clamp-2 leading-snug mb-1'>
                        {product.name}
                      </p>
                      {price && (
                        <p className='text-[12px] font-semibold text-[var(--sakura-base)]'>
                          {price}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </main>

      {showApply && (
        <ApplyModal
          storeSlug={store.slug}
          storeName={store.name}
          onClose={() => setShowApply(false)}
        />
      )}
    </div>
  )
}

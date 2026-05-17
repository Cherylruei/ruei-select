'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Store, ProductWithDetails, ProductVariant } from '@/types'
import ApplyModal from '../components/ApplyModal'

interface Props {
  store: Store
  product: ProductWithDetails
}

function formatPrice(v: ProductVariant): string {
  return `NT$ ${v.price.toLocaleString()}`
}

export default function PublicProductDetail({ store, product }: Props) {
  const sortedImages = [...(product.product_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )
  const [selectedImage, setSelectedImage] = useState(sortedImages[0]?.url ?? null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] ?? null
  )
  const [showApply, setShowApply] = useState(false)

  const hasVariants = product.variants && product.variants.length > 0
  const hasSpecs = hasVariants && Object.keys(product.variants![0].specs).length > 0

  const specDimensions = hasSpecs
    ? [...new Set(product.variants!.flatMap((v) => Object.keys(v.specs)))]
    : []

  return (
    <div className='min-h-screen bg-[var(--neutral-50)]'>
      {/* 頁首 */}
      <header className='bg-white border-b border-[var(--neutral-200)] sticky top-0 z-10'>
        <div className='max-w-4xl mx-auto px-4 py-3 flex items-center gap-3'>
          <Link
            href={`/p/${store.slug}`}
            className='text-[var(--neutral-400)] hover:text-[var(--neutral-600)] transition-colors'
            aria-label='返回商品目錄'
          >
            <svg
              viewBox='0 0 24 24'
              width='20'
              height='20'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M19 12H5M12 19l-7-7 7-7' />
            </svg>
          </Link>
          <Link
            href={`/p/${store.slug}`}
            className='text-[14px] font-semibold text-[var(--neutral-800)] [font-family:var(--font-zen-maru-gothic)] hover:text-[var(--sage-600)] transition-colors'
          >
            {store.name}
          </Link>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 py-6'>
        <div className='bg-white rounded-2xl border border-[var(--neutral-200)] overflow-hidden'>
          <div className='grid md:grid-cols-2 gap-0'>
            {/* 圖片區 */}
            <div className='p-4 flex flex-col gap-3'>
              {/* 主圖 */}
              <div className='aspect-square rounded-xl overflow-hidden bg-[var(--neutral-100)]'>
                {selectedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center'>
                    <svg
                      viewBox='0 0 24 24'
                      width='40'
                      height='40'
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

              {/* 縮圖列 */}
              {sortedImages.length > 1 && (
                <div className='flex gap-2 overflow-x-auto pb-1'>
                  {sortedImages.map((img) => (
                    <button
                      key={img.id}
                      type='button'
                      onClick={() => setSelectedImage(img.url)}
                      className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImage === img.url
                          ? 'border-[var(--sage-500)]'
                          : 'border-[var(--neutral-200)] hover:border-[var(--neutral-400)]'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt='' className='w-full h-full object-cover' />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 商品資訊 */}
            <div className='p-5 md:p-6 flex flex-col gap-4 md:border-l border-[var(--neutral-100)]'>
              <div>
                <h1 className='text-[18px] font-bold text-[var(--neutral-800)] leading-snug mb-2'>
                  {product.name}
                </h1>
                {selectedVariant && (
                  <p className='text-[20px] font-bold text-[var(--sakura-base)]'>
                    {formatPrice(selectedVariant)}
                  </p>
                )}
              </div>

              {/* 規格選擇 */}
              {hasSpecs &&
                specDimensions.map((dimKey) => {
                  const options = [
                    ...new Set(product.variants!.map((v) => v.specs[dimKey]).filter(Boolean)),
                  ]
                  const selectedVal = selectedVariant?.specs[dimKey]

                  return (
                    <div key={dimKey} className='flex flex-col gap-2'>
                      <p className='text-[12.5px] font-medium text-[var(--neutral-600)]'>
                        {dimKey}
                      </p>
                      <div className='flex flex-wrap gap-2'>
                        {options.map((opt) => {
                          const matchingVariant = product.variants!.find(
                            (v) =>
                              v.specs[dimKey] === opt &&
                              (selectedVariant
                                ? Object.entries(selectedVariant.specs).every(
                                    ([k, val]) => k === dimKey || v.specs[k] === val
                                  )
                                : true)
                          )
                          const isSelected = selectedVal === opt
                          return (
                            <button
                              key={opt}
                              type='button'
                              onClick={() => {
                                if (matchingVariant) setSelectedVariant(matchingVariant)
                              }}
                              disabled={!matchingVariant}
                              className={`px-3 py-1.5 rounded-lg border text-[12.5px] transition-colors ${
                                isSelected
                                  ? 'border-[var(--sage-500)] bg-[var(--forest-50)] text-[var(--sage-700)] font-medium'
                                  : matchingVariant
                                    ? 'border-[var(--neutral-200)] text-[var(--neutral-600)] hover:border-[var(--neutral-400)]'
                                    : 'border-[var(--neutral-100)] text-[var(--neutral-300)] cursor-not-allowed'
                              }`}
                            >
                              {opt}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

              {/* 商品描述 */}
              {product.description && (
                <div className='border-t border-[var(--neutral-100)] pt-4'>
                  <p className='text-[12.5px] font-medium text-[var(--neutral-600)] mb-2'>
                    商品說明
                  </p>
                  <p className='text-[13px] text-[var(--neutral-600)] leading-relaxed whitespace-pre-line'>
                    {product.description}
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className='mt-auto pt-2'>
                <button
                  type='button'
                  onClick={() => setShowApply(true)}
                  className='w-full py-3.5 rounded-xl bg-[var(--sage-500)] hover:bg-[var(--sage-600)] text-white text-[14px] font-semibold transition-colors shadow-sm'
                >
                  我有興趣・申請加入賣場
                </button>
                <p className='text-center text-[11.5px] text-[var(--neutral-400)] mt-2'>
                  成為會員後即可向商家下單
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showApply && (
        <ApplyModal
          storeSlug={store.slug}
          storeName={store.name}
          productId={product.id}
          onClose={() => setShowApply(false)}
        />
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Store, ProductWithDetails, ProductVariant, Product, ProductImage } from '@/types'
import ApplyModal from '../components/ApplyModal'

interface RelatedProduct extends Product {
  product_images: ProductImage[]
  variants: ProductVariant[]
}

interface Props {
  store: Store
  product: ProductWithDetails
  relatedProducts?: RelatedProduct[]
}

function formatPrice(v: ProductVariant): string {
  return `NT$ ${v.price.toLocaleString()}`
}

export default function PublicProductDetail({ store, product, relatedProducts = [] }: Props) {
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
            className='text-[14px] font-semibold text-[var(--neutral-800)] [font-family:var(--font-zen-maru-gothic)] hover:text-[var(--forest-base)] transition-colors'
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
                          ? 'border-[var(--forest-base)]'
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
                                  ? 'border-[var(--forest-base)] bg-[var(--forest-50)] text-[var(--forest-deep)] font-medium'
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
              <div className='pt-2 border-t border-[var(--neutral-100)]'>
                <button
                  type='button'
                  onClick={() => setShowApply(true)}
                  className='w-full py-3.5 rounded-xl bg-[var(--sakura-base)] hover:bg-[var(--sakura-deep)] text-white text-[14px] font-semibold transition-colors shadow-[var(--sh-cta)] hover:shadow-[var(--sh-cta-h)]'
                >
                  我要下單
                </button>
                <p className='text-center text-[11.5px] text-[var(--neutral-400)] mt-2'>
                  成為會員後即可向商家下單
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* 更多公開商品 */}
        {relatedProducts.length > 0 && (
          <div className='mt-6'>
            <h2 className='text-[14px] font-semibold text-[var(--neutral-700)] mb-3 [font-family:var(--font-zen-maru-gothic)]'>
              更多公開商品
            </h2>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              {relatedProducts.map((rp) => {
                const thumb = [...(rp.product_images ?? [])].sort(
                  (a, b) => a.sort_order - b.sort_order
                )[0]?.url
                const prices = (rp.variants ?? []).map((v) => v.price)
                const minP = prices.length ? Math.min(...prices) : null
                return (
                  <Link
                    key={rp.id}
                    href={`/p/${store.slug}/${rp.id}`}
                    className='bg-white rounded-xl border border-[var(--neutral-200)] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group'
                  >
                    <div className='aspect-square bg-[var(--neutral-100)] overflow-hidden'>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={rp.name}
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
                      <p className='text-[12.5px] font-medium text-[var(--neutral-800)] line-clamp-2 leading-snug mb-1'>
                        {rp.name}
                      </p>
                      {minP !== null && (
                        <p className='text-[12px] font-semibold text-[var(--sakura-base)]'>
                          NT$ {minP.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* 底部 CTA 欄 */}
      <section className='bg-[var(--forest-deep)] py-4 px-4'>
        <div className='max-w-4xl mx-auto flex items-center justify-between gap-4'>
          <p className='text-[13px] text-[var(--forest-100)] leading-snug flex-1'>
            想看更多商品嗎？加入賣場後可瀏覽全部商品、規格與下單
          </p>
          <button
            type='button'
            onClick={() => setShowApply(true)}
            className='flex-shrink-0 px-5 py-2.5 rounded-full bg-[var(--sakura-base)] hover:bg-[var(--sakura-deep)] text-white text-[12.5px] font-semibold whitespace-nowrap transition-colors'
          >
            申請加入{store.name} →
          </button>
        </div>
      </section>

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

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { initLiff } from '@/lib/line/liff'
import VariantSelector from '@/components/store/VariantSelector'
import QuantitySelector from '@/components/store/QuantitySelector'
import OrderConfirmModal from '@/components/store/OrderConfirmModal'
import type { StoreProductDetail } from '@/types'

type PageState = 'loading' | 'ready' | 'error'

export default function ProductDetailPage() {
  const params = useParams<{ slug: string; id: string }>()
  const { slug, id } = params
  const router = useRouter()

  const [product, setProduct] = useState<StoreProductDetail | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const tokenRef = useRef<string>('dev-token')

  useEffect(() => {
    if (!slug || !id) return

    async function load() {
      try {
        let token = 'dev-mock-token'

        if (process.env.NODE_ENV !== 'development') {
          const liff = await initLiff()
          token = liff.getAccessToken() ?? ''
        }

        tokenRef.current = token

        const res = await fetch(
          `/api/store-products/${encodeURIComponent(id)}?slug=${encodeURIComponent(slug)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        if (res.status === 404) {
          setPageState('error')
          return
        }

        if (!res.ok) {
          setPageState('error')
          return
        }

        const data = (await res.json()) as { product: StoreProductDetail }
        setProduct(data.product)
        setPageState('ready')
      } catch {
        setPageState('error')
      }
    }

    load()
  }, [slug, id])

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }, [])

  async function handleConfirmOrder() {
    if (!selectedVariantId || !product) return
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({
          storeSlug: slug,
          productId: product.id,
          variantId: selectedVariantId,
          quantity,
        }),
      })

      if (!res.ok) {
        showToast('下單失敗，請稍後再試')
        setIsSubmitting(false)
        return
      }

      setShowModal(false)
      showToast('下單成功！')
      setTimeout(() => router.push(`/store/${slug}/orders`), 800)
    } catch {
      showToast('下單失敗，請稍後再試')
      setIsSubmitting(false)
    }
  }

  const selectedVariant = product?.variants.find((v) => v.id === selectedVariantId) ?? null

  if (pageState === 'loading') {
    return <ProductDetailSkeleton />
  }

  if (pageState === 'error' || !product) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] px-4 text-center'>
        <p className='text-sm text-[var(--neutral-500)]'>找不到此商品。</p>
        <button
          onClick={() => router.back()}
          className='mt-4 text-sm text-[var(--forest-base)] underline'
        >
          返回
        </button>
      </div>
    )
  }

  const canOrder = selectedVariantId !== null

  return (
    <>
      <div className='flex flex-col min-h-screen pb-32'>
        {/* 返回按鈕 */}
        <div className='px-4 pt-3 pb-1'>
          <button
            onClick={() => router.back()}
            className='flex items-center gap-1.5 text-sm text-[var(--neutral-600)] hover:text-[var(--neutral-800)]'
            aria-label='返回'
          >
            <svg
              viewBox='0 0 24 24'
              width='18'
              height='18'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
            >
              <path d='M19 12H5M12 19l-7-7 7-7' />
            </svg>
            返回
          </button>
        </div>

        {/* 圖片輪播 */}
        {product.images.length > 0 ? (
          <div className='relative w-full'>
            <div className='aspect-square relative overflow-hidden bg-[var(--neutral-100)]'>
              <Image
                src={product.images[activeImageIdx].url}
                alt={`${product.name} 圖片 ${activeImageIdx + 1}`}
                fill
                className='object-cover'
                priority
                sizes='100vw'
              />
            </div>
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImageIdx((i) => Math.max(0, i - 1))}
                  disabled={activeImageIdx === 0}
                  className='absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow disabled:opacity-30'
                  aria-label='上一張'
                >
                  <svg
                    viewBox='0 0 24 24'
                    width='16'
                    height='16'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <path d='M15 18l-6-6 6-6' />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setActiveImageIdx((i) => Math.min(product.images.length - 1, i + 1))
                  }
                  disabled={activeImageIdx === product.images.length - 1}
                  className='absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow disabled:opacity-30'
                  aria-label='下一張'
                >
                  <svg
                    viewBox='0 0 24 24'
                    width='16'
                    height='16'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <path d='M9 18l6-6-6-6' />
                  </svg>
                </button>
                {/* dot indicator */}
                <div className='absolute bottom-3 left-0 right-0 flex justify-center gap-1.5'>
                  {product.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={[
                        'w-2 h-2 rounded-full transition-all',
                        idx === activeImageIdx ? 'bg-white w-4' : 'bg-white/50',
                      ].join(' ')}
                      aria-label={`切換至第 ${idx + 1} 張`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className='aspect-square bg-[var(--neutral-100)] flex items-center justify-center'>
            <svg
              viewBox='0 0 24 24'
              width='48'
              height='48'
              fill='none'
              stroke='var(--neutral-300)'
              strokeWidth='1.5'
              aria-hidden='true'
            >
              <rect x='3' y='3' width='18' height='18' rx='2' />
              <circle cx='8.5' cy='8.5' r='1.5' />
              <path d='M21 15l-5-5L5 21' />
            </svg>
          </div>
        )}

        {/* 商品資訊 */}
        <div className='px-4 pt-4 flex flex-col gap-4'>
          <div>
            <h1
              className='text-[18px] font-bold text-[var(--neutral-800)] leading-snug'
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {product.name}
            </h1>
            {product.category && (
              <span className='inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[var(--forest-50)] text-[var(--forest-base)] text-[11px] font-medium border border-[var(--forest-100)]'>
                {product.category}
              </span>
            )}
          </div>

          {/* 售價顯示 */}
          <div className='text-[22px] font-bold text-[var(--sakura-base)]'>
            {selectedVariant ? (
              `NT$ ${selectedVariant.price.toLocaleString()}`
            ) : (
              <span className='text-[var(--neutral-300)]'>—</span>
            )}
          </div>

          {/* 規格選擇 */}
          {product.variants.length > 0 && (
            <div>
              <p className='text-[13px] font-semibold text-[var(--neutral-600)] mb-3'>選擇規格</p>
              <VariantSelector variants={product.variants} onChange={setSelectedVariantId} />
            </div>
          )}

          {/* 數量選擇 */}
          <div>
            <p className='text-[13px] font-semibold text-[var(--neutral-600)] mb-3'>選擇數量</p>
            <QuantitySelector value={quantity} onChange={setQuantity} />
          </div>

          {/* 商品描述 */}
          {product.description && (
            <div className='border-t border-[var(--neutral-200)] pt-4'>
              <p className='text-[13px] font-semibold text-[var(--neutral-600)] mb-2'>商品說明</p>
              <p className='text-[13px] text-[var(--neutral-600)] leading-relaxed whitespace-pre-wrap'>
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 固定底部 CTA */}
      <div
        className='fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[var(--neutral-200)] px-4 py-3'
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <button
          type='button'
          onClick={() => setShowModal(true)}
          disabled={!canOrder}
          title={!canOrder ? '請先選擇所有規格' : undefined}
          className='w-full py-3.5 rounded-full bg-[var(--sakura-base)] hover:bg-[var(--sakura-deep)] text-white text-[15px] font-bold disabled:bg-[var(--neutral-300)] disabled:cursor-not-allowed transition-colors shadow-[0_4px_14px_rgba(232,58,106,.32)] disabled:shadow-none'
          data-testid='order-btn'
        >
          立即下單
        </button>
      </div>

      {/* 下單確認彈窗 */}
      {showModal && selectedVariant && (
        <OrderConfirmModal
          productName={product.name}
          variant={selectedVariant}
          quantity={quantity}
          onConfirm={handleConfirmOrder}
          onClose={() => !isSubmitting && setShowModal(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Toast 通知 */}
      {toastMsg && (
        <div className='fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-[var(--neutral-800)] text-white text-[13px] font-medium rounded-full shadow-lg animate-in fade-in duration-200'>
          {toastMsg}
        </div>
      )}
    </>
  )
}

function ProductDetailSkeleton() {
  return (
    <div>
      <div className='aspect-square bg-[var(--neutral-100)] animate-pulse' />
      <div className='px-4 pt-4 flex flex-col gap-4'>
        <div className='h-5 w-3/4 rounded bg-[var(--neutral-100)] animate-pulse' />
        <div className='h-6 w-1/3 rounded bg-[var(--neutral-100)] animate-pulse' />
        <div className='flex flex-col gap-2'>
          {[1, 2].map((i) => (
            <div key={i} className='flex gap-2'>
              <div className='h-8 w-20 rounded-full bg-[var(--neutral-100)] animate-pulse' />
              <div className='h-8 w-20 rounded-full bg-[var(--neutral-100)] animate-pulse' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { initLiff } from '@/lib/line/liff'
import type { StoreProductDetail, StoreProductSummary } from '@/types'

const LW = '#F0D9CB'
const LWS = '#F7E5D8'
const LWK = '#E6C7B4'
const PH1 = 'repeating-linear-gradient(135deg,#FFE9E0,#FFE9E0 9px,#FFD9E4 9px,#FFD9E4 18px)'

// PC gallery constants — 4 thumbnails always visible, matching main image width
const GALLERY_W = 440 // main image max-width (px)
const THUMB_SHOW = 4 // thumbnails in window
const THUMB_GAP = 8 // gap between thumbnails (px)
const THUMB_W = (GALLERY_W - (THUMB_SHOW - 1) * THUMB_GAP) / THUMB_SHOW // 104px
const THUMB_STEP = THUMB_W + THUMB_GAP // 112px — translateX step per offset

type PageState = 'loading' | 'ready' | 'error'

export default function ProductDetailPage() {
  const params = useParams<{ slug: string; id: string }>()
  const { slug, id } = params
  const router = useRouter()

  const [product, setProduct] = useState<StoreProductDetail | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [relatedProducts, setRelatedProducts] = useState<StoreProductSummary[]>([])
  const [activeImgIdx, setActiveImgIdx] = useState(0)
  const [thumbOffset, setThumbOffset] = useState(0)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const tokenRef = useRef<string>('dev-mock-token')
  const carouselRef = useRef<HTMLDivElement>(null)

  // PC: navigate image + keep 4-thumbnail window in sync
  function navigateImage(newIdx: number) {
    if (newIdx < 0 || newIdx >= (product?.images.length ?? 0)) return
    setActiveImgIdx(newIdx)
    setThumbOffset((prev) => {
      if (newIdx < prev) return newIdx
      if (newIdx >= prev + THUMB_SHOW) return newIdx - THUMB_SHOW + 1
      return prev
    })
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

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
        if (!res.ok) {
          setPageState('error')
          return
        }

        const data = (await res.json()) as { product: StoreProductDetail }
        setProduct(data.product)
        setPageState('ready')
        if (data.product.variants.length === 1) {
          setSelectedVariantId(data.product.variants[0].id)
        }

        fetch(
          `/api/store-products?slug=${encodeURIComponent(slug)}&exclude=${encodeURIComponent(id)}&limit=4`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
          .then(async (r) => {
            if (!r.ok) return
            const d = await r.json()
            setRelatedProducts((d as { products: StoreProductSummary[] }).products ?? [])
          })
          .catch(() => {})
      } catch {
        setPageState('error')
      }
    }
    load()
  }, [slug, id])

  function handleCarouselScroll() {
    if (!carouselRef.current) return
    const c = carouselRef.current
    const idx = Math.round(c.scrollLeft / c.clientWidth)
    setActiveImgIdx(Math.max(0, Math.min((product?.images.length ?? 1) - 1, idx)))
  }

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
        const body = (await res.json()) as { error?: string }
        showToast(body.error ?? '下單失敗，請稍後再試')
        return
      }
      setShowConfirm(false)
      setShowSuccess(true)
    } catch {
      showToast('下單失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedVariant = product?.variants.find((v) => v.id === selectedVariantId) ?? null
  const hasMultipleVariants = (product?.variants.length ?? 0) > 1
  const canOrder = selectedVariantId !== null
  const imageCount = product?.images.length ?? 0

  function priceDisplay(): string {
    if (!product || product.variants.length === 0) return '—'
    if (selectedVariant) return selectedVariant.price.toLocaleString()
    const prices = product.variants.map((v) => v.price)
    const min = Math.min(...prices),
      max = Math.max(...prices)
    return min === max ? min.toLocaleString() : `${min.toLocaleString()} ~ ${max.toLocaleString()}`
  }

  function specsLabel(specs: Record<string, string>) {
    return Object.values(specs).join(' / ')
  }

  if (pageState === 'loading') return <ProductDetailSkeleton />
  if (pageState === 'error' || !product) return <ErrorState onBack={() => router.back()} />

  // ── Shared JSX pieces ──────────────────────────────────────────────────────
  const preOrderCard = (
    <div
      className='rounded-xl p-3.5 lg:p-4 flex items-center gap-3'
      style={{ background: '#FBEBD2', border: '1px solid #F0D9A8' }}
    >
      <div
        className='w-10 lg:w-11 h-10 lg:h-11 rounded-pill bg-white flex items-center justify-center shrink-0'
        style={{ color: '#C97A1E' }}
      >
        <svg
          width='20'
          height='20'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <path d='M3 8h11v9H3z' />
          <path d='M14 11h4l3 3v3h-7' />
          <circle cx='7' cy='18' r='2' />
          <circle cx='17.5' cy='18' r='2' />
        </svg>
      </div>
      <div className='flex-1'>
        <div className='flex items-center gap-1.5 lg:gap-2'>
          <span className='font-display font-bold text-sm'>預購商品</span>
          <span
            className='inline-flex items-center h-5 px-2 lg:px-2.5 rounded-pill font-mono font-bold text-[9px] tracking-wider'
            style={{ background: '#C97A1E', color: '#fff' }}
          >
            PRE-ORDER
          </span>
        </div>
        <div className='text-[12px] text-fg-muted mt-0.5'>
          下單後由商家向廠商調貨，到貨後通知你出貨 ✿
        </div>
      </div>
    </div>
  )

  const qtySection = (
    <div className='flex items-center justify-between'>
      <span className='font-display font-bold text-sm'>數量</span>
      <div className='flex items-center gap-3'>
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={quantity <= 1}
          className='w-9 lg:w-10 h-9 lg:h-10 rounded-pill bg-surface flex items-center justify-center active:scale-90 transition disabled:opacity-30'
          style={{ border: `1.5px solid ${LWK}` }}
          aria-label='減少數量'
        >
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.4'
            strokeLinecap='round'
            aria-hidden='true'
          >
            <path d='M6 12h12' />
          </svg>
        </button>
        <span className='font-display font-bold text-lg lg:text-xl w-7 lg:w-8 text-center select-none'>
          {quantity}
        </span>
        <button
          onClick={() => setQuantity((q) => Math.min(99, q + 1))}
          disabled={quantity >= 99}
          className='w-9 lg:w-10 h-9 lg:h-10 rounded-pill bg-primary text-white flex items-center justify-center active:scale-90 transition shadow-pink disabled:opacity-30'
          aria-label='增加數量'
        >
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.4'
            strokeLinecap='round'
            aria-hidden='true'
          >
            <path d='M12 6v12M6 12h12' />
          </svg>
        </button>
      </div>
    </div>
  )

  const infoRows = (
    <div className='rounded-xl bg-surface' style={{ border: `1px solid ${LW}` }}>
      <div
        className='flex items-center gap-3 px-3.5 py-3.5'
        style={{ borderBottom: `1px solid ${LWS}` }}
      >
        <svg
          width='18'
          height='18'
          viewBox='0 0 24 24'
          fill='none'
          stroke='#2F8A52'
          strokeWidth='1.8'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <path d='M5 12l4 4 10-10' />
          <circle cx='12' cy='12' r='10' />
        </svg>
        <div className='flex-1'>
          <div className='font-display font-bold text-[13px]'>驗貨保證</div>
          <div className='text-[12px] text-fg-muted'>到貨後檢查品項才幫你寄出</div>
        </div>
      </div>
      <div className='flex items-center gap-3 px-3.5 py-3.5'>
        <svg
          width='18'
          height='18'
          viewBox='0 0 24 24'
          fill='none'
          stroke='#C97A1E'
          strokeWidth='1.8'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <path d='M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z' />
        </svg>
        <div className='flex-1'>
          <div className='font-display font-bold text-[13px]'>下單即購買</div>
          <div className='text-[12px] text-fg-muted'>無購物車，送出即向商家登記，請確認規格</div>
        </div>
      </div>
    </div>
  )

  // ── Confirm modal inner content (shared between mobile sheet & desktop dialog) ──
  const confirmContent = (
    <>
      <div className='flex items-center justify-between mb-1'>
        <h3 className='font-display font-bold text-lg lg:text-xl'>確認下單</h3>
        <button
          onClick={() => !isSubmitting && setShowConfirm(false)}
          className='w-8 lg:w-9 h-8 lg:h-9 rounded-pill bg-sunken flex items-center justify-center hover:bg-line transition'
          aria-label='關閉'
        >
          <svg
            width='15'
            height='15'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.4'
            strokeLinecap='round'
            aria-hidden='true'
          >
            <path d='M6 6l12 12M6 18L18 6' />
          </svg>
        </button>
      </div>
      <div
        className='inline-flex items-center gap-1.5 mb-4 lg:mb-5 h-6 px-2.5 lg:px-3 rounded-pill font-display font-bold text-[11px] lg:text-xs'
        style={{ background: '#FBEBD2', color: '#C97A1E' }}
      >
        <svg
          width='11'
          height='11'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2.4'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <path d='M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z' />
        </svg>
        下單即購買 · 無購物車
      </div>
      <div className='flex gap-3 lg:gap-4'>
        <div
          className='w-20 lg:w-24 h-20 lg:h-24 rounded-lg lg:rounded-xl shrink-0 overflow-hidden'
          style={{ border: `1px solid ${LW}` }}
        >
          {product.images[0] ? (
            <Image
              src={product.images[0].url}
              alt={product.name}
              width={96}
              height={96}
              className='w-full h-full object-cover'
            />
          ) : (
            <div className='w-full h-full' style={{ background: PH1 }} aria-hidden='true' />
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='font-display font-bold text-sm lg:text-base leading-snug'>
            {product.name}
          </div>
          {selectedVariant && Object.keys(selectedVariant.specs).length > 0 && (
            <div className='text-xs text-fg-muted mt-1'>{specsLabel(selectedVariant.specs)}</div>
          )}
          <div className='flex items-center gap-2 mt-2'>
            <span
              className='inline-flex items-center h-5 px-2 lg:px-2.5 rounded-pill font-mono font-bold text-[9px] tracking-wider'
              style={{ background: '#FBEBD2', color: '#C97A1E' }}
            >
              預購
            </span>
          </div>
        </div>
      </div>
      <div
        className='mt-4 lg:mt-5 rounded-xl p-3.5 lg:p-4 space-y-2 lg:space-y-2.5'
        style={{ background: 'var(--bg-app)', border: `1px solid ${LWS}` }}
      >
        <div className='flex items-center justify-between text-[13px] lg:text-sm'>
          <span className='text-fg-muted'>單價</span>
          <span className='font-mono'>NT$ {(selectedVariant?.price ?? 0).toLocaleString()}</span>
        </div>
        <div className='flex items-center justify-between text-[13px] lg:text-sm'>
          <span className='text-fg-muted'>數量</span>
          <span className='font-mono'>× {quantity}</span>
        </div>
        <div
          className='flex items-center justify-between pt-2 lg:pt-2.5'
          style={{ borderTop: `1px solid ${LWS}` }}
        >
          <span className='font-display font-bold text-sm'>小計</span>
          <div className='flex items-baseline gap-1'>
            <span className='font-mono text-[11px] lg:text-xs text-fg-subtle'>NT$</span>
            <span
              className='font-display font-bold text-xl lg:text-2xl leading-none'
              style={{ color: '#D94466' }}
            >
              {((selectedVariant?.price ?? 0) * quantity).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <p className='text-[11px] lg:text-xs text-fg-subtle mt-2.5 lg:mt-3 leading-relaxed'>
        運費於商品到貨、結單時依物流方式計算。確認後將向商家登記訂單（狀態：待採買）。
      </p>
      <button
        onClick={handleConfirmOrder}
        disabled={isSubmitting}
        className='w-full mt-4 lg:mt-5 rounded-pill bg-primary text-white font-display font-bold text-base flex items-center justify-center gap-2.5 hover:bg-primary-hv active:scale-[.98] transition disabled:opacity-60'
        style={{ height: 52, boxShadow: '0 8px 24px -8px rgba(242,92,122,.5)' }}
      >
        {isSubmitting ? (
          '處理中...'
        ) : (
          <>
            確認下單
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.4'
              strokeLinecap='round'
              aria-hidden='true'
            >
              <path d='M5 12h14M13 6l6 6-6 6' />
            </svg>
          </>
        )}
      </button>
    </>
  )

  // ── Related product card (shared between mobile 2-col and desktop 4-col) ──
  function RelCard({ rel, size }: { rel: StoreProductSummary; size: 'sm' | 'lg' }) {
    return (
      <Link
        href={`/store/${slug}/products/${rel.id}`}
        className={`bg-surface overflow-hidden shadow-sm block transition ${size === 'lg' ? 'rounded-xl hover:-translate-y-[3px] hover:shadow-md' : 'rounded-lg'}`}
        style={{ border: `1px solid ${LW}` }}
      >
        <div className='aspect-square relative' style={{ borderBottom: `1px solid ${LWS}` }}>
          {rel.primaryImage ? (
            <Image
              src={rel.primaryImage}
              alt={rel.name}
              fill
              className='object-cover'
              sizes={
                size === 'lg' ? '(min-width:1024px) 25vw, 50vw' : '(max-width:420px) 50vw, 200px'
              }
            />
          ) : (
            <div className='w-full h-full' style={{ background: PH1 }} aria-hidden='true' />
          )}
        </div>
        <div className={size === 'lg' ? 'p-4' : 'p-3'}>
          <div className='font-display font-bold text-sm leading-tight line-clamp-2 min-h-[2.6em]'>
            {rel.name}
          </div>
          <div
            className={`flex items-baseline justify-between ${size === 'lg' ? 'mt-3 pt-2.5' : 'mt-2 pt-2'}`}
            style={{ borderTop: `1px solid ${LWS}` }}
          >
            <span className='font-mono text-[10px] text-fg-subtle'>NT$</span>
            <span
              className={`font-display font-bold leading-none ${size === 'lg' ? 'text-xl' : 'text-xl text-primary'}`}
              style={size === 'lg' ? { color: '#D94466' } : {}}
            >
              {rel.priceRange.min === rel.priceRange.max
                ? rel.priceRange.min.toLocaleString()
                : `${rel.priceRange.min.toLocaleString()} ~`}
            </span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <>
      <style>{`@keyframes pdPop{from{transform:translateY(18px) scale(.96);opacity:0}to{transform:none;opacity:1}}`}</style>

      {/* ── Desktop breadcrumb ─────────────────────────────────────────────── */}
      <nav
        className='hidden lg:flex items-center gap-1.5 text-xs text-fg-muted font-display font-semibold px-8 pt-5 pb-1'
        aria-label='麵包屑'
      >
        <Link href={`/store/${slug}`} className='hover:text-fg transition'>
          商品
        </Link>
        <svg
          width='12'
          height='12'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <path d='M9 6l6 6-6 6' />
        </svg>
        {product.category && (
          <>
            <span className='hover:text-fg transition cursor-default'>{product.category}</span>
            <svg
              width='12'
              height='12'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              aria-hidden='true'
            >
              <path d='M9 6l6 6-6 6' />
            </svg>
          </>
        )}
        <span className='text-fg truncate max-w-[300px]'>{product.name}</span>
      </nav>

      {/* ── Main grid wrapper ──────────────────────────────────────────────── */}
      <div className='lg:px-8 lg:pt-6 lg:pb-14 pb-28 lg:pb-14'>
        {/* max-w-[1120px] = 440 gallery + 80 gap + 600 panel */}
        <div
          className='lg:grid lg:gap-[80px] lg:max-w-[1120px]'
          style={{ gridTemplateColumns: `${GALLERY_W}px 1fr` }}
        >
          {/* ── LEFT: image column ── */}
          <div>
            {/* Mobile: floating nav + scroll-snap carousel */}
            <div className='relative lg:hidden'>
              <header className='absolute top-0 left-0 right-0 z-20 px-4 pt-5 flex items-center justify-between pointer-events-none'>
                <button
                  onClick={() => router.back()}
                  className='w-10 h-10 rounded-pill bg-white/90 backdrop-blur flex items-center justify-center shadow-sm pointer-events-auto'
                  style={{ border: `1px solid ${LW}` }}
                  aria-label='返回'
                >
                  <svg
                    width='20'
                    height='20'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    aria-hidden='true'
                  >
                    <path d='M15 6l-6 6 6 6' />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.share) {
                      navigator
                        .share({ title: product.name, url: window.location.href })
                        .catch(() => {})
                    }
                  }}
                  className='w-10 h-10 rounded-pill bg-white/90 backdrop-blur flex items-center justify-center shadow-sm pointer-events-auto'
                  style={{ border: `1px solid ${LW}` }}
                  aria-label='分享'
                >
                  <svg
                    width='19'
                    height='19'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    aria-hidden='true'
                  >
                    <circle cx='18' cy='5' r='2.5' />
                    <circle cx='6' cy='12' r='2.5' />
                    <circle cx='18' cy='19' r='2.5' />
                    <path d='M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6' />
                  </svg>
                </button>
              </header>

              {imageCount > 0 ? (
                <div
                  ref={carouselRef}
                  className='flex overflow-x-auto [&::-webkit-scrollbar]:hidden'
                  style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
                  onScroll={handleCarouselScroll}
                >
                  {product.images.map((img, idx) => (
                    <div
                      key={idx}
                      className='relative flex-none w-full aspect-square'
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <Image
                        src={img.url}
                        alt={`${product.name} 圖片 ${idx + 1}`}
                        fill
                        className='object-cover'
                        sizes='100vw'
                        priority={idx === 0}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className='aspect-square' style={{ background: PH1 }} aria-hidden='true' />
              )}

              {imageCount > 1 && (
                <>
                  <span className='absolute bottom-4 right-4 inline-flex items-center h-6 px-2.5 rounded-pill bg-black/45 backdrop-blur text-white font-mono text-[11px]'>
                    {activeImgIdx + 1}/{imageCount}
                  </span>
                  <div className='absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5'>
                    {product.images.map((_, idx) => (
                      <span
                        key={idx}
                        className='rounded-pill transition-all duration-200'
                        style={{
                          width: idx === activeImgIdx ? 18 : 6,
                          height: 6,
                          background: idx === activeImgIdx ? '#fff' : 'rgba(255,255,255,0.6)',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Desktop: main image + 4-thumbnail sliding window below */}
            <div className='hidden lg:block' style={{ maxWidth: GALLERY_W }}>
              {/* Main image */}
              <div className='relative'>
                <div
                  className='rounded-2xl overflow-hidden w-full aspect-square relative'
                  style={{ border: `1px solid ${LW}` }}
                >
                  {imageCount > 0 ? (
                    <Image
                      src={product.images[activeImgIdx]?.url ?? ''}
                      alt={product.name}
                      fill
                      className='object-cover'
                      sizes={`${GALLERY_W}px`}
                      priority
                    />
                  ) : (
                    <div className='w-full h-full' style={{ background: PH1 }} aria-hidden='true' />
                  )}
                </div>
                {imageCount > 1 && (
                  <span
                    className='absolute bottom-4 right-4 inline-flex items-center h-6 px-3 rounded-pill font-mono text-xs text-white'
                    style={{ background: 'rgba(35,34,32,.45)', backdropFilter: 'blur(4px)' }}
                  >
                    {activeImgIdx + 1} / {imageCount}
                  </span>
                )}
                {imageCount > 1 && (
                  <>
                    <button
                      onClick={() => navigateImage(activeImgIdx - 1)}
                      disabled={activeImgIdx === 0}
                      className='absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-pill bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:shadow-md transition disabled:opacity-40'
                      style={{ border: `1px solid ${LW}` }}
                      aria-label='上一張'
                    >
                      <svg
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        aria-hidden='true'
                      >
                        <path d='M15 6l-6 6 6 6' />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigateImage(activeImgIdx + 1)}
                      disabled={activeImgIdx === imageCount - 1}
                      className='absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-pill bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:shadow-md transition disabled:opacity-40'
                      style={{ border: `1px solid ${LW}` }}
                      aria-label='下一張'
                    >
                      <svg
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        aria-hidden='true'
                      >
                        <path d='M9 6l6 6-6 6' />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.share) {
                      navigator
                        .share({ title: product.name, url: window.location.href })
                        .catch(() => {})
                    }
                  }}
                  className='absolute top-4 right-4 w-9 h-9 rounded-pill bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:shadow-md transition'
                  style={{ border: `1px solid ${LW}` }}
                  aria-label='分享'
                >
                  <svg
                    width='17'
                    height='17'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    aria-hidden='true'
                  >
                    <circle cx='18' cy='5' r='2.5' />
                    <circle cx='6' cy='12' r='2.5' />
                    <circle cx='18' cy='19' r='2.5' />
                    <path d='M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6' />
                  </svg>
                </button>
              </div>

              {/* 4-thumbnail sliding window — always shows exactly 4 */}
              {imageCount > 1 && (
                <div className='mt-3 overflow-hidden' style={{ width: GALLERY_W }}>
                  <div
                    className='flex transition-transform duration-300 ease-out'
                    style={{
                      gap: THUMB_GAP,
                      transform: `translateX(-${thumbOffset * THUMB_STEP}px)`,
                    }}
                  >
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => navigateImage(idx)}
                        className={`flex-none rounded-xl overflow-hidden transition-opacity ${idx === activeImgIdx ? '' : 'hover:opacity-80'}`}
                        style={{
                          width: THUMB_W,
                          height: THUMB_W,
                          border:
                            idx === activeImgIdx
                              ? '2.5px solid var(--c-primary)'
                              : `2px solid ${LW}`,
                          boxShadow:
                            idx === activeImgIdx ? '0 0 0 3px var(--c-primary-bg)' : 'none',
                          outline: 'none',
                        }}
                        aria-label={`圖片 ${idx + 1}`}
                      >
                        <Image
                          src={img.url}
                          alt={`縮圖 ${idx + 1}`}
                          width={THUMB_W}
                          height={THUMB_W}
                          className='w-full h-full object-cover'
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT / BELOW: product info panel ── */}
          <div className='lg:sticky lg:top-[88px] lg:self-start'>
            <div className='px-5 pt-5 lg:px-0 lg:pt-0'>
              {/* Category pill */}
              {product.category && (
                <div className='flex flex-wrap gap-1.5 mb-3'>
                  <span className='inline-flex items-center h-[22px] px-2.5 rounded-pill font-display font-semibold text-[11px] bg-sunken text-fg-muted'>
                    {product.category}
                  </span>
                </div>
              )}

              {/* Title + description */}
              <h1 className='font-display font-bold text-xl lg:text-2xl leading-snug'>
                {product.name}
              </h1>
              {product.description && (
                <p className='text-[13px] lg:text-sm text-fg-muted mt-2 leading-relaxed lg:max-w-[340px]'>
                  {product.description}
                </p>
              )}

              {/* Price */}
              <div
                className='mt-4 lg:mt-5 pt-4 lg:pt-4 flex items-baseline gap-1.5 lg:gap-2'
                style={{ borderTop: `1px solid ${LWS}` }}
              >
                <span className='font-mono text-xs lg:text-sm text-fg-subtle'>NT$</span>
                <span
                  className='font-display font-bold text-3xl lg:text-4xl leading-none'
                  style={{ color: '#D94466' }}
                >
                  {priceDisplay()}
                </span>
              </div>

              {/* Variant selector */}
              {hasMultipleVariants && (
                <div className='mt-4 lg:mt-5'>
                  <p className='font-display font-bold text-sm mb-2.5'>選擇規格</p>
                  <div className='flex flex-wrap gap-2'>
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={[
                          'h-9 px-4 rounded-pill text-sm font-display font-semibold transition-colors',
                          v.id === selectedVariantId
                            ? 'bg-primary text-white shadow-pink'
                            : 'bg-surface text-fg',
                        ].join(' ')}
                        style={v.id === selectedVariantId ? {} : { border: `1px solid ${LW}` }}
                      >
                        {specsLabel(v.specs)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pre-order card */}
              <div className='mt-4 lg:mt-5'>{preOrderCard}</div>

              {/* Quantity */}
              <div className='mt-4 lg:mt-5'>{qtySection}</div>

              {/* Info rows */}
              <div className='mt-4 lg:mt-5'>{infoRows}</div>

              {/* Desktop CTA */}
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!canOrder}
                className='hidden lg:flex mt-5 w-full h-14 rounded-pill bg-primary text-white font-display font-bold text-base items-center justify-center gap-3 hover:bg-primary-hv active:scale-[.98] transition disabled:opacity-50 disabled:cursor-not-allowed'
                style={{ boxShadow: canOrder ? '0 8px 24px -8px rgba(242,92,122,.55)' : 'none' }}
              >
                <span>立即下單</span>
                {selectedVariant && (
                  <>
                    <span className='w-px h-6 bg-white/30' />
                    <span className='font-mono'>NT$ {selectedVariant.price.toLocaleString()}</span>
                  </>
                )}
              </button>

              {hasMultipleVariants && !canOrder && (
                <p className='hidden lg:block mt-2 text-xs text-fg-muted text-center font-display'>
                  請先選擇規格
                </p>
              )}

              {/* Desktop back link */}
              <div className='hidden lg:flex mt-4 items-center justify-center'>
                <Link
                  href={`/store/${slug}`}
                  className='inline-flex items-center gap-1.5 text-xs text-fg-muted font-display font-semibold hover:text-fg transition'
                >
                  <svg
                    width='13'
                    height='13'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    aria-hidden='true'
                  >
                    <path d='M15 6l-6 6 6 6' />
                  </svg>
                  繼續逛
                </Link>
              </div>

              {/* Mobile: related products + wishlist nudge */}
              <div className='lg:hidden pt-7 pb-4'>
                {relatedProducts.length > 0 && (
                  <>
                    <div className='flex items-center gap-3 mb-3'>
                      <h3 className='font-display font-bold text-lg leading-none'>
                        你可能還會喜歡
                      </h3>
                      <span
                        className='flex-1 h-px'
                        style={{ background: `linear-gradient(to right,${LW},transparent)` }}
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      {relatedProducts.map((rel) => (
                        <RelCard key={rel.id} rel={rel} size='sm' />
                      ))}
                    </div>
                  </>
                )}
                <Link
                  href={`/store/${slug}/wishlist`}
                  className='flex items-center gap-3 p-3.5 rounded-xl mt-5'
                  style={{
                    background: 'linear-gradient(135deg,#F4F0FF 0%,#ECE7FF 100%)',
                    border: '1px solid #D9D0FA',
                  }}
                >
                  <div className='w-10 h-10 rounded-pill bg-secondary text-white flex items-center justify-center shrink-0 shadow-green'>
                    <svg
                      width='19'
                      height='19'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.8'
                      strokeLinecap='round'
                      aria-hidden='true'
                    >
                      <path d='M12 4l2.5 5 5.5.8-4 4 1 5.5L12 16.8 7 19.3l1-5.5-4-4 5.5-.8L12 4z' />
                    </svg>
                  </div>
                  <div className='flex-1'>
                    <div className='font-display font-bold text-[13px]'>沒有想要的款式？</div>
                    <p className='text-[12px] text-fg-muted mt-0.5'>丟進許願池，商家幫你找</p>
                  </div>
                  <span className='h-8 px-3.5 rounded-pill bg-secondary text-white font-display font-bold text-xs shadow-green shrink-0 whitespace-nowrap flex items-center'>
                    許願
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Desktop: related products + wishlist banner ── */}
        <div className='hidden lg:block mt-16'>
          {relatedProducts.length > 0 && (
            <>
              <div className='flex items-center gap-4 mb-6'>
                <h2 className='font-display font-bold text-xl leading-none'>你可能還會喜歡</h2>
                <span className='font-mono text-xs text-fg-subtle tracking-wider uppercase'>
                  RECOMMENDED
                </span>
                <span
                  className='flex-1 h-px'
                  style={{ background: `linear-gradient(to right,${LWK},transparent)` }}
                />
                <Link
                  href={`/store/${slug}`}
                  className='inline-flex items-center gap-1.5 h-8 px-4 rounded-pill bg-surface font-display font-bold text-xs hover:shadow-sm transition'
                  style={{ border: `1px solid ${LW}` }}
                >
                  看全部商品
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2.4'
                    strokeLinecap='round'
                    aria-hidden='true'
                  >
                    <path d='M5 12h14M13 6l6 6-6 6' />
                  </svg>
                </Link>
              </div>
              <div className='grid grid-cols-4 gap-5'>
                {relatedProducts.map((rel) => (
                  <RelCard key={rel.id} rel={rel} size='lg' />
                ))}
              </div>
            </>
          )}
          <Link
            href={`/store/${slug}/wishlist`}
            className='mt-8 p-5 rounded-2xl flex items-center gap-5 hover:shadow-md transition'
            style={{
              background: 'linear-gradient(135deg,#F4F0FF 0%,#ECE7FF 100%)',
              border: '1px solid #D9D0FA',
            }}
          >
            <div className='w-12 h-12 rounded-pill bg-secondary text-white flex items-center justify-center shrink-0 shadow-green'>
              <svg
                width='22'
                height='22'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
                aria-hidden='true'
              >
                <path d='M12 4l2.5 5 5.5.8-4 4 1 5.5L12 16.8 7 19.3l1-5.5-4-4 5.5-.8L12 4z' />
              </svg>
            </div>
            <div className='flex-1'>
              <div className='font-display font-bold text-base'>沒有想要的款式？</div>
              <p className='text-sm text-fg-muted mt-0.5'>
                把想要的商品丟進許願池，商家幫你跨海尋找 ✿
              </p>
            </div>
            <span className='h-10 px-6 rounded-pill bg-secondary text-white font-display font-bold text-sm shadow-green shrink-0 whitespace-nowrap flex items-center gap-2 hover:bg-secondary-hv transition'>
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.2'
                strokeLinecap='round'
                aria-hidden='true'
              >
                <path d='M12 5v14M5 12h14' />
              </svg>
              立即許願
            </span>
          </Link>
        </div>
      </div>

      {/* ── Mobile: fixed bottom CTA ──────────────────────────────────────── */}
      <div
        className='fixed bottom-0 left-0 right-0 z-30 lg:hidden px-4 py-3 bg-surface/95 backdrop-blur-md'
        style={{ borderTop: `1px solid ${LW}` }}
      >
        {hasMultipleVariants && !canOrder ? (
          <div className='flex items-center gap-3'>
            <span className='flex-1 text-center text-sm text-fg-muted font-display'>
              請先選擇規格
            </span>
            <button
              disabled
              className='flex-1 h-12 rounded-pill bg-ink-200 text-fg-subtle font-display font-bold text-sm cursor-not-allowed'
            >
              立即下單
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canOrder}
            className='w-full h-12 rounded-pill bg-primary text-white font-display font-bold shadow-pink hover:bg-primary-hv active:scale-[.98] transition flex items-center justify-center gap-2.5 disabled:bg-ink-200 disabled:text-fg-subtle disabled:shadow-none'
          >
            <span>立即下單</span>
            {selectedVariant && (
              <>
                <span className='w-px h-5 bg-white/35' />
                <span className='font-mono text-sm'>
                  NT$ {selectedVariant.price.toLocaleString()}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Mobile: bottom sheet ──────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-50 flex items-end lg:hidden ${showConfirm ? '' : 'pointer-events-none'}`}
        style={{
          background: showConfirm ? 'rgba(35,34,32,0.45)' : 'transparent',
          backdropFilter: showConfirm ? 'blur(2px)' : 'none',
          transition: 'background .25s,backdrop-filter .25s',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) setShowConfirm(false)
        }}
      >
        <div
          className='w-full bg-surface rounded-t-2xl p-5 pb-7 transition-transform duration-300'
          style={{
            boxShadow: '0 -10px 40px rgba(35,34,32,.18)',
            transform: showConfirm ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          <div className='w-10 h-1.5 rounded-pill bg-line-strong mx-auto mb-4' />
          {confirmContent}
        </div>
      </div>

      {/* ── Desktop: centered modal ───────────────────────────────────────── */}
      {showConfirm && (
        <div
          className='fixed inset-0 z-50 hidden lg:flex items-center justify-center'
          style={{ background: 'rgba(35,34,32,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) setShowConfirm(false)
          }}
        >
          <div
            className='bg-surface rounded-2xl p-8 w-full max-w-[500px]'
            style={{
              boxShadow: '0 28px 60px -20px rgba(35,34,32,.30)',
              animation: 'pdPop .26s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
          >
            {confirmContent}
          </div>
        </div>
      )}

      {/* ── Success overlay ───────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center px-8 transition-opacity duration-200 ${showSuccess ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(35,34,32,0.5)', backdropFilter: 'blur(3px)' }}
      >
        <div className='bg-surface rounded-2xl p-7 lg:p-10 text-center max-w-[320px] lg:max-w-[360px] w-full shadow-lg'>
          <div
            className='w-16 lg:w-20 h-16 lg:h-20 rounded-pill mx-auto flex items-center justify-center'
            style={{ background: '#E1F4E6', color: '#2F8A52' }}
          >
            <svg
              width='32'
              height='38'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.4'
              strokeLinecap='round'
              aria-hidden='true'
            >
              <path d='M5 12l4 4 10-10' />
            </svg>
          </div>
          <div className='font-display font-bold text-lg lg:text-2xl mt-4 lg:mt-5'>下單成功 ✿</div>
          <p className='text-sm text-fg-muted mt-1.5 leading-snug'>
            商家已收到你的訂單，
            <br />
            到貨後會通知你結單付款。
          </p>
          <div className='flex gap-2 lg:gap-3 mt-5 lg:mt-7'>
            <button
              onClick={() => router.push(`/store/${slug}`)}
              className='flex-1 inline-flex items-center justify-center h-11 lg:h-12 rounded-pill bg-sunken text-fg font-display font-bold text-sm hover:bg-line transition'
            >
              繼續逛
            </button>
            <button
              onClick={() => router.push(`/store/${slug}/orders`)}
              className='flex-1 inline-flex items-center justify-center h-11 lg:h-12 rounded-pill bg-primary text-white font-display font-bold text-sm shadow-pink hover:bg-primary-hv transition'
            >
              看訂單
            </button>
          </div>
        </div>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className='fixed left-1/2 -translate-x-1/2 z-[70]' style={{ bottom: 84 }}>
          <div className='bg-ink-800 text-white text-[13px] font-display font-semibold px-4 py-2.5 rounded-pill shadow-lg whitespace-nowrap flex items-center gap-2'>
            <svg
              width='15'
              height='15'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.4'
              strokeLinecap='round'
              aria-hidden='true'
            >
              <circle cx='12' cy='12' r='9' />
              <path d='M12 8v4M12 16h.01' />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className='lg:px-8 lg:pt-6 pb-28 lg:pb-14'>
      {/* 桌機麵包屑 */}
      <div className='hidden lg:flex items-center gap-1.5 pb-1 mb-5'>
        <div className='h-3 w-44 rounded bg-ink-100 animate-pulse' />
      </div>

      <div
        className='lg:grid lg:gap-[80px] lg:max-w-[1120px]'
        style={{ gridTemplateColumns: `${GALLERY_W}px 1fr` }}
      >
        {/* 左欄：圖片區 */}
        <div>
          {/* 手機：全寬輪播佔位 */}
          <div className='aspect-square lg:hidden bg-ink-100 animate-pulse' />

          {/* 桌機：主圖 + 縮圖列 */}
          <div className='hidden lg:block' style={{ maxWidth: GALLERY_W }}>
            <div className='rounded-2xl aspect-square w-full bg-ink-100 animate-pulse' />
            <div className='mt-3 flex' style={{ gap: THUMB_GAP }}>
              {Array.from({ length: THUMB_SHOW }).map((_, i) => (
                <div
                  key={i}
                  className='rounded-xl bg-ink-100 animate-pulse flex-none'
                  style={{ width: THUMB_W, height: THUMB_W }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 右欄：商品資訊 */}
        <div className='px-5 pt-5 lg:px-0 lg:pt-0 space-y-4'>
          {/* 分類標籤 */}
          <div className='h-[22px] w-16 rounded-pill bg-ink-100 animate-pulse' />
          {/* 標題 + 描述 */}
          <div className='space-y-2'>
            <div className='h-7 w-3/4 rounded bg-ink-100 animate-pulse' />
            <div className='h-4 w-full rounded bg-ink-100 animate-pulse' />
            <div className='h-4 w-2/3 rounded bg-ink-100 animate-pulse' />
          </div>
          {/* 價格 */}
          <div className='h-10 w-40 rounded bg-ink-100 animate-pulse' />
          {/* 規格選擇 */}
          <div className='flex gap-2'>
            <div className='h-9 w-24 rounded-pill bg-ink-100 animate-pulse' />
            <div className='h-9 w-24 rounded-pill bg-ink-100 animate-pulse' />
            <div className='h-9 w-24 rounded-pill bg-ink-100 animate-pulse' />
          </div>
          {/* 預購卡 */}
          <div className='h-[76px] rounded-xl bg-ink-100 animate-pulse' />
          {/* 數量 */}
          <div className='h-10 rounded bg-ink-100 animate-pulse' />
          {/* 驗貨/下單說明列 */}
          <div className='h-[108px] rounded-xl bg-ink-100 animate-pulse' />
          {/* 桌機 CTA 按鈕 */}
          <div className='hidden lg:block h-14 rounded-pill bg-ink-100 animate-pulse' />
        </div>
      </div>
    </div>
  )
}

function ErrorState({ onBack }: { onBack: () => void }) {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] px-6 text-center'>
      <p className='text-sm text-fg-muted'>找不到此商品。</p>
      <button onClick={onBack} className='mt-4 text-sm text-primary underline'>
        返回
      </button>
    </div>
  )
}

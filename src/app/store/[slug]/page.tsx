'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { initLiff } from '@/lib/line/liff'
import ProductCard from '@/components/store/ProductCard'
import type { StoreProductSummary } from '@/types'

type PageState = 'loading' | 'ready' | 'empty' | 'error'

export default function StoreHomePage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [products, setProducts] = useState<StoreProductSummary[]>([])
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null)
  const [bannerLinkUrl, setBannerLinkUrl] = useState<string | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (!slug) return

    async function load() {
      try {
        let token = 'dev-mock-token'
        if (process.env.NODE_ENV !== 'development') {
          const liff = await initLiff()
          token = liff.getAccessToken() ?? ''
        }
        const res = await fetch(`/api/store-products?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          setPageState('error')
          return
        }
        const data = (await res.json()) as {
          products: StoreProductSummary[]
          store?: {
            banner_image_url: string | null
            banner_link_url: string | null
          }
        }
        setProducts(data.products)
        if (data.store) {
          setBannerImageUrl(data.store.banner_image_url)
          setBannerLinkUrl(data.store.banner_link_url)
        }
        setPageState(data.products.length === 0 ? 'empty' : 'ready')
      } catch {
        setPageState('error')
      }
    }

    load()
  }, [slug])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products) {
      const cat = p.category || '其他'
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
    }
    return [...counts.entries()].sort(([a], [b]) => {
      if (a === '其他') return 1
      if (b === '其他') return -1
      return 0
    })
  }, [products])

  const filteredProducts = useMemo(() => {
    let result = products
    if (activeCategory) {
      result = result.filter((p) => (p.category || '其他') === activeCategory)
    }
    if (keyword.trim()) {
      result = result.filter((p) => p.name.toLowerCase().includes(keyword.toLowerCase()))
    }
    return result
  }, [products, activeCategory, keyword])

  if (pageState === 'loading') return <ProductListSkeleton />

  if (pageState === 'error') {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] px-4 text-center'>
        <p className='text-sm text-fg-muted'>商品載入失敗，請稍後再試。</p>
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile layout ─────────────────────────────────── */}
      <div className='lg:hidden'>
        {/* search bar */}
        <div className='px-4 pt-4 pb-2'>
          <div className='relative'>
            <input
              type='search'
              placeholder='搜尋商品…'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className='w-full h-10 pl-9 pr-4 rounded-pill bg-surface text-sm outline-none'
              style={{ border: '1px solid #f0d9cb', fontFamily: 'var(--font-body)' }}
              aria-label='搜尋商品'
            />
            <svg
              width='15'
              height='15'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              className='absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none'
              aria-hidden='true'
            >
              <circle cx='11' cy='11' r='6' />
              <path d='M20 20l-4-4' strokeLinecap='round' />
            </svg>
          </div>
        </div>

        {/* category pills */}
        {categories.length > 0 && (
          <div className='flex gap-2 px-4 pb-3 overflow-x-auto' style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setActiveCategory(null)}
              className={[
                'flex-none h-8 px-4 rounded-pill font-display font-bold text-xs transition-colors whitespace-nowrap',
                activeCategory === null
                  ? 'bg-primary text-white shadow-pink'
                  : 'bg-surface text-fg-muted',
              ].join(' ')}
              style={activeCategory !== null ? { border: '1px solid #f0d9cb' } : undefined}
            >
              全部 {products.length}
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={[
                  'flex-none h-8 px-4 rounded-pill font-display font-bold text-xs transition-colors whitespace-nowrap',
                  activeCategory === cat
                    ? 'bg-primary text-white shadow-pink'
                    : 'bg-surface text-fg-muted',
                ].join(' ')}
                style={activeCategory !== cat ? { border: '1px solid #f0d9cb' } : undefined}
              >
                {cat} {count}
              </button>
            ))}
          </div>
        )}

        {/* product grid / empty state */}
        {pageState === 'empty' || filteredProducts.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-16 text-center px-4'>
            <div className='w-14 h-14 rounded-full bg-sunken flex items-center justify-center mb-3'>
              <svg
                viewBox='0 0 24 24'
                width='24'
                height='24'
                fill='none'
                stroke='var(--border-strong)'
                strokeWidth='1.5'
                aria-hidden='true'
              >
                <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
                <line x1='3' y1='6' x2='21' y2='6' />
                <path d='M16 10a4 4 0 01-8 0' />
              </svg>
            </div>
            <p className='text-sm text-fg-muted'>
              {pageState === 'empty' ? '賣場商品即將上架，敬請期待' : '找不到符合條件的商品'}
            </p>
          </div>
        ) : (
          <div className='px-4 pb-6 grid grid-cols-2 gap-3'>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} slug={slug} keyword={keyword} />
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop layout ─────────────────────────────────── */}
      <div className='hidden lg:block'>
        {/* Hero banner */}
        <section className='px-8 pt-8'>
          {bannerImageUrl ? (
            bannerLinkUrl ? (
              <a
                href={bannerLinkUrl}
                className='group block rounded-2xl overflow-hidden relative h-56 shadow-[0_22px_50px_-22px_rgba(20,19,15,0.35)]'
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerImageUrl}
                  alt='賣場橫幅'
                  className='w-full h-full object-cover transition duration-500 ease-out group-hover:scale-[1.035] group-hover:brightness-90'
                />
              </a>
            ) : (
              <div className='rounded-2xl overflow-hidden relative h-56 shadow-[0_22px_50px_-22px_rgba(20,19,15,0.35)]'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bannerImageUrl} alt='賣場橫幅' className='w-full h-full object-cover' />
              </div>
            )
          ) : (
            <div
              className='rounded-2xl px-10 py-9 relative overflow-hidden flex items-center gap-8'
              style={{
                background: 'linear-gradient(125deg, #FF6E94 0%, #9A8CFF 100%)',
                boxShadow:
                  '0 22px 50px -22px rgba(154,140,255,0.50), 0 0 0 1px rgba(255,110,148,0.18)',
              }}
            >
              <div className='absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/[0.12]' />
              <div className='absolute right-32 bottom-4 w-24 h-24 rounded-full bg-white/10' />
              <div className='absolute right-10 top-12 w-14 h-14 rounded-full bg-white/[0.14]' />

              <div className='relative z-10 flex-1 max-w-xl'>
                <span
                  className='inline-flex items-center gap-1.5 font-mono text-[11px] text-white tracking-[0.2em] uppercase px-2.5 py-1 rounded-full whitespace-nowrap'
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.28)',
                  }}
                >
                  ★ 本週精選商品
                </span>
                <h1 className='font-display font-bold text-white text-3xl mt-3 leading-[1.15]'>
                  精選好物
                  <br />
                  讓你的生活更精彩
                </h1>
                <p className='text-white/85 text-sm mt-3 font-mono tracking-wide'>
                  {products.length} 件商品等你探索
                </p>
                <div className='mt-5 flex items-center gap-3'>
                  <button
                    onClick={() => setActiveCategory(null)}
                    className='inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-white font-display font-bold text-sm shadow-sm'
                    style={{ color: 'var(--c-primary)' }}
                  >
                    所有商品
                  </button>
                </div>
              </div>

              {/* Product collage */}
              <div className='flex items-center gap-3 ml-auto relative z-10'>
                <div
                  className='w-32 h-40 rounded-xl shadow-md'
                  style={{
                    background:
                      'repeating-linear-gradient(135deg, #FFEAD0, #FFEAD0 8px, #FFDDB0 8px, #FFDDB0 16px)',
                    transform: 'rotate(-6deg)',
                  }}
                />
                <div
                  className='w-36 h-44 rounded-xl shadow-md'
                  style={{
                    background:
                      'repeating-linear-gradient(135deg, #FFE9E0, #FFE9E0 8px, #FFD9E4 8px, #FFD9E4 16px)',
                    transform: 'translateY(-12px) rotate(3deg)',
                  }}
                />
                <div
                  className='w-32 h-40 rounded-xl shadow-md'
                  style={{
                    background:
                      'repeating-linear-gradient(135deg, #ECE7FF, #ECE7FF 8px, #DDD3FF 8px, #DDD3FF 16px)',
                    transform: 'rotate(7deg)',
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Main grid: sidebar + product grid */}
        <section className='px-8 pt-8 pb-12 grid grid-cols-[220px_1fr] gap-8'>
          {/* Sidebar */}
          <aside className='space-y-5'>
            {/* Categories */}
            <div>
              <div className='flex items-center gap-2 mb-2 px-1'>
                <h3 className='font-display font-bold text-sm'>商品分類</h3>
                <span className='font-mono text-[10px] text-fg-subtle tracking-wider uppercase'>
                  CATEGORIES
                </span>
              </div>
              <nav
                className='bg-surface rounded-xl shadow-sm p-1.5 space-y-0.5'
                style={{ border: '1px solid #f0d9cb' }}
              >
                <CategoryRow
                  label='全部'
                  count={products.length}
                  active={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                  icon={
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                      opacity='0.85'
                      aria-hidden='true'
                    >
                      <circle cx='12' cy='12' r='6' />
                    </svg>
                  }
                />
                {categories.map(([cat, count]) => (
                  <CategoryRow
                    key={cat}
                    label={cat}
                    count={count}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  />
                ))}
              </nav>
            </div>

            {/* Wishlist nudge */}
            <div
              className='rounded-xl p-4 relative overflow-hidden'
              style={{
                background: 'linear-gradient(135deg, #F4F0FF 0%, #ECE7FF 100%)',
                border: '1px solid #D9D0FA',
              }}
            >
              <div
                className='w-10 h-10 rounded-full flex items-center justify-center mb-2'
                style={{
                  background: 'var(--c-secondary)',
                  color: 'white',
                  boxShadow: '0 4px 10px -2px rgba(154,140,255,.45)',
                }}
              >
                <svg
                  width='18'
                  height='18'
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
              <div className='font-display font-bold text-sm'>找不到想要的？</div>
              <p className='text-xs text-fg-muted mt-1 leading-snug'>
                丟進許願池，讓店主幫你跨海找 ✿
              </p>
              <Link
                href={`/store/${slug}/wishlist`}
                className='mt-3 w-full h-8 rounded-full flex items-center justify-center font-display font-bold text-xs text-white'
                style={{
                  background: 'var(--c-secondary)',
                  boxShadow: '0 4px 10px -2px rgba(154,140,255,.45)',
                }}
              >
                立即許願
              </Link>
            </div>
          </aside>

          {/* Product grid column */}
          <div>
            {/* Toolbar */}
            <div className='flex items-center gap-3 mb-4'>
              <h2 className='font-display font-bold text-xl leading-none'>
                {activeCategory ?? '為你精選'}
              </h2>
              <span className='font-mono text-xs text-fg-subtle tracking-wider uppercase'>
                {filteredProducts.length} ITEMS
              </span>
              <span
                className='flex-1 h-px'
                style={{ background: 'linear-gradient(to right, #e6c7b4, transparent)' }}
              />
              <button
                className='inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-surface font-display font-semibold text-xs shrink-0'
                style={{ border: '1px solid #f0d9cb', color: 'var(--fg-muted)' }}
              >
                <span>新上架</span>
                <svg
                  width='11'
                  height='11'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.2'
                  strokeLinecap='round'
                  aria-hidden='true'
                >
                  <path d='M6 9l6 6 6-6' />
                </svg>
              </button>
            </div>

            {/* 4-col product grid */}
            {filteredProducts.length === 0 ? (
              <div className='py-16 text-center'>
                <p className='text-sm text-fg-muted'>目前沒有符合條件的商品</p>
              </div>
            ) : (
              <>
                <div className='grid grid-cols-4 gap-4'>
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} slug={slug} keyword={keyword} />
                  ))}
                </div>
                {filteredProducts.length >= 16 && (
                  <div className='mt-8 flex items-center justify-center gap-3'>
                    <span className='h-px w-16' style={{ background: '#e6c7b4' }} />
                    <button
                      className='inline-flex items-center gap-2 h-11 px-7 rounded-full bg-surface font-display font-bold text-sm shadow-sm'
                      style={{ border: '1px solid #f0d9cb' }}
                    >
                      載入更多商品
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
                        <path d='M6 9l6 6 6-6' />
                      </svg>
                    </button>
                    <span className='h-px w-16' style={{ background: '#e6c7b4' }} />
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

// ── Category sidebar row ──────────────────────────────────────────────────────

function CategoryRow({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left transition-colors',
        'font-display font-semibold text-[13px]',
        active ? 'bg-primary-bg' : 'hover:bg-sunken',
      ].join(' ')}
      style={active ? { color: 'var(--c-primary-hv)' } : undefined}
    >
      {icon ?? (
        <svg
          width='14'
          height='14'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <circle cx='12' cy='12' r='5' />
        </svg>
      )}
      {label}
      <span
        className='ml-auto font-mono font-semibold text-[10.5px]'
        style={{ color: active ? 'var(--c-primary-hv)' : 'var(--fg-subtle)' }}
      >
        {count}
      </span>
    </button>
  )
}

// ── 骨架畫面 ─────────────────────────────────────────────────────────────────

function ProductListSkeleton() {
  return (
    <>
      {/* Mobile skeleton */}
      <div className='lg:hidden px-4 pt-4 pb-6'>
        <div className='h-10 rounded-pill bg-ink-100 animate-pulse mb-3' />
        <div className='flex gap-2 mb-4'>
          {[80, 60, 60].map((w, i) => (
            <div
              key={i}
              className='h-8 rounded-pill bg-ink-100 animate-pulse shrink-0'
              style={{ width: w }}
            />
          ))}
        </div>
        <div className='grid grid-cols-2 gap-3'>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className='bg-surface rounded-xl overflow-hidden shadow-sm'
              style={{ border: '1px solid #f0d9cb' }}
            >
              <div className='aspect-square bg-ink-100 animate-pulse' />
              <div className='p-3 flex flex-col gap-2'>
                <div className='h-3 w-full rounded bg-ink-100 animate-pulse' />
                <div className='h-3 w-2/3 rounded bg-ink-100 animate-pulse' />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop skeleton */}
      <div className='hidden lg:block px-8 pt-8 pb-12'>
        <div className='h-52 rounded-2xl bg-ink-100 animate-pulse mb-8' />
        <div className='grid grid-cols-[220px_1fr] gap-8'>
          <div className='space-y-4'>
            <div className='h-64 rounded-xl bg-ink-100 animate-pulse' />
            <div className='h-36 rounded-xl bg-ink-100 animate-pulse' />
          </div>
          <div>
            <div className='h-8 w-48 rounded bg-ink-100 animate-pulse mb-4' />
            <div className='grid grid-cols-4 gap-4'>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className='bg-surface rounded-xl overflow-hidden shadow-sm'
                  style={{ border: '1px solid #f0d9cb' }}
                >
                  <div className='aspect-square bg-ink-100 animate-pulse' />
                  <div className='p-3 flex flex-col gap-2'>
                    <div className='h-3 w-full rounded bg-ink-100 animate-pulse' />
                    <div className='h-3 w-2/3 rounded bg-ink-100 animate-pulse' />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

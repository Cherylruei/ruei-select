'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { initLiff } from '@/lib/line/liff'
import ProductCategoryGroup from '@/components/store/ProductCategoryGroup'
import type { StoreProductSummary } from '@/types'

type PageState = 'loading' | 'ready' | 'empty' | 'error'

export default function StoreHomePage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [products, setProducts] = useState<StoreProductSummary[]>([])
  const [pageState, setPageState] = useState<PageState>('loading')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    if (!slug) return

    async function load() {
      try {
        let token = 'dev-token'

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

        const data = (await res.json()) as { products: StoreProductSummary[] }
        setProducts(data.products)
        setPageState(data.products.length === 0 ? 'empty' : 'ready')
      } catch {
        setPageState('error')
      }
    }

    load()
  }, [slug])

  const filteredProducts = useMemo(() => {
    if (!keyword.trim()) return products
    return products.filter((p) => p.name.toLowerCase().includes(keyword.toLowerCase()))
  }, [products, keyword])

  const grouped = useMemo(() => {
    const map = new Map<string, StoreProductSummary[]>()
    for (const p of filteredProducts) {
      const cat = p.category || '其他'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    }
    // 「其他」排到最後
    const entries = [...map.entries()]
    const otherIdx = entries.findIndex(([cat]) => cat === '其他')
    if (otherIdx > 0) {
      const [other] = entries.splice(otherIdx, 1)
      entries.push(other)
    }
    return entries
  }, [filteredProducts])

  if (pageState === 'loading') {
    return <ProductListSkeleton />
  }

  if (pageState === 'error') {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] px-4 text-center'>
        <p className='text-sm text-[var(--neutral-500)]'>商品載入失敗，請稍後再試。</p>
      </div>
    )
  }

  return (
    <div className='px-4 pt-4 pb-6'>
      {/* 搜尋欄 */}
      <div className='relative mb-5'>
        <span className='absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'>
          <svg
            viewBox='0 0 24 24'
            width='16'
            height='16'
            fill='none'
            stroke='var(--neutral-400)'
            strokeWidth='2'
            aria-hidden='true'
          >
            <circle cx='11' cy='11' r='8' />
            <path d='M21 21l-4.35-4.35' />
          </svg>
        </span>
        <input
          type='search'
          placeholder='搜尋商品…'
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className='w-full pl-9 pr-4 py-2.5 rounded-full bg-[var(--neutral-100)] text-sm text-[var(--neutral-800)] placeholder:text-[var(--neutral-400)] border border-transparent focus:border-[var(--neutral-300)] focus:outline-none transition-colors'
          aria-label='搜尋商品'
        />
        {keyword && (
          <button
            onClick={() => setKeyword('')}
            className='absolute right-3 top-1/2 -translate-y-1/2 text-[var(--neutral-400)] hover:text-[var(--neutral-600)]'
            aria-label='清除搜尋'
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
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        )}
      </div>

      {/* 空狀態 */}
      {pageState === 'empty' && (
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <div className='w-16 h-16 rounded-full bg-[var(--neutral-100)] flex items-center justify-center mb-4'>
            <svg
              viewBox='0 0 24 24'
              width='28'
              height='28'
              fill='none'
              stroke='var(--neutral-300)'
              strokeWidth='1.5'
              aria-hidden='true'
            >
              <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
              <line x1='3' y1='6' x2='21' y2='6' />
              <path d='M16 10a4 4 0 01-8 0' />
            </svg>
          </div>
          <p className='text-sm text-[var(--neutral-500)]'>賣場商品即將上架，敬請期待</p>
        </div>
      )}

      {/* 搜尋無結果 */}
      {pageState === 'ready' && filteredProducts.length === 0 && keyword && (
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <p className='text-sm text-[var(--neutral-500)]'>
            找不到「<span className='text-[var(--neutral-700)] font-medium'>{keyword}</span>
            」相關商品
          </p>
        </div>
      )}

      {/* 商品分組列表 */}
      {grouped.length > 0 && (
        <div className='flex flex-col gap-6'>
          {grouped.map(([category, items]) => (
            <ProductCategoryGroup
              key={category}
              category={category}
              products={items}
              slug={slug}
              keyword={keyword}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductListSkeleton() {
  return (
    <div className='px-4 pt-4'>
      <div className='h-10 rounded-full bg-[var(--neutral-100)] animate-pulse mb-5' />
      <div className='flex items-center gap-3 mb-3'>
        <div className='h-3 w-16 rounded bg-[var(--neutral-100)] animate-pulse' />
        <div className='flex-1 h-px bg-[var(--neutral-100)]' />
      </div>
      <div className='grid grid-cols-2 gap-3'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='bg-white rounded-xl overflow-hidden shadow-[var(--sh-xs)]'>
            <div className='aspect-square bg-[var(--neutral-100)] animate-pulse' />
            <div className='p-3 flex flex-col gap-2'>
              <div className='h-3 w-full rounded bg-[var(--neutral-100)] animate-pulse' />
              <div className='h-3 w-2/3 rounded bg-[var(--neutral-100)] animate-pulse' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

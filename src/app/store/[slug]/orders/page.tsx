'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { initLiff } from '@/lib/line/liff'
import OrderStatusBadge from '@/components/store/OrderStatusBadge'
import OrderStatusFilter, { type OrderFilterValue } from '@/components/store/OrderStatusFilter'
import type { CustomerOrder } from '@/types'

type PageState = 'loading' | 'ready' | 'empty' | 'error'

function formatOrderedAt(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`
}

function formatSpecs(specs: Record<string, string>): string {
  return Object.entries(specs)
    .map(([k, v]) => `${k}：${v}`)
    .join('｜')
}

export default function OrdersPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [pageState, setPageState] = useState<PageState>('loading')
  const [filterValue, setFilterValue] = useState<OrderFilterValue>('all')

  useEffect(() => {
    if (!slug) return

    async function load() {
      try {
        let token = 'dev-mock-token'

        if (process.env.NODE_ENV !== 'development') {
          const liff = await initLiff()
          token = liff.getAccessToken() ?? ''
        }

        const res = await fetch(`/api/orders?storeSlug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          setPageState('error')
          return
        }

        const data = (await res.json()) as { orders: CustomerOrder[] }
        setOrders(data.orders)
        setPageState(data.orders.length === 0 ? 'empty' : 'ready')
      } catch {
        setPageState('error')
      }
    }

    load()
  }, [slug])

  const filteredOrders = useMemo(() => {
    if (filterValue === 'all') return orders
    return orders.filter((o) => o.displayStatus === filterValue)
  }, [orders, filterValue])

  if (pageState === 'loading') {
    return <OrdersSkeleton />
  }

  if (pageState === 'error') {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] px-4 text-center'>
        <p className='text-sm text-[var(--neutral-500)]'>訂單載入失敗，請稍後再試。</p>
      </div>
    )
  }

  return (
    <div className='px-4 pt-4 pb-6'>
      {/* 篩選列 */}
      <div className='flex items-center justify-between mb-4'>
        <h2
          className='text-[15px] font-bold text-[var(--neutral-800)]'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          我的訂單
        </h2>
        <OrderStatusFilter value={filterValue} onChange={setFilterValue} />
      </div>

      {/* 無訂單（空狀態） */}
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
              <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' />
              <polyline points='14 2 14 8 20 8' />
              <line x1='16' y1='13' x2='8' y2='13' />
              <line x1='16' y1='17' x2='8' y2='17' />
            </svg>
          </div>
          <p className='text-sm text-[var(--neutral-500)] mb-4'>目前尚無訂單，快去選購吧！</p>
          <Link
            href={`/store/${slug}`}
            className='inline-flex items-center gap-1.5 px-5 py-2.5 bg-[var(--forest-base)] hover:bg-[var(--forest-deep)] text-white text-[13px] font-semibold rounded-full transition-colors shadow-[var(--sh-sm)]'
          >
            去逛商品
          </Link>
        </div>
      )}

      {/* 篩選後無結果 */}
      {pageState === 'ready' && filteredOrders.length === 0 && (
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <p className='text-sm text-[var(--neutral-500)]'>目前沒有「{filterValue}」的訂單</p>
        </div>
      )}

      {/* 訂單列表 */}
      {filteredOrders.length > 0 && (
        <div className='flex flex-col gap-3'>
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const item = order.items[0]
  if (!item) return null

  const subtotal = item.quantity * item.unit_price

  return (
    <div className='bg-white rounded-xl shadow-[var(--sh-xs)] overflow-hidden border border-[var(--neutral-100)]'>
      <div className='p-3 flex gap-3'>
        {/* 商品圖 */}
        <div className='w-16 h-16 rounded-lg overflow-hidden bg-[var(--neutral-100)] flex-shrink-0 relative'>
          {item.product.primaryImage ? (
            <Image
              src={item.product.primaryImage}
              alt={item.product.name}
              fill
              className='object-cover'
              sizes='64px'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center'>
              <svg
                viewBox='0 0 24 24'
                width='24'
                height='24'
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
        </div>

        {/* 商品資訊 */}
        <div className='flex-1 min-w-0 flex flex-col gap-1'>
          <p className='text-[13px] font-semibold text-[var(--neutral-800)] truncate'>
            {item.product.name}
          </p>
          {item.variant && Object.keys(item.variant.specs).length > 0 && (
            <p className='text-[11px] text-[var(--neutral-500)]'>
              {formatSpecs(item.variant.specs)}
            </p>
          )}
          <p className='text-[12px] text-[var(--neutral-500)]'>
            {item.quantity} × NT$ {item.unit_price.toLocaleString()} ={' '}
            <span className='font-semibold text-[var(--sakura-base)]'>
              NT$ {subtotal.toLocaleString()}
            </span>
          </p>
        </div>
      </div>

      {/* 狀態列 */}
      <div className='px-3 py-2 border-t border-[var(--neutral-100)] flex items-center justify-between'>
        <span className='text-[11px] text-[var(--neutral-400)]'>
          {formatOrderedAt(order.ordered_at)}
        </span>
        <OrderStatusBadge displayStatus={order.displayStatus} />
      </div>
    </div>
  )
}

function OrdersSkeleton() {
  return (
    <div className='px-4 pt-4'>
      <div className='flex items-center justify-between mb-4'>
        <div className='h-4 w-20 rounded bg-[var(--neutral-100)] animate-pulse' />
        <div className='h-8 w-24 rounded-lg bg-[var(--neutral-100)] animate-pulse' />
      </div>
      <div className='flex flex-col gap-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='bg-white rounded-xl p-3 flex gap-3 shadow-[var(--sh-xs)]'>
            <div className='w-16 h-16 rounded-lg bg-[var(--neutral-100)] animate-pulse flex-shrink-0' />
            <div className='flex-1 flex flex-col gap-2 justify-center'>
              <div className='h-3 w-3/4 rounded bg-[var(--neutral-100)] animate-pulse' />
              <div className='h-3 w-1/2 rounded bg-[var(--neutral-100)] animate-pulse' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

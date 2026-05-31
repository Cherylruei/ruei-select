import { Suspense } from 'react'
import Link from 'next/link'
import OrdersClient from './OrdersClient'

export const metadata = { title: '訂單管理 — 芮選後台' }

export default function OrdersPage() {
  return (
    <>
      {/* ── Sticky topbar ─────────────────────────────────────────────────── */}
      <div className='sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md px-8 py-5'>
        <div className='font-mono text-[11px] text-fg-subtle mb-2 flex items-center gap-1.5'>
          <Link href='/admin' className='hover:text-fg'>
            後台
          </Link>
          <span>›</span>
          <span className='text-fg'>訂單管理</span>
        </div>
        <div className='flex items-center justify-between gap-4 flex-wrap'>
          <div>
            <h1 className='font-display font-bold text-2xl'>訂單管理</h1>
          </div>
          <div className='flex items-center gap-2'>
            <Link
              href='/admin/orders/new'
              className='inline-flex items-center gap-2 h-10 rounded-pill bg-primary text-white px-5 font-display font-semibold text-sm shadow-pink hover:bg-primary-hv active:scale-[.97] transition'
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.2'
                strokeLinecap='round'
              >
                <path d='M12 5v14M5 12h14' />
              </svg>
              代客建單
            </Link>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className='px-8 pt-6 pb-14 space-y-5'>
        <Suspense fallback={<OrdersSkeleton />}>
          <OrdersClient />
        </Suspense>
      </div>
    </>
  )
}

function OrdersSkeleton() {
  return (
    <div className='space-y-5 animate-pulse'>
      {/* Pipeline skeleton */}
      <div className='bg-surface border border-line rounded-xl p-5'>
        <div className='h-4 w-24 bg-ink-200 rounded mb-4' />
        <div className='grid grid-cols-5 gap-3'>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className='rounded-md border border-line p-3 space-y-2'>
              <div className='h-3 w-16 bg-ink-100 rounded' />
              <div className='h-7 w-8 bg-ink-200 rounded' />
            </div>
          ))}
        </div>
      </div>
      {/* Table skeleton */}
      <div className='bg-surface border border-line rounded-xl overflow-hidden'>
        <div className='px-5 py-3 border-b border-line flex gap-2'>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className='h-8 w-20 bg-ink-100 rounded-pill' />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className='border-t border-line px-5 py-4 flex gap-4 items-center'>
            <div className='h-4 w-20 bg-ink-100 rounded font-mono' />
            <div className='flex items-center gap-2'>
              <div className='w-7 h-7 rounded-pill bg-ink-100' />
              <div className='h-4 w-24 bg-ink-100 rounded' />
            </div>
            <div className='h-4 w-40 bg-ink-100 rounded' />
            <div className='h-4 w-16 bg-ink-100 rounded ml-auto' />
            <div className='h-6 w-14 bg-ink-100 rounded-pill' />
          </div>
        ))}
      </div>
    </div>
  )
}

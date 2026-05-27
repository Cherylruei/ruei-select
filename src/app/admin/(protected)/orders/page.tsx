import { Suspense } from 'react'
import OrdersClient from './OrdersClient'

export const metadata = { title: '訂單管理 — 芮選後台' }

function OrdersSkeleton() {
  return (
    <div className='flex flex-col gap-3 animate-pulse'>
      {[1, 2, 3].map((i) => (
        <div key={i} className='bg-surface rounded-xl border border-line p-4'>
          <div className='flex items-start justify-between mb-3'>
            <div className='space-y-1.5'>
              <div className='h-4 w-20 bg-ink-200 rounded' />
              <div className='h-3 w-32 bg-ink-100 rounded' />
            </div>
            <div className='h-6 w-14 bg-ink-200 rounded-full' />
          </div>
          <div className='space-y-2'>
            <div className='h-4 bg-ink-100 rounded w-3/4' />
            <div className='h-4 bg-ink-100 rounded w-1/2' />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersClient />
    </Suspense>
  )
}

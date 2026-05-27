import { Suspense } from 'react'
import OrderDetailClient from './OrderDetailClient'

export const metadata = { title: '訂單詳情 — 芮選後台' }

function DetailSkeleton() {
  return (
    <div className='max-w-2xl animate-pulse space-y-4'>
      <div className='h-5 w-32 bg-ink-200 rounded' />
      <div className='bg-surface border border-line rounded-xl p-6 space-y-3'>
        <div className='h-4 w-48 bg-ink-200 rounded' />
        <div className='h-4 w-64 bg-ink-100 rounded' />
        <div className='h-4 w-40 bg-ink-100 rounded' />
      </div>
      <div className='bg-surface border border-line rounded-xl p-6 space-y-2'>
        {[1, 2].map((i) => (
          <div key={i} className='flex gap-4'>
            <div className='h-4 flex-1 bg-ink-100 rounded' />
            <div className='h-4 w-20 bg-ink-100 rounded' />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <OrderDetailClient params={params} />
    </Suspense>
  )
}

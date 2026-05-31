import Link from 'next/link'
import CheckoutClient from './CheckoutClient'

export const metadata = { title: '代客結單 — 芮選後台' }

export default function OrderCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      {/* ── Sticky topbar ─────────────────────────────────────────────────── */}
      <div className='sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md px-8 py-5'>
        <div className='font-mono text-[11px] text-fg-subtle mb-2 flex items-center gap-1.5'>
          <Link href='/admin' className='hover:text-fg'>
            後台
          </Link>
          <span>›</span>
          <Link href='/admin/orders' className='hover:text-fg'>
            訂單管理
          </Link>
          <span>›</span>
          <span className='text-fg'>代客結單</span>
        </div>
        <div className='flex items-center gap-3'>
          <Link
            href='/admin/orders'
            className='w-10 h-10 rounded-pill hover:bg-sunken flex items-center justify-center text-fg-subtle transition'
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
            >
              <path d='M15 6l-6 6 6 6' />
            </svg>
          </Link>
          <div>
            <h1 className='font-display font-bold text-2xl'>代客結單</h1>
            <p className='text-sm text-fg-muted mt-0.5'>
              為顧客確認物流與付款方式 · 結單後狀態為「已結單」
            </p>
          </div>
        </div>
      </div>

      <CheckoutClient params={params} />
    </>
  )
}

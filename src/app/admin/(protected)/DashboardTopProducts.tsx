'use client'

import { useState } from 'react'

export interface MockProduct {
  name: string
  supplier: string
  orders: number
  qty: number
  revenue: number
  trend: number
}

type Period = '本月' | '本週' | '今日'
const PERIODS: Period[] = ['本月', '本週', '今日']

export function DashboardTopProducts({ products }: { products: MockProduct[] }) {
  const [period, setPeriod] = useState<Period>('本月')

  return (
    <div className='lg:col-span-2 bg-surface border border-line rounded-xl p-5'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <h2 className='font-display font-bold text-lg'>本月熱銷</h2>
          <p className='text-xs text-fg-muted mt-0.5'>依訂單數量排序</p>
        </div>
        <div className='flex items-center gap-1 bg-sunken rounded-pill p-0.5'>
          {PERIODS.map((p) => (
            <button
              key={p}
              type='button'
              onClick={() => setPeriod(p)}
              className={[
                'h-7 px-3 rounded-pill font-display font-semibold text-xs transition',
                period === p ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              ].join(' ')}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className='space-y-1'>
        {products.map((p) => (
          <div
            key={p.name}
            className='flex items-center gap-3 p-2.5 rounded-md hover:bg-ink-50 transition-colors'
          >
            <div
              className='w-12 h-12 rounded-md shrink-0'
              style={{
                background:
                  'repeating-linear-gradient(135deg,var(--ink-100),var(--ink-100) 8px,var(--ink-50) 8px,var(--ink-50) 16px)',
              }}
            />
            <div className='flex-1 min-w-0'>
              <div className='font-display font-semibold text-sm truncate'>{p.name}</div>
              <div className='flex items-center gap-2 mt-1'>
                <span className='inline-flex items-center h-5 px-2 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[10px]'>
                  {p.supplier}
                </span>
                <span className='text-xs text-fg-muted'>
                  {p.orders} 訂單 · {p.qty} 件
                </span>
              </div>
            </div>
            <div className='text-right shrink-0'>
              <div className='font-mono font-semibold text-sm'>
                NT$ {p.revenue.toLocaleString()}
              </div>
              <div
                className={`font-mono text-[10px] ${p.trend > 0 ? 'text-success' : 'text-danger'}`}
              >
                {p.trend > 0 ? '+' : ''}
                {p.trend}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

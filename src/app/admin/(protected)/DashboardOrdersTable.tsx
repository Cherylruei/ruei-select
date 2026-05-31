/* Tailwind JIT safelist — avatar colors used in mock data
 * bg-sakura-300 bg-sakura-400 bg-forest-400 bg-earth-400 bg-info
 */
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { OrderStatusBadge } from '@/components/ui/Badge'

type OrderStatus =
  | 'pending_purchase'
  | 'ordered'
  | 'allocated'
  | 'settled'
  | 'shipped'
  | 'completed'
  | 'cancelled'

export interface MockOrder {
  id: string // 完整 UUID，用於 React key
  displayId: string // 縮短顯示 ID，例：RS-A1B2C3
  date: string
  name: string
  initial: string
  avatarClass: string
  product: string
  amount: number
  status: OrderStatus
}

type FilterTab = 'all' | 'pending_purchase' | 'allocated' | 'shipped'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_purchase', label: '待採買' },
  { key: 'allocated', label: '已配單' },
  { key: 'shipped', label: '已出貨' },
]

export function DashboardOrdersTable({ orders }: { orders: MockOrder[] }) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const filtered = activeTab === 'all' ? orders : orders.filter((o) => o.status === activeTab)

  return (
    <div className='lg:col-span-2 bg-surface border border-line rounded-xl overflow-hidden'>
      <div className='px-5 py-4 flex items-center justify-between border-b border-line flex-wrap gap-2'>
        <div>
          <h2 className='font-display font-bold text-lg'>最近訂單</h2>
          <p className='text-xs text-fg-muted mt-0.5'>過去 7 天 · 共 12 筆</p>
        </div>
        <div className='flex items-center gap-1.5'>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type='button'
              onClick={() => setActiveTab(tab.key)}
              className={[
                'inline-flex items-center h-7 px-3 rounded-pill font-display font-semibold text-xs transition',
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-sunken text-fg-muted hover:bg-ink-200',
              ].join(' ')}
            >
              {tab.key === 'all' && <span className='w-1.5 h-1.5 rounded-pill bg-current mr-1' />}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className='overflow-x-auto'>
        {filtered.length === 0 ? (
          <div className='px-5 py-8 text-center text-sm text-fg-muted'>此分類目前沒有訂單</div>
        ) : (
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-ink-50'>
                <th className='text-left px-5 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted whitespace-nowrap'>
                  訂單
                </th>
                <th className='text-left px-5 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted'>
                  顧客
                </th>
                <th className='text-left px-4 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted'>
                  商品
                </th>
                <th className='text-right px-5 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted whitespace-nowrap'>
                  金額
                </th>
                <th className='text-left px-5 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted'>
                  狀態
                </th>
                <th className='w-8' />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className='border-t border-line hover:bg-ink-50 cursor-pointer transition-colors'
                >
                  <td className='px-5 py-3'>
                    <div className='font-mono text-fg-muted'>{o.displayId}</div>
                    <div className='font-mono text-[10px] text-fg-subtle'>{o.date}</div>
                  </td>
                  <td className='px-5 py-3'>
                    <div className='flex items-center gap-2'>
                      <div
                        className={`w-7 h-7 rounded-pill ${o.avatarClass} text-white font-display font-bold text-xs flex items-center justify-center shrink-0`}
                      >
                        {o.initial}
                      </div>
                      <span className='font-semibold whitespace-nowrap'>{o.name}</span>
                    </div>
                  </td>
                  <td className='px-4 py-3 text-fg-muted max-w-[160px]'>
                    <div className='truncate'>{o.product}</div>
                  </td>
                  <td className='px-5 py-3 text-right font-mono font-semibold whitespace-nowrap'>
                    NT$ {o.amount.toLocaleString()}
                  </td>
                  <td className='px-5 py-3'>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className='px-3'>
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      className='text-fg-subtle'
                    >
                      <path d='M9 6l6 6-6 6' />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className='px-5 py-3 border-t border-line bg-ink-50 flex items-center justify-between'>
        <span className='text-xs text-fg-muted'>
          顯示 {filtered.length} / {orders.length} 筆
        </span>
        <Link href='/admin/orders' className='text-xs font-semibold text-primary hover:underline'>
          查看全部訂單 →
        </Link>
      </div>
    </div>
  )
}

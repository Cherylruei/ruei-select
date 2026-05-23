'use client'

import type { CustomerOrderDisplayStatus } from '@/types'

export type OrderFilterValue = CustomerOrderDisplayStatus | 'all'

interface OrderStatusFilterProps {
  value: OrderFilterValue
  onChange: (v: OrderFilterValue) => void
}

const OPTIONS: { value: OrderFilterValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '已訂購', label: '已訂購' },
  { value: '已到貨', label: '已到貨' },
  { value: '已出貨', label: '已出貨' },
  { value: '已完成', label: '已完成' },
  { value: '已取消', label: '已取消' },
]

export default function OrderStatusFilter({ value, onChange }: OrderStatusFilterProps) {
  return (
    <div className='relative'>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OrderFilterValue)}
        className='appearance-none pl-3 pr-8 py-2 text-[13px] font-medium bg-white border border-[var(--neutral-200)] rounded-lg text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)] cursor-pointer'
        aria-label='篩選訂單狀態'
        data-testid='order-status-filter'
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* 下拉箭頭 */}
      <span className='pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2'>
        <svg
          viewBox='0 0 24 24'
          width='14'
          height='14'
          fill='none'
          stroke='var(--neutral-400)'
          strokeWidth='2'
          aria-hidden='true'
        >
          <path d='M6 9l6 6 6-6' />
        </svg>
      </span>
    </div>
  )
}

'use client'

export type OrderFilterValue = 'all' | 'pending' | 'allocated' | 'settled' | 'shipped' | 'completed'

interface OrderStatusFilterProps {
  value: OrderFilterValue
  onChange: (v: OrderFilterValue) => void
  counts: Record<OrderFilterValue, number>
}

const TAB_LIST: { value: OrderFilterValue; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '已下單' },
  { value: 'allocated', label: '已到貨' },
  { value: 'settled', label: '已結單' },
  { value: 'shipped', label: '已出貨' },
  { value: 'completed', label: '已完成' },
]

export default function OrderStatusFilter({ value, onChange, counts }: OrderStatusFilterProps) {
  return (
    <div
      className='flex gap-1.5 overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0 lg:overflow-visible lg:flex-wrap'
      style={{ scrollbarWidth: 'none' } as React.CSSProperties}
      role='tablist'
      aria-label='篩選訂單狀態'
    >
      {TAB_LIST.map((tab) => {
        const count = counts[tab.value] ?? 0
        const active = value === tab.value
        return (
          <button
            key={tab.value}
            role='tab'
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={[
              'shrink-0 inline-flex items-center h-8 px-3.5 rounded-pill',
              'font-display font-bold text-xs whitespace-nowrap transition-colors',
              active ? 'bg-primary text-white shadow-pink' : 'bg-surface text-fg-muted',
            ].join(' ')}
            style={active ? undefined : { border: '1px solid #f0d9cb' }}
            data-testid={`order-filter-${tab.value}`}
          >
            {tab.label} · {count}
          </button>
        )
      })}
    </div>
  )
}

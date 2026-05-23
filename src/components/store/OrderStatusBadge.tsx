import type { CustomerOrderDisplayStatus } from '@/types'

interface OrderStatusBadgeProps {
  displayStatus: CustomerOrderDisplayStatus
}

const STATUS_STYLES: Record<
  CustomerOrderDisplayStatus,
  { bg: string; text: string; border: string }
> = {
  已訂購: {
    bg: 'rgba(72,120,184,.1)',
    text: 'var(--color-info)',
    border: 'rgba(72,120,184,.3)',
  },
  已到貨: {
    bg: 'rgba(58,136,56,.1)',
    text: 'var(--color-success)',
    border: 'rgba(58,136,56,.3)',
  },
  已出貨: {
    bg: 'rgba(42,100,40,.12)',
    text: 'var(--color-success-dark)',
    border: 'rgba(42,100,40,.35)',
  },
  已完成: {
    bg: 'rgba(140,152,128,.1)',
    text: 'var(--color-neutral)',
    border: 'rgba(140,152,128,.3)',
  },
  已取消: {
    bg: 'rgba(232,58,106,.1)',
    text: 'var(--color-danger)',
    border: 'rgba(232,58,106,.3)',
  },
}

export default function OrderStatusBadge({ displayStatus }: OrderStatusBadgeProps) {
  const style = STATUS_STYLES[displayStatus]

  return (
    <span
      className='inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border'
      style={{
        backgroundColor: style.bg,
        color: style.text,
        borderColor: style.border,
      }}
      data-testid={`status-badge-${displayStatus}`}
    >
      {displayStatus}
    </span>
  )
}

/*
 * Tailwind JIT safelist — TONE_CLASSES 動態組合，明確列出確保 CSS output 含有：
 * bg-sakura-100 text-sakura-700
 * bg-forest-100 text-forest-700
 * bg-earth-100 text-earth-700
 * bg-info-bg text-info
 * bg-warning-bg text-warning
 * bg-danger-bg text-danger
 * bg-success-bg text-success
 * bg-primary text-white
 * bg-sunken text-fg-muted
 * bg-danger
 */

type BadgeTone =
  | 'pink'
  | 'green'
  | 'earth'
  | 'info'
  | 'warning'
  | 'danger'
  | 'success'
  | 'solid'
  | 'neutral'

interface BadgeProps {
  tone?: BadgeTone
  dot?: boolean
  children: React.ReactNode
  className?: string
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  pink: 'bg-sakura-100 text-sakura-700',
  green: 'bg-forest-100 text-forest-700',
  earth: 'bg-earth-100 text-earth-700',
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  success: 'bg-success-bg text-success',
  solid: 'bg-primary text-white',
  neutral: 'bg-sunken text-fg-muted',
}

export function Badge({ tone = 'neutral', dot = false, children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 h-6 px-2.5 rounded-pill',
        'font-display font-semibold text-xs',
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && <span className='w-1.5 h-1.5 rounded-pill bg-current' />}
      {children}
    </span>
  )
}

/* ── 訂單狀態 badge（商家後台 + 顧客前台共用）────────────── */

/** 商家後台七種狀態（含已取消） */
type AdminOrderStatus =
  | 'pending_purchase'
  | 'ordered'
  | 'allocated'
  | 'settled'
  | 'shipped'
  | 'completed'
  | 'cancelled'

/** 顧客前台顯示狀態（已到貨 = allocated） */
type CustomerOrderDisplayStatus = '已訂購' | '已到貨' | '已出貨' | '已完成' | '已取消'

type OrderStatusValue = AdminOrderStatus | CustomerOrderDisplayStatus

/** dotClass 可覆寫 dot 顏色（不傳時用 bg-current 繼承文字色）*/
const STATUS_MAP: Record<OrderStatusValue, { tone: BadgeTone; label?: string; dotClass?: string }> =
  {
    // Admin keys
    pending_purchase: { tone: 'warning', label: '待採買' },
    ordered: { tone: 'info', label: '已訂購' },
    allocated: { tone: 'success', label: '已配單' },
    settled: { tone: 'pink', label: '已結單' },
    shipped: { tone: 'earth', label: '已出貨' },
    completed: { tone: 'neutral', label: '已完成' },
    // cancelled：neutral 底色 + danger 紅點，視覺上「靜止但警示」
    cancelled: { tone: 'neutral', label: '已取消', dotClass: 'bg-danger' },
    // Customer display keys (label = key itself)
    已訂購: { tone: 'info' },
    已到貨: { tone: 'success' },
    已出貨: { tone: 'earth' },
    已完成: { tone: 'neutral' },
    已取消: { tone: 'neutral', dotClass: 'bg-danger' },
  }

interface OrderStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: OrderStatusValue
}

export function OrderStatusBadge({ status, className = '', ...rest }: OrderStatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { tone: 'neutral' as BadgeTone }
  const label = config.label ?? String(status)

  return (
    <span
      className={[
        'inline-flex items-center gap-1 h-6 px-2.5 rounded-pill',
        'font-display font-semibold text-xs',
        TONE_CLASSES[config.tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      <span className={['w-1.5 h-1.5 rounded-pill', config.dotClass ?? 'bg-current'].join(' ')} />
      {label}
    </span>
  )
}

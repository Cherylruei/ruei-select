import type { CustomerOrderDisplayStatus } from '@/types'
import { OrderStatusBadge as UiOrderStatusBadge } from '@/components/ui/Badge'

interface OrderStatusBadgeProps {
  displayStatus: CustomerOrderDisplayStatus
}

export default function OrderStatusBadge({ displayStatus }: OrderStatusBadgeProps) {
  return <UiOrderStatusBadge status={displayStatus} data-testid={`status-badge-${displayStatus}`} />
}

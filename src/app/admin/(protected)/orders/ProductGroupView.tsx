'use client'

import { useState, useTransition } from 'react'
import type { AdminOrder, OrderStatus } from '@/types'

// ── 型別 ───────────────────────────────────────────────────────────────────────

interface ProductGroup {
  productName: string
  supplierName: string | null
  totalQty: number
  orders: {
    orderId: string
    memberId: string
    memberName: string
    variantSpecs: Record<string, string> | null
    quantity: number
    orderedAt: string
    unitPrice: number
  }[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface ProductGroupViewProps {
  orders: AdminOrder[]
  targetStatus: OrderStatus // 'ordered' or 'allocated'
  onRefresh: () => void
  toastFn: (msg: string, type: 'success' | 'error') => void
}

// ── 資料轉換 ───────────────────────────────────────────────────────────────────

function buildProductGroups(orders: AdminOrder[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>()
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.product_name
      const existing = map.get(key)
      const entry = {
        orderId: order.id,
        memberId: order.member_id,
        memberName: order.member_name,
        variantSpecs: item.variant_specs,
        quantity: item.quantity,
        orderedAt: order.ordered_at,
        unitPrice: item.unit_price,
      }
      if (existing) {
        existing.totalQty += item.quantity
        existing.orders.push(entry)
      } else {
        map.set(key, {
          productName: item.product_name,
          supplierName: item.supplier_name,
          totalQty: item.quantity,
          orders: [entry],
        })
      }
    }
  }
  const groups = Array.from(map.values())
  for (const group of groups) {
    group.orders.sort((a, b) => new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime())
  }
  return groups
}

// ── 主元件 ─────────────────────────────────────────────────────────────────────

export default function ProductGroupView({
  orders,
  targetStatus,
  onRefresh,
  toastFn,
}: ProductGroupViewProps) {
  const groups = buildProductGroups(orders)
  const actionLabel = targetStatus === 'ordered' ? '標記已訂購' : '標記已配單'

  if (groups.length === 0) {
    return <div className='py-10 text-center text-sm text-fg-muted'>沒有訂單</div>
  }

  return (
    <div className='p-5 space-y-4'>
      {groups.map((group) => (
        <ProductGroupCard
          key={group.productName}
          group={group}
          actionLabel={actionLabel}
          targetStatus={targetStatus}
          onRefresh={onRefresh}
          toastFn={toastFn}
        />
      ))}
    </div>
  )
}

// ── 商品群組卡片 ──────────────────────────────────────────────────────────────

interface ProductGroupCardProps {
  group: ProductGroup
  actionLabel: string
  targetStatus: OrderStatus
  onRefresh: () => void
  toastFn: (msg: string, type: 'success' | 'error') => void
}

function ProductGroupCard({
  group,
  actionLabel,
  targetStatus,
  onRefresh,
  toastFn,
}: ProductGroupCardProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(group.orders.map((o) => o.orderId))
  )
  const [isPending, startTransition] = useTransition()

  const allSelected = selected.size === group.orders.length
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(group.orders.map((o) => o.orderId)))
    }
  }

  function toggleOne(orderId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  function handleBatchUpdate() {
    if (selected.size === 0) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/orders/batch', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: Array.from(selected), status: targetStatus }),
        })
        const json = (await res.json()) as { success?: boolean; error?: string; updated?: number }
        if (json.success) {
          toastFn(`已更新 ${json.updated} 筆訂單為${actionLabel.replace('標記', '')}`, 'success')
          onRefresh()
        } else {
          throw new Error(json.error ?? '批次更新失敗')
        }
      } catch (err) {
        toastFn(err instanceof Error ? err.message : '批次更新失敗', 'error')
      }
    })
  }

  return (
    <div className='bg-surface border border-line rounded-xl overflow-hidden'>
      {/* 群組標頭 */}
      <div className='flex items-center gap-3 px-4 py-3 bg-ink-50 border-b border-line'>
        <input
          type='checkbox'
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allSelected
          }}
          onChange={toggleAll}
          className='w-4 h-4 rounded accent-primary cursor-pointer'
        />
        <div className='flex-1 min-w-0'>
          <div className='font-display font-bold text-sm text-fg truncate'>{group.productName}</div>
          {group.supplierName && (
            <span className='inline-flex items-center h-5 px-2 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[10px] mt-0.5'>
              {group.supplierName}
            </span>
          )}
        </div>
        <div className='text-right shrink-0'>
          <div className='font-mono font-bold text-sm text-fg'>× {group.totalQty}</div>
          <div className='font-mono text-[10px] text-fg-subtle'>{group.orders.length} 筆</div>
        </div>
      </div>

      {/* 顧客列表 */}
      <div className='divide-y divide-line'>
        {group.orders.map((entry) => (
          <div
            key={`${entry.orderId}-${entry.memberId}`}
            className='flex items-center gap-3 px-4 py-2.5'
          >
            <input
              type='checkbox'
              checked={selected.has(entry.orderId)}
              onChange={() => toggleOne(entry.orderId)}
              className='w-4 h-4 rounded accent-primary cursor-pointer'
            />
            <div className='flex-1 min-w-0'>
              <div className='flex items-center justify-between gap-2'>
                <div className='text-sm font-semibold text-fg'>{entry.memberName}</div>
                <div className='font-mono text-[10px] text-fg-subtle shrink-0'>
                  {formatDate(entry.orderedAt)}
                </div>
              </div>
              {entry.variantSpecs && (
                <div className='flex flex-wrap gap-1.5 mt-1'>
                  {Object.entries(entry.variantSpecs).map(([key, val]) => (
                    <span
                      key={key}
                      className='inline-flex items-center gap-1 h-6 px-2.5 rounded-pill bg-info-bg border border-info/20 whitespace-nowrap'
                    >
                      <span className='font-display font-medium text-[10px] text-info/60'>
                        {key}
                      </span>
                      <span className='font-display font-bold text-[11px] text-info'>{val}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className='text-right shrink-0'>
              <div className='font-mono text-sm font-bold text-fg'>× {entry.quantity}</div>
              <div className='font-mono text-[10px] text-fg-muted'>
                NT$ {(entry.unitPrice * entry.quantity).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 批次操作 */}
      {someSelected && (
        <div className='px-4 py-3 border-t border-line bg-primary-bg flex items-center justify-between'>
          <span className='text-xs text-primary-hv font-display font-semibold'>
            已選 {selected.size} 筆
          </span>
          <button
            type='button'
            disabled={isPending}
            onClick={handleBatchUpdate}
            className='h-8 px-4 rounded-pill bg-primary text-white font-display font-semibold text-xs shadow-pink hover:bg-primary-hv transition disabled:opacity-50'
          >
            {isPending ? '處理中…' : actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}

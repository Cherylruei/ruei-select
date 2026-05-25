'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import type { AdminOrder, OrderStatus, OrderStatusCounts } from '@/types'

// ── 狀態 Tab 定義 ──────────────────────────────────────────────────────────────

type TabKey = 'all' | OrderStatus

interface TabDef {
  key: TabKey
  label: string
}

const STATUS_TABS: TabDef[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_purchase', label: '待採買' },
  { key: 'ordered', label: '已訂購' },
  { key: 'allocated', label: '已配單' },
  { key: 'settled', label: '已結單' },
  { key: 'shipped', label: '已出貨' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

// ── 狀態 Badge 設定 ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  pending_purchase: {
    label: '待採買',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  ordered: {
    label: '已訂購',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  allocated: {
    label: '已配單',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  settled: {
    label: '已結單',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
  shipped: {
    label: '已出貨',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  completed: {
    label: '已完成',
    bg: 'bg-[var(--neutral-100)]',
    text: 'text-[var(--neutral-500)]',
    border: 'border-[var(--neutral-200)]',
  },
  cancelled: {
    label: '已取消',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
}

// ── 工具 ───────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function specLabel(specs: Record<string, string> | null): string {
  if (!specs) return ''
  return Object.values(specs).join(' / ')
}

function orderSubtotal(order: AdminOrder): number {
  return order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
}

// ── 主元件 ─────────────────────────────────────────────────────────────────────

export default function OrdersClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('status') as TabKey | null) ?? 'all'

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [counts, setCounts] = useState<OrderStatusCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [groupByCustomer, setGroupByCustomer] = useState(false)

  // 顯示 Toast 後 3 秒自動消失
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const fetchOrders = useCallback(async (tab: TabKey) => {
    setLoading(true)
    try {
      const url = tab === 'all' ? '/api/admin/orders' : `/api/admin/orders?status=${tab}`
      const res = await fetch(url)
      const json = (await res.json()) as {
        success: boolean
        data: AdminOrder[]
        counts: OrderStatusCounts
        error?: string
      }
      if (json.success) {
        setOrders(json.data)
        setCounts(json.counts)
      } else {
        setToast({ message: json.error ?? '載入失敗', type: 'error' })
      }
    } catch {
      setToast({ message: '載入訂單失敗，請重新整理', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders(activeTab)
    setGroupByCustomer(false)
  }, [activeTab, fetchOrders])

  const switchTab = useCallback(
    (tab: TabKey) => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'all') {
        params.delete('status')
      } else {
        params.set('status', tab)
      }
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleStatusUpdate = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (json.success) {
          setToast({ message: '訂單狀態已更新', type: 'success' })
          await fetchOrders(activeTab)
        } else {
          setToast({ message: json.error ?? '更新失敗', type: 'error' })
        }
      } catch {
        setToast({ message: '更新失敗，請重試', type: 'error' })
      }
    },
    [activeTab, fetchOrders]
  )

  const tabCount = (key: TabKey) => {
    if (!counts) return null
    return key === 'all' ? counts.all : counts[key as OrderStatus]
  }

  return (
    <div className='relative'>
      {/* Toast */}
      {toast && (
        <div
          className={[
            'fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg',
            toast.type === 'success'
              ? 'bg-[var(--forest-base)] text-white'
              : 'bg-[var(--color-error)] text-white',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}

      {/* 頁面 Header */}
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-xl font-bold text-[var(--neutral-800)] [font-family:var(--font-zen-maru-gothic)]'>
          訂單管理
        </h1>
        <Link
          href='/admin/orders/new'
          className='flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--forest-base)] text-white text-sm font-semibold hover:bg-[var(--forest-deep)] transition-colors no-underline'
        >
          <svg
            viewBox='0 0 24 24'
            width='16'
            height='16'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.2'
          >
            <path d='M12 5v14M5 12h14' />
          </svg>
          代客建立訂單
        </Link>
      </div>

      {/* 狀態 Tab 列 */}
      <div className='flex gap-1 overflow-x-auto pb-1 mb-6'>
        {STATUS_TABS.map(({ key, label }) => {
          const isActive = activeTab === key
          const count = tabCount(key)
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={[
                'shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-sm font-medium transition-all cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-[var(--forest-base)] text-white shadow-sm'
                  : 'bg-[var(--neutral-100)] text-[var(--neutral-500)] hover:text-[var(--neutral-700)] hover:bg-[var(--neutral-200)]',
              ].join(' ')}
              aria-selected={isActive}
              role='tab'
            >
              {label}
              {count !== null && (
                <span
                  className={[
                    'text-xs font-bold px-1.5 py-px rounded-full min-w-[20px] text-center',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--neutral-200)] text-[var(--neutral-500)]',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 已配單 Tab 的額外切換：依顧客分組 */}
      {activeTab === 'allocated' && !loading && orders.length > 0 && (
        <div className='flex items-center gap-3 mb-4'>
          <button
            onClick={() => setGroupByCustomer(false)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
              !groupByCustomer
                ? 'bg-[var(--neutral-800)] text-white'
                : 'bg-[var(--neutral-100)] text-[var(--neutral-500)]',
            ].join(' ')}
          >
            訂單列表
          </button>
          <button
            onClick={() => setGroupByCustomer(true)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
              groupByCustomer
                ? 'bg-[var(--neutral-800)] text-white'
                : 'bg-[var(--neutral-100)] text-[var(--neutral-500)]',
            ].join(' ')}
          >
            依顧客分組
          </button>
        </div>
      )}

      {/* 主內容 */}
      {loading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState />
      ) : activeTab === 'allocated' && groupByCustomer ? (
        <CustomerGroupView orders={orders} />
      ) : (
        <OrderList orders={orders} onStatusUpdate={handleStatusUpdate} />
      )}
    </div>
  )
}

// ── 訂單列表 ──────────────────────────────────────────────────────────────────

function OrderList({
  orders,
  onStatusUpdate,
}: {
  orders: AdminOrder[]
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => Promise<void>
}) {
  return (
    <div className='flex flex-col gap-3'>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} onStatusUpdate={onStatusUpdate} />
      ))}
    </div>
  )
}

function OrderCard({
  order,
  onStatusUpdate,
}: {
  order: AdminOrder
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const badge = STATUS_BADGE[order.status]
  const subtotal = orderSubtotal(order)

  const handleUpdate = (newStatus: OrderStatus) => {
    setLoadingAction(newStatus)
    startTransition(async () => {
      await onStatusUpdate(order.id, newStatus)
      setLoadingAction(null)
    })
  }

  return (
    <div className='bg-white rounded-xl border border-[var(--neutral-200)] shadow-sm hover:shadow-md transition-shadow p-4'>
      {/* 頂部：顧客名 + 時間 + 狀態 */}
      <div className='flex items-start justify-between gap-3 mb-3'>
        <div>
          <div className='flex items-center gap-2'>
            <span className='font-bold text-sm text-[var(--neutral-800)]'>{order.member_name}</span>
            {order.created_by === 'merchant' && (
              <span className='text-[10px] px-1.5 py-0.5 rounded bg-[var(--earth-100)] text-[var(--earth-base)] border border-[var(--earth-200)] font-medium'>
                代客建單
              </span>
            )}
          </div>
          <div className='text-xs text-[var(--neutral-400)] mt-0.5'>
            {formatDate(order.ordered_at)}
          </div>
        </div>
        <span
          className={[
            'shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border',
            badge.bg,
            badge.text,
            badge.border,
          ].join(' ')}
        >
          {badge.label}
        </span>
      </div>

      {/* 商品列表 */}
      <div className='flex flex-col gap-1.5 mb-3'>
        {order.items.map((item) => (
          <div key={item.id} className='flex items-center justify-between text-sm'>
            <span className='text-[var(--neutral-700)]'>
              {item.product_name}
              {item.variant_specs && (
                <span className='text-[var(--neutral-400)] ml-1'>
                  （{specLabel(item.variant_specs)}）
                </span>
              )}
            </span>
            <span className='text-[var(--neutral-500)] whitespace-nowrap ml-3'>
              ×{item.quantity}　NT${(item.unit_price * item.quantity).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* 分隔線 + 小計 */}
      <div className='flex items-center justify-between border-t border-[var(--neutral-100)] pt-2.5'>
        <div className='flex items-center gap-2'>
          {order.note && (
            <span className='text-xs text-[var(--neutral-400)] italic'>備註：{order.note}</span>
          )}
        </div>
        <div className='text-right'>
          <span className='text-sm font-semibold text-[var(--neutral-800)]'>
            NT${subtotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 動作按鈕 */}
      <ActionButtons
        status={order.status}
        isPending={isPending}
        loadingAction={loadingAction}
        onUpdate={handleUpdate}
      />
    </div>
  )
}

// ── 確認 Dialog ──────────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30'>
      <div className='bg-white rounded-2xl shadow-xl w-full max-w-sm p-6'>
        <p className='text-sm text-[var(--neutral-700)] text-center leading-relaxed mb-6'>
          {message}
        </p>
        <div className='flex gap-3'>
          <button
            onClick={onCancel}
            className='flex-1 py-2.5 rounded-xl border border-[var(--neutral-200)] text-sm font-medium text-[var(--neutral-600)] hover:bg-[var(--neutral-50)] transition-colors cursor-pointer'
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className='flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer'
          >
            確認
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionButtons({
  status,
  isPending,
  loadingAction,
  onUpdate,
}: {
  status: OrderStatus
  isPending: boolean
  loadingAction: string | null
  onUpdate: (newStatus: OrderStatus) => void
}) {
  const [showConfirmOrdered, setShowConfirmOrdered] = useState(false)

  if (status === 'pending_purchase') {
    return (
      <>
        {/* AC-18.7：點擊後顯示確認 dialog，確認後才更新狀態 */}
        {showConfirmOrdered && (
          <ConfirmDialog
            message='確認已向廠商下單此商品？'
            onConfirm={() => {
              setShowConfirmOrdered(false)
              onUpdate('ordered')
            }}
            onCancel={() => setShowConfirmOrdered(false)}
          />
        )}
        <div className='mt-3 pt-3 border-t border-[var(--neutral-100)]'>
          <button
            onClick={() => setShowConfirmOrdered(true)}
            disabled={isPending}
            className='w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer'
          >
            {loadingAction === 'ordered' ? <Spinner /> : null}
            標記已訂購
          </button>
        </div>
      </>
    )
  }

  if (status === 'ordered') {
    return (
      <div className='mt-3 pt-3 border-t border-[var(--neutral-100)]'>
        <button
          onClick={() => onUpdate('allocated')}
          disabled={isPending}
          className='w-full py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer'
        >
          {loadingAction === 'allocated' ? <Spinner /> : null}
          標記已到貨
        </button>
      </div>
    )
  }

  return null
}

// ── 依顧客分組視圖 ────────────────────────────────────────────────────────────

interface CustomerGroup {
  memberId: string
  memberName: string
  memberLineId: string
  orders: AdminOrder[]
}

function CustomerGroupView({ orders }: { orders: AdminOrder[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // 依顧客分組
  const groups: CustomerGroup[] = []
  const groupMap = new Map<string, CustomerGroup>()

  for (const order of orders) {
    const existing = groupMap.get(order.member_id)
    if (existing) {
      existing.orders.push(order)
    } else {
      const group: CustomerGroup = {
        memberId: order.member_id,
        memberName: order.member_name,
        memberLineId: order.member_line_id,
        orders: [order],
      }
      groups.push(group)
      groupMap.set(order.member_id, group)
    }
  }

  const toggleExpand = (memberId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  return (
    <div className='flex flex-col gap-3'>
      {groups.map((group) => {
        const isExpanded = expandedIds.has(group.memberId)
        const totalItems = group.orders.reduce((sum, o) => sum + o.items.length, 0)

        return (
          <div
            key={group.memberId}
            className='bg-white rounded-xl border border-[var(--neutral-200)] shadow-sm overflow-hidden'
          >
            {/* 顧客 Header */}
            <button
              onClick={() => toggleExpand(group.memberId)}
              className='w-full flex items-center justify-between p-4 hover:bg-[var(--neutral-50)] transition-colors cursor-pointer text-left'
            >
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-full bg-gradient-to-br from-[var(--forest-200)] to-[var(--forest-400)] flex items-center justify-center text-white font-bold text-sm shrink-0'>
                  {group.memberName.charAt(0)}
                </div>
                <div>
                  <div className='font-bold text-sm text-[var(--neutral-800)]'>
                    {group.memberName}
                  </div>
                  <div className='text-xs text-[var(--neutral-400)] mt-0.5'>
                    LINE: {group.memberLineId}
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <span className='text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold'>
                  {group.orders.length} 筆訂單・{totalItems} 件商品
                </span>
                <svg
                  viewBox='0 0 24 24'
                  width='16'
                  height='16'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  className={`transition-transform duration-200 text-[var(--neutral-400)] shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d='M6 9l6 6 6-6' />
                </svg>
              </div>
            </button>

            {/* 商品清單（已到貨訂單） */}
            {!isExpanded && (
              <div className='px-4 pb-4 border-t border-[var(--neutral-100)]'>
                <div className='pt-3 flex flex-col gap-1.5'>
                  {group.orders.flatMap((order) =>
                    order.items.map((item) => (
                      <div key={item.id} className='flex items-center justify-between text-sm'>
                        <span className='text-[var(--neutral-700)]'>
                          {item.product_name}
                          {item.variant_specs && (
                            <span className='text-[var(--neutral-400)] ml-1'>
                              （{specLabel(item.variant_specs)}）
                            </span>
                          )}
                        </span>
                        <span className='text-[var(--neutral-500)] whitespace-nowrap ml-3'>
                          ×{item.quantity}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 展開：全部訂單（含所有狀態） */}
            {isExpanded && (
              <AllOrdersForMember memberId={group.memberId} memberName={group.memberName} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AllOrdersForMember({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/orders')
        const json = (await res.json()) as { success: boolean; data: AdminOrder[] }
        if (json.success) {
          setAllOrders(json.data.filter((o) => o.member_id === memberId))
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [memberId])

  if (loading) {
    return (
      <div className='px-4 pb-4 border-t border-[var(--neutral-100)] pt-3'>
        <div className='text-xs text-[var(--neutral-400)]'>載入中…</div>
      </div>
    )
  }

  return (
    <div className='border-t border-[var(--neutral-100)]'>
      <div className='px-4 py-3 text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide bg-[var(--neutral-50)]'>
        {memberName} 的全部訂單
      </div>
      <div className='divide-y divide-[var(--neutral-100)]'>
        {allOrders.map((order) => {
          const badge = STATUS_BADGE[order.status]
          return (
            <div key={order.id} className='px-4 py-3'>
              <div className='flex items-center justify-between mb-1.5'>
                <span className='text-xs text-[var(--neutral-400)]'>
                  {formatDate(order.ordered_at)}
                </span>
                <span
                  className={[
                    'text-xs font-semibold px-2 py-0.5 rounded-full border',
                    badge.bg,
                    badge.text,
                    badge.border,
                  ].join(' ')}
                >
                  {badge.label}
                </span>
              </div>
              {order.items.map((item) => (
                <div key={item.id} className='flex items-center justify-between text-sm'>
                  <span className='text-[var(--neutral-700)]'>
                    {item.product_name}
                    {item.variant_specs && (
                      <span className='text-[var(--neutral-400)] ml-1'>
                        （{specLabel(item.variant_specs)}）
                      </span>
                    )}
                  </span>
                  <span className='text-[var(--neutral-500)] whitespace-nowrap ml-3'>
                    ×{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 空狀態 ────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className='bg-white border border-[var(--neutral-200)] rounded-xl px-6 py-14 flex flex-col items-center text-center'>
      <div className='w-16 h-16 rounded-full bg-[var(--neutral-100)] flex items-center justify-center mb-4 text-[var(--neutral-400)]'>
        <svg
          viewBox='0 0 24 24'
          width='28'
          height='28'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
        >
          <path d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2' />
          <rect x='9' y='3' width='6' height='4' rx='1' />
          <path d='M9 12h6M9 16h4' />
        </svg>
      </div>
      <p className='text-sm font-medium text-[var(--neutral-700)] mb-1'>尚未有顧客下單</p>
      <p className='text-xs text-[var(--neutral-400)]'>顧客下單後訂單將顯示在這裡</p>
    </div>
  )
}

// ── 載入骨架 ──────────────────────────────────────────────────────────────────

function OrdersSkeleton() {
  return (
    <div className='flex flex-col gap-3'>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className='bg-white rounded-xl border border-[var(--neutral-200)] p-4 animate-pulse'
        >
          <div className='flex items-start justify-between mb-3'>
            <div className='space-y-1.5'>
              <div className='h-4 w-20 bg-[var(--neutral-200)] rounded' />
              <div className='h-3 w-32 bg-[var(--neutral-100)] rounded' />
            </div>
            <div className='h-6 w-14 bg-[var(--neutral-200)] rounded-full' />
          </div>
          <div className='space-y-2'>
            <div className='h-4 bg-[var(--neutral-100)] rounded w-3/4' />
            <div className='h-4 bg-[var(--neutral-100)] rounded w-1/2' />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 小元件 ────────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className='animate-spin'
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    >
      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
    </svg>
  )
}

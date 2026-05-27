'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import type { AdminOrder, OrderStatus, OrderStatusCounts } from '@/types'
import { Button } from '@/components/ui/Button'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'

// ── 狀態 Tab 定義 ──────────────────────────────────────────────────────────────

type TabKey = 'all' | OrderStatus

const STATUS_TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_purchase', label: '待採買' },
  { key: 'ordered', label: '已訂購' },
  { key: 'allocated', label: '已配單' },
  { key: 'settled', label: '已結單' },
  { key: 'shipped', label: '已出貨' },
  { key: 'completed', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
]

// ── 工具函式 ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', {
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

function shortId(fullId: string): string {
  return 'RS-' + fullId.slice(-6).toUpperCase()
}

function orderSubtotal(order: AdminOrder): number {
  return order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
}

function calcMonthRevenue(orders: AdminOrder[]): number {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  return orders
    .filter((o) => {
      const d = new Date(o.ordered_at)
      return d.getFullYear() === y && d.getMonth() === m
    })
    .reduce((sum, o) => sum + orderSubtotal(o), 0)
}

// ── Icon helpers ───────────────────────────────────────────────────────────────

function IconClipboard() {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2' />
      <rect x='9' y='3' width='6' height='4' rx='1' />
      <path d='M9 12h6M9 16h4' />
    </svg>
  )
}

function IconClock() {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
    >
      <circle cx='12' cy='12' r='9' />
      <path d='M12 7v5l3 3' />
    </svg>
  )
}

function IconCheckCircle() {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
    >
      <circle cx='12' cy='12' r='9' />
      <path d='M8 12l3 3 5-5' />
    </svg>
  )
}

function IconDollar() {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
    >
      <path d='M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' />
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    >
      <path d='M9 6l6 6-6 6' />
    </svg>
  )
}

// ── 主元件 ─────────────────────────────────────────────────────────────────────

export default function OrdersClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('status') as TabKey | null) ?? 'all'

  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [allOrders, setAllOrders] = useState<AdminOrder[]>([])
  const [counts, setCounts] = useState<OrderStatusCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [groupByCustomer, setGroupByCustomer] = useState(false)
  const { toasts, toast, dismiss } = useToast()

  // 拉篩選後的訂單列表
  const fetchOrders = useCallback(
    async (tab: TabKey) => {
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
          if (tab === 'all') setAllOrders(json.data)
        } else {
          toast(json.error ?? '載入失敗', 'error')
        }
      } catch {
        toast('載入訂單失敗，請重新整理', 'error')
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  // 初次載入：拉全部訂單供 StatCard 本月營收計算
  useEffect(() => {
    if (activeTab !== 'all') {
      fetch('/api/admin/orders')
        .then((r) => r.json())
        .then((json: { success: boolean; data: AdminOrder[] }) => {
          if (json.success) setAllOrders(json.data)
        })
        .catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // tab 切換時重新拉訂單（fetchOrders 是 async，setState 發生在 await 之後，非同步安全）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders(activeTab)
  }, [activeTab, fetchOrders])

  const switchTab = useCallback(
    (tab: TabKey) => {
      setGroupByCustomer(false) // 切 tab 時同步重置分組狀態（不放 effect 避免 cascading render）
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'all') params.delete('status')
      else params.set('status', tab)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleStatusUpdate = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (json.success) {
        toast('訂單狀態已更新', 'success')
        await fetchOrders(activeTab)
      } else {
        throw new Error(json.error ?? '更新失敗')
      }
    },
    [activeTab, fetchOrders, toast]
  )

  // ── Stats 計算 ──────────────────────────────────────────────────────────────
  const statsBase = allOrders.length > 0 ? allOrders : orders
  const monthRevenue = calcMonthRevenue(statsBase)
  const currentMonth = new Date().toLocaleDateString('zh-TW', { month: 'long' })

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── 頁面 Header ── */}
      <div className='flex items-center justify-between mb-6'>
        <h1 className='font-display font-bold text-2xl text-fg'>訂單管理</h1>
        <Link
          href='/admin/orders/new'
          className='inline-flex items-center gap-2 h-9 px-4 rounded-pill bg-secondary text-white font-display font-semibold text-sm shadow-green hover:bg-secondary-hv active:scale-[.97] transition no-underline'
        >
          <svg
            viewBox='0 0 24 24'
            width='15'
            height='15'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            strokeLinecap='round'
          >
            <path d='M12 5v14M5 12h14' />
          </svg>
          代客建立訂單
        </Link>
      </div>

      {/* ── StatCards ── */}
      {counts && (
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <StatCard
            icon={<IconClipboard />}
            label='訂單總數'
            value={counts.all}
            unit='筆'
            tone='accent'
          />
          <StatCard
            icon={<IconClock />}
            label='待處理'
            value={counts.pending_purchase}
            unit='筆'
            tone='earth'
          />
          <StatCard
            icon={<IconCheckCircle />}
            label='已配單'
            value={counts.allocated}
            unit='筆'
            tone='green'
          />
          <StatCard
            icon={<IconDollar />}
            label='本月營收'
            value={`NT$ ${monthRevenue.toLocaleString()}`}
            tone='pink'
            meta={currentMonth}
          />
        </div>
      )}

      {/* ── 狀態 Tab 列 ── */}
      <div className='flex gap-1 overflow-x-auto pb-1 mb-4' role='tablist'>
        {STATUS_TABS.map(({ key, label }) => {
          const isActive = activeTab === key
          const count = counts ? (key === 'all' ? counts.all : counts[key as OrderStatus]) : null
          return (
            <button
              key={key}
              role='tab'
              aria-selected={isActive}
              onClick={() => switchTab(key)}
              className={[
                'shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-display font-medium transition cursor-pointer whitespace-nowrap',
                isActive
                  ? 'bg-secondary text-white shadow-green'
                  : 'bg-sunken text-fg-muted hover:text-fg hover:bg-ink-100',
              ].join(' ')}
            >
              {label}
              {count !== null && (
                <span
                  className={[
                    'font-mono text-xs font-bold px-1.5 py-px rounded-pill min-w-[20px] text-center',
                    isActive ? 'bg-white/20 text-white' : 'bg-ink-200 text-fg-muted',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── 已配單 Tab：切換依顧客分組 ── */}
      {activeTab === 'allocated' && !loading && orders.length > 0 && (
        <div className='flex items-center gap-2 mb-4'>
          <button
            onClick={() => setGroupByCustomer(false)}
            className={[
              'px-3 py-1.5 rounded-md text-xs font-display font-semibold transition cursor-pointer',
              !groupByCustomer ? 'bg-ink-800 text-white' : 'bg-sunken text-fg-muted hover:text-fg',
            ].join(' ')}
          >
            訂單列表
          </button>
          <button
            onClick={() => setGroupByCustomer(true)}
            className={[
              'px-3 py-1.5 rounded-md text-xs font-display font-semibold transition cursor-pointer',
              groupByCustomer ? 'bg-ink-800 text-white' : 'bg-sunken text-fg-muted hover:text-fg',
            ].join(' ')}
          >
            依顧客分組
          </button>
        </div>
      )}

      {/* ── 主內容 ── */}
      {loading ? (
        <TableSkeleton />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<IconClipboard />}
          title='目前沒有訂單'
          description='顧客下單或代客建立訂單後將顯示在這裡'
          action={
            <Link
              href='/admin/orders/new'
              className='inline-flex items-center gap-2 h-9 px-4 rounded-pill bg-secondary text-white font-display font-semibold text-sm shadow-green hover:bg-secondary-hv transition no-underline'
            >
              代客建立訂單
            </Link>
          }
        />
      ) : activeTab === 'allocated' && groupByCustomer ? (
        <CustomerGroupGrid orders={orders} onStatusUpdate={handleStatusUpdate} />
      ) : (
        <OrdersTable orders={orders} />
      )}
    </div>
  )
}

// ── 訂單表格 ──────────────────────────────────────────────────────────────────

function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  return (
    <div className='overflow-x-auto'>
      <Table>
        <Thead>
          <Th className='w-[130px]'>訂單編號</Th>
          <Th>顧客</Th>
          <Th>商品 / 廠商</Th>
          <Th className='text-right'>金額</Th>
          <Th>狀態</Th>
          <Th className='w-10' />
        </Thead>
        <Tbody>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </Tbody>
      </Table>
    </div>
  )
}

function OrderRow({ order }: { order: AdminOrder }) {
  const subtotal = order.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  // 商品欄：顯示第一件，多件時補 "+ N 件"
  const firstItem = order.items[0]
  const extraCount = order.items.length - 1
  const itemLabel = firstItem
    ? firstItem.product_name +
      (firstItem.variant_specs ? `・${specLabel(firstItem.variant_specs)}` : '') +
      (extraCount > 0 ? ` +${extraCount} 件` : '')
    : '—'

  return (
    <Tr className='cursor-pointer'>
      {/* 訂單編號 */}
      <Td isId>{shortId(order.id)}</Td>

      {/* 顧客 */}
      <Td>
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 rounded-pill bg-forest-100 text-forest-700 font-display font-bold text-xs flex items-center justify-center shrink-0 select-none'>
            {order.member_name.charAt(0)}
          </div>
          <div className='leading-tight'>
            <div className='font-semibold text-sm text-fg'>{order.member_name}</div>
            {order.created_by === 'merchant' && (
              <span className='font-mono text-[10px] px-1.5 py-px rounded bg-earth-100 text-earth-700 border border-earth-200'>
                代客建單
              </span>
            )}
          </div>
        </div>
      </Td>

      {/* 商品 */}
      <Td>
        <span className='text-fg-muted text-sm'>{itemLabel}</span>
        <div className='flex items-center gap-2 mt-0.5'>
          {firstItem?.supplier_name && (
            <span className='font-mono text-[10px] px-1.5 py-px rounded bg-ink-100 text-fg-subtle border border-line'>
              {firstItem.supplier_name}
            </span>
          )}
          <span className='font-mono text-[10px] text-fg-subtle'>
            {formatDate(order.ordered_at)}
          </span>
        </div>
      </Td>

      {/* 金額 */}
      <Td numeric>NT$ {subtotal.toLocaleString()}</Td>

      {/* 狀態 */}
      <Td>
        <OrderStatusBadge status={order.status} />
      </Td>

      {/* 操作 → */}
      <Td>
        <Link
          href={`/admin/orders/${order.id}`}
          className='flex items-center justify-center w-8 h-8 rounded-pill hover:bg-sunken text-fg-muted hover:text-fg transition'
          aria-label={`查看訂單 ${shortId(order.id)}`}
        >
          <IconArrowRight />
        </Link>
      </Td>
    </Tr>
  )
}

// ── 依顧客分組視圖 ────────────────────────────────────────────────────────────

interface CustomerGroup {
  memberId: string
  memberName: string
  memberLineId: string
  orders: AdminOrder[]
}

function buildCustomerGroups(orders: AdminOrder[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>()
  for (const order of orders) {
    const existing = map.get(order.member_id)
    if (existing) {
      existing.orders.push(order)
    } else {
      map.set(order.member_id, {
        memberId: order.member_id,
        memberName: order.member_name,
        memberLineId: order.member_line_id,
        orders: [order],
      })
    }
  }
  return Array.from(map.values())
}

function CustomerGroupGrid({
  orders,
  onStatusUpdate,
}: {
  orders: AdminOrder[]
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => Promise<void>
}) {
  const groups = buildCustomerGroups(orders)
  return (
    <div className='grid sm:grid-cols-2 gap-4'>
      {groups.map((group) => (
        <CustomerCard key={group.memberId} group={group} onStatusUpdate={onStatusUpdate} />
      ))}
    </div>
  )
}

function CustomerCard({
  group,
  onStatusUpdate,
}: {
  group: CustomerGroup
  onStatusUpdate: (orderId: string, newStatus: OrderStatus) => Promise<void>
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const allItems = group.orders.flatMap((o) => o.items)
  const totalItems = allItems.length

  const handleSettle = () => {
    startTransition(async () => {
      try {
        // 對該顧客所有 allocated 訂單逐一結單
        for (const order of group.orders) {
          await onStatusUpdate(order.id, 'settled')
        }
        setShowConfirm(false)
      } catch {
        setShowConfirm(false)
      }
    })
  }

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          title='確認代客結單'
          message={`確定要為 ${group.memberName} 代客結單？共 ${totalItems} 件商品將標記為「已結單」。`}
          confirmLabel='確認結單'
          onConfirm={handleSettle}
          onCancel={() => setShowConfirm(false)}
          isLoading={isPending}
        />
      )}

      {/* 顧客卡片 — 對應 handoff 08 Customer Card 配方 */}
      <div className='bg-surface border border-line rounded-xl p-5'>
        {/* Header */}
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-11 h-11 rounded-pill bg-forest-100 text-forest-700 font-display font-bold flex items-center justify-center shrink-0 select-none'>
            {group.memberName.charAt(0)}
          </div>
          <div className='flex-1 min-w-0'>
            <div className='font-display font-bold text-fg truncate'>{group.memberName}</div>
            <div className='font-mono text-xs text-fg-subtle truncate'>
              LINE: {group.memberLineId}
            </div>
          </div>
          <span className='inline-flex items-center gap-1 h-6 px-2.5 rounded-pill bg-success-bg text-success font-display font-semibold text-xs shrink-0'>
            {totalItems} 件待出貨
          </span>
        </div>

        {/* 商品清單 */}
        <div className='border-t border-line pt-3 space-y-2 text-sm'>
          {allItems.map((item) => (
            <div key={item.id} className='flex justify-between'>
              <span className='text-fg-muted truncate mr-3'>
                {item.product_name}
                {item.variant_specs && `・${specLabel(item.variant_specs)}`}
                {item.quantity > 1 && ` × ${item.quantity}`}
              </span>
              <span className='font-mono text-fg shrink-0'>
                NT$ {(item.unit_price * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* 操作按鈕 */}
        <div className='flex gap-2 mt-4'>
          <Button
            variant='secondary'
            size='sm'
            className='flex-1'
            onClick={() => setShowConfirm(true)}
            disabled={isPending}
          >
            代客結單
          </Button>
          <Link
            href={`/admin/orders/${group.orders[0]?.id}`}
            className='inline-flex items-center justify-center h-8 px-3.5 rounded-pill bg-transparent text-fg font-display font-semibold text-sm hover:bg-sunken transition no-underline'
          >
            查看訂單
          </Link>
        </div>
      </div>
    </>
  )
}

// ── 載入骨架 ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className='bg-surface border border-line rounded-lg overflow-hidden animate-pulse'>
      {/* 骨架表頭 */}
      <div className='bg-ink-50 px-4 py-3 flex gap-6'>
        {[130, 120, 200, 80, 80].map((w, i) => (
          <div key={i} className='h-3 bg-ink-200 rounded' style={{ width: w }} />
        ))}
      </div>
      {/* 骨架列 */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className='border-t border-line px-4 py-4 flex gap-6 items-center'>
          <div className='h-4 w-[120px] bg-ink-100 rounded font-mono' />
          <div className='flex items-center gap-2'>
            <div className='w-7 h-7 rounded-pill bg-ink-100' />
            <div className='h-4 w-[100px] bg-ink-100 rounded' />
          </div>
          <div className='h-4 w-[180px] bg-ink-100 rounded' />
          <div className='h-4 w-[80px] bg-ink-100 rounded ml-auto' />
          <div className='h-6 w-[60px] bg-ink-100 rounded-pill' />
          <div className='h-6 w-6 bg-ink-100 rounded-pill' />
        </div>
      ))}
    </div>
  )
}

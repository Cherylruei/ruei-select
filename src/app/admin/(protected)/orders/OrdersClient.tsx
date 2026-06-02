'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import type {
  AdminOrder,
  OrderStatus,
  OrderStatusCounts,
  ShippingMethod,
  PaymentMethod,
} from '@/types'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import ProductGroupView from './ProductGroupView'

// ── 型別 ───────────────────────────────────────────────────────────────────────

type TabKey = 'all' | OrderStatus

// ── 常數 ───────────────────────────────────────────────────────────────────────

const STATUS_TABS: { key: TabKey; label: string; dot: boolean }[] = [
  { key: 'all', label: '全部', dot: false },
  { key: 'pending_purchase', label: '待採買', dot: true },
  { key: 'ordered', label: '已訂購', dot: true },
  { key: 'allocated', label: '已配單', dot: true },
  { key: 'settled', label: '已結單', dot: true },
  { key: 'shipped', label: '已出貨', dot: true },
  { key: 'completed', label: '已完成', dot: false },
  { key: 'cancelled', label: '已取消', dot: false },
]

const TAB_ACTIVE: Record<TabKey, string> = {
  all: 'bg-primary text-white',
  pending_purchase: 'bg-warning-bg text-warning',
  ordered: 'bg-info-bg text-info',
  allocated: 'bg-success-bg text-success',
  settled: 'bg-sakura-100 text-sakura-700',
  shipped: 'bg-earth-100 text-earth-700',
  completed: 'bg-sunken text-fg-muted',
  cancelled: 'bg-sunken text-fg-subtle',
}

const PIPELINE: { key: OrderStatus; label: string; dot: string; hint: string }[] = [
  { key: 'pending_purchase', label: '待採買', dot: 'bg-warning', hint: '等待商家訂貨' },
  { key: 'ordered', label: '已訂購', dot: 'bg-info', hint: '廠商備貨中' },
  { key: 'allocated', label: '已配單', dot: 'bg-success', hint: '等待顧客結單' },
  { key: 'settled', label: '已結單', dot: 'bg-sakura-400', hint: '準備出貨' },
  { key: 'shipped', label: '已出貨', dot: 'bg-earth-400', hint: '等待到貨確認' },
]

const PIPELINE_HOVER: Record<string, string> = {
  pending_purchase: 'hover:border-warning',
  ordered: 'hover:border-info',
  allocated: 'hover:border-success',
  settled: 'hover:border-sakura-300',
  shipped: 'hover:border-earth-300',
}

const SHIPPING_VENDORS = ['黑貓', '7-11', '全家', '賣貨便', '其他'] as const
type ShippingVendor = (typeof SHIPPING_VENDORS)[number]

const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  pickup: '自取',
  convenience: '超商店到店',
  maihuobian: '賣貨便',
  home_delivery: '宅配',
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: '現金自取',
  transfer: '匯款',
  cod: '賣貨便貨到付款',
}

const AVATAR_COLORS = [
  'bg-sakura-300',
  'bg-forest-400',
  'bg-earth-400',
  'bg-info',
  'bg-sakura-400',
  'bg-forest-300',
]
function avatarColor(name: string): string {
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

// ── 工具函式 ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function specLabel(specs: Record<string, string> | null): string {
  if (!specs) return ''
  return Object.values(specs).join(' / ')
}

function shortId(fullId: string): string {
  return 'RS-' + fullId.replace(/-/g, '').slice(0, 6).toUpperCase()
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
  const [search, setSearch] = useState('')

  // B-Light: 依商品分組（pending_purchase / ordered）
  const [groupByProduct, setGroupByProduct] = useState(false)
  // AC-18.12: 依顧客分組（allocated）
  const [groupByCustomer, setGroupByCustomer] = useState(false)

  // AC-B6~B9: 已結單批次出貨
  const [selectedSettledIds, setSelectedSettledIds] = useState<Set<string>>(new Set())

  const { toasts, toast, dismiss } = useToast()

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders(activeTab)
  }, [activeTab, fetchOrders])

  const switchTab = useCallback(
    (tab: TabKey) => {
      setGroupByProduct(false)
      setGroupByCustomer(false)
      setSelectedSettledIds(new Set())
      setSearch('')
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'all') params.delete('status')
      else params.set('status', tab)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const filteredOrders = search
    ? orders.filter((o) => {
        const q = search.toLowerCase()
        return (
          shortId(o.id).toLowerCase().includes(q) ||
          o.member_name.toLowerCase().includes(q) ||
          o.items.some((i) => i.product_name.toLowerCase().includes(q))
        )
      })
    : orders

  // B-Light toggle 適用的 Tab
  const showProductGroupToggle =
    !loading && orders.length > 0 && (activeTab === 'pending_purchase' || activeTab === 'ordered')

  // 顧客分組 toggle 適用的 Tab
  const showCustomerGroupToggle = !loading && orders.length > 0 && activeTab === 'allocated'

  // 批次勾選適用的 Tab
  const showBatchSelection = activeTab === 'settled'

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Pipeline 進度摘要 ─────────────────────────────────────────── */}
      {counts && (
        <section className='bg-surface border border-line rounded-xl p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h2 className='font-display font-bold text-base'>處理進度</h2>
              <p className='text-xs text-fg-muted mt-0.5'>各階段待處理訂單數量</p>
            </div>
            <span className='font-mono text-[10px] text-fg-subtle tracking-[0.15em] uppercase'>
              PIPELINE
            </span>
          </div>
          <div className='grid grid-cols-5 gap-3'>
            {PIPELINE.map(({ key, label, dot, hint }) => (
              <button
                key={key}
                type='button'
                onClick={() => switchTab(key)}
                className={`rounded-md border border-line p-3 text-left transition cursor-pointer ${PIPELINE_HOVER[key] ?? ''}`}
              >
                <div className='flex items-center gap-1.5'>
                  <span className={`w-2 h-2 rounded-pill ${dot}`} />
                  <span className='font-mono text-[10px] text-fg-muted uppercase tracking-wider'>
                    {label}
                  </span>
                </div>
                <div className='font-display font-bold text-2xl mt-1'>
                  {counts[key as OrderStatus] ?? 0}
                </div>
                <div className='text-[11px] text-fg-subtle mt-1'>{hint}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 訂單表格卡片 ──────────────────────────────────────────────── */}
      <section className='bg-surface border border-line rounded-xl overflow-hidden'>
        {/* Tabs + 搜尋 */}
        <div className='px-5 pt-4 pb-3 border-b border-line'>
          <div className='flex items-center gap-1.5 flex-wrap'>
            {STATUS_TABS.map(({ key, label, dot }) => {
              const isActive = activeTab === key
              const count = counts
                ? key === 'all'
                  ? counts.all
                  : counts[key as OrderStatus]
                : null
              return (
                <button
                  key={key}
                  type='button'
                  onClick={() => switchTab(key)}
                  className={[
                    'inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill font-display font-semibold text-xs transition whitespace-nowrap',
                    isActive ? TAB_ACTIVE[key] : 'bg-sunken text-fg-muted hover:bg-ink-200',
                  ].join(' ')}
                >
                  {dot && isActive && <span className='w-1.5 h-1.5 rounded-pill bg-current' />}
                  {label}
                  {count !== null && <span className='font-mono opacity-80'>{count}</span>}
                </button>
              )
            })}
            <div className='flex-1' />
            <div className='relative'>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='搜尋訂單號、顧客、商品…'
                className='w-64 h-8 pl-9 pr-3 rounded-pill border border-line bg-surface text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition placeholder:text-fg-subtle'
              />
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                className='absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none'
              >
                <circle cx='11' cy='11' r='6' />
                <path d='M20 20l-4-4' strokeLinecap='round' />
              </svg>
            </div>
          </div>
        </div>

        {/* B-Light toggle：待採買 / 已訂購 */}
        {showProductGroupToggle && (
          <div className='flex items-center gap-1.5 px-5 py-2.5 border-b border-line bg-ink-50'>
            <span className='text-xs text-fg-muted mr-1 font-display font-semibold'>視圖：</span>
            {[
              { val: false, label: '訂單列表' },
              { val: true, label: '依商品分組' },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                type='button'
                onClick={() => setGroupByProduct(val)}
                className={[
                  'h-7 px-3 rounded-pill font-display font-semibold text-xs transition',
                  groupByProduct === val
                    ? 'bg-info text-white'
                    : 'bg-surface border border-line text-fg-muted hover:bg-sunken',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 已配單：依顧客分組 toggle */}
        {showCustomerGroupToggle && (
          <div className='flex items-center gap-1.5 px-5 py-2.5 border-b border-line bg-ink-50'>
            <span className='text-xs text-fg-muted mr-1 font-display font-semibold'>視圖：</span>
            {[
              { val: false, label: '訂單列表' },
              { val: true, label: '依顧客分組' },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                type='button'
                onClick={() => setGroupByCustomer(val)}
                className={[
                  'h-7 px-3 rounded-pill font-display font-semibold text-xs transition',
                  groupByCustomer === val
                    ? 'bg-secondary text-white'
                    : 'bg-surface border border-line text-fg-muted hover:bg-sunken',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 主內容 */}
        {loading ? (
          <TableSkeleton />
        ) : filteredOrders.length === 0 ? (
          <EmptyOrders
            hasSearch={search.length > 0}
            onNewOrder={() => router.push('/admin/orders/new')}
          />
        ) : activeTab === 'pending_purchase' && groupByProduct ? (
          <ProductGroupView
            orders={filteredOrders}
            targetStatus='ordered'
            onRefresh={() => fetchOrders(activeTab)}
            toastFn={toast}
          />
        ) : activeTab === 'ordered' && groupByProduct ? (
          <ProductGroupView
            orders={filteredOrders}
            targetStatus='allocated'
            onRefresh={() => fetchOrders(activeTab)}
            toastFn={toast}
          />
        ) : activeTab === 'allocated' && groupByCustomer ? (
          <div className='p-5'>
            <CustomerGroupGrid orders={filteredOrders} toastFn={toast} />
          </div>
        ) : activeTab === 'settled' || activeTab === 'shipped' ? (
          <SettledOrdersList
            orders={filteredOrders}
            showBatchSelection={showBatchSelection}
            selectedIds={selectedSettledIds}
            onToggleSelect={(id) =>
              setSelectedSettledIds((prev) => {
                const next = new Set(prev)
                if (next.has(id)) next.delete(id)
                else next.add(id)
                return next
              })
            }
            onRefresh={() => fetchOrders(activeTab)}
            toastFn={toast}
          />
        ) : (
          <OrdersTable orders={filteredOrders} />
        )}
      </section>

      {/* AC-B7: 已結單批次出貨 BatchActionBar */}
      {showBatchSelection && selectedSettledIds.size > 0 && (
        <BatchActionBar
          selectedIds={selectedSettledIds}
          onClear={() => setSelectedSettledIds(new Set())}
          onSuccess={() => {
            setSelectedSettledIds(new Set())
            fetchOrders(activeTab)
          }}
          toastFn={toast}
        />
      )}
    </>
  )
}

// ── 訂單表格 ──────────────────────────────────────────────────────────────────

function OrdersTable({ orders }: { orders: AdminOrder[] }) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='bg-ink-50'>
            <th className='text-left pl-5 pr-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted'>
              訂單
            </th>
            <th className='text-left px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted'>
              顧客
            </th>
            <th className='text-left px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted'>
              商品
            </th>
            <th className='text-left px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted hidden md:table-cell'>
              供應商
            </th>
            <th className='text-right px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted'>
              金額
            </th>
            <th className='px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted'>
              狀態
            </th>
            <th className='text-center px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted hidden sm:table-cell'>
              來源
            </th>
            <th className='w-10' />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrderRow({ order }: { order: AdminOrder }) {
  const router = useRouter()
  const subtotal = orderSubtotal(order)
  const firstItem = order.items[0]
  const extraCount = order.items.length - 1
  const itemName = firstItem
    ? firstItem.product_name +
      (firstItem.variant_specs ? `・${specLabel(firstItem.variant_specs)}` : '')
    : '—'
  const supplierName = firstItem?.supplier_name ?? null
  const bgColor = avatarColor(order.member_name)

  return (
    <tr
      className='border-t border-line hover:bg-ink-50 transition cursor-pointer'
      onClick={() => router.push(`/admin/orders/${order.id}`)}
    >
      <td className='pl-5 pr-3 py-3'>
        <div className='font-mono font-semibold text-fg'>{shortId(order.id)}</div>
        <div className='font-mono text-[10px] text-fg-subtle'>{formatDate(order.ordered_at)}</div>
      </td>
      <td className='px-3 py-3'>
        <div className='flex items-center gap-2'>
          <div
            className={`w-7 h-7 rounded-pill ${bgColor} text-white font-display font-bold text-xs flex items-center justify-center shrink-0 select-none`}
          >
            {order.member_name.charAt(0)}
          </div>
          <div className='leading-tight'>
            <div className='font-semibold'>{order.member_name}</div>
            <div className='font-mono text-[10px] text-fg-subtle'>{order.member_line_id}</div>
          </div>
        </div>
      </td>
      <td className='px-3 py-3'>
        <div className='flex items-center gap-2'>
          <div
            className='w-8 h-8 rounded-md shrink-0 border border-line bg-ink-50'
            style={{
              background:
                'repeating-linear-gradient(135deg,var(--ink-100),var(--ink-100) 5px,var(--ink-50) 5px,var(--ink-50) 10px)',
            }}
          />
          <div className='leading-tight min-w-0'>
            <div className='font-semibold truncate max-w-[180px]'>{itemName}</div>
            {extraCount > 0 && (
              <div className='font-mono text-[10px] text-fg-subtle'>+{extraCount} 件</div>
            )}
          </div>
        </div>
      </td>
      <td className='px-3 py-3 hidden md:table-cell'>
        {supplierName ? (
          <span className='inline-flex items-center h-5 px-2 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[10px]'>
            {supplierName}
          </span>
        ) : (
          <span className='text-fg-subtle text-xs'>—</span>
        )}
      </td>
      <td className='px-3 py-3 text-right'>
        <span className='font-mono font-semibold'>NT$ {subtotal.toLocaleString()}</span>
      </td>
      <td className='px-3 py-3'>
        <OrderStatusBadge status={order.status} />
      </td>
      <td className='px-3 py-3 text-center hidden sm:table-cell'>
        {order.created_by === 'merchant' ? (
          <span
            className='inline-flex items-center justify-center w-6 h-6 rounded-pill bg-primary-bg text-primary-hv font-display font-bold text-[10px]'
            title='代客建單'
          >
            代
          </span>
        ) : (
          <span className='text-fg-subtle text-xs'>—</span>
        )}
      </td>
      <td className='pr-4 pl-1 py-3' onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/admin/orders/${order.id}`}
          className='w-8 h-8 rounded-pill hover:bg-sunken flex items-center justify-center text-fg-subtle'
          aria-label='查看訂單詳情'
        >
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
          >
            <path d='M9 6l6 6-6 6' />
          </svg>
        </Link>
      </td>
    </tr>
  )
}

// ── 依顧客分組視圖（已配單 Tab）───────────────────────────────────────────────

interface CustomerGroup {
  memberId: string
  memberName: string
  memberLineId: string
  allocatedOrders: AdminOrder[]
}

function buildCustomerGroups(orders: AdminOrder[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>()
  for (const order of orders) {
    const existing = map.get(order.member_id)
    if (existing) {
      existing.allocatedOrders.push(order)
    } else {
      map.set(order.member_id, {
        memberId: order.member_id,
        memberName: order.member_name,
        memberLineId: order.member_line_id,
        allocatedOrders: [order],
      })
    }
  }
  return Array.from(map.values())
}

interface CustomerGroupGridProps {
  orders: AdminOrder[]
  toastFn: (msg: string, type: 'success' | 'error') => void
}

function CustomerGroupGrid({ orders, toastFn }: CustomerGroupGridProps) {
  const groups = buildCustomerGroups(orders)
  return (
    <div className='grid sm:grid-cols-2 gap-4'>
      {groups.map((group) => (
        <CustomerCard key={group.memberId} group={group} toastFn={toastFn} />
      ))}
    </div>
  )
}

// ── CustomerCard：AC-18.12 可展開，顯示顧客全部訂單 ──────────────────────────

interface CustomerCardProps {
  group: CustomerGroup
  toastFn: (msg: string, type: 'success' | 'error') => void
}

function CustomerCard({ group, toastFn }: CustomerCardProps) {
  const router = useRouter()
  const bgColor = avatarColor(group.memberName)
  const totalItems = group.allocatedOrders.flatMap((o) => o.items).length
  const totalAmount = group.allocatedOrders.reduce((sum, o) => sum + orderSubtotal(o), 0)

  // AC-18.12a: 展開/收起
  const [expanded, setExpanded] = useState(false)
  const [allOrders, setAllOrders] = useState<AdminOrder[] | null>(null)
  const [loadingAll, setLoadingAll] = useState(false)
  // AC-18.12b: 勾選 allocated 訂單
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  async function handleExpand() {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (allOrders !== null) return // 已載入，不重複 fetch
    setLoadingAll(true)
    try {
      const res = await fetch(`/api/admin/orders?memberId=${group.memberId}`)
      const json = (await res.json()) as { success: boolean; data: AdminOrder[] }
      if (json.success) setAllOrders(json.data)
    } catch {
      toastFn('載入訂單失敗', 'error')
    } finally {
      setLoadingAll(false)
    }
  }

  return (
    <div className='bg-surface border border-line rounded-xl overflow-hidden hover:shadow-md hover:border-transparent transition'>
      {/* Card Header（點擊展開）*/}
      <button
        type='button'
        onClick={handleExpand}
        className='w-full flex items-center gap-3 p-5 text-left'
      >
        <div
          className={`w-11 h-11 rounded-pill ${bgColor} text-white font-display font-bold flex items-center justify-center shrink-0 select-none`}
        >
          {group.memberName.charAt(0)}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='font-display font-bold text-fg truncate'>{group.memberName}</div>
          <div className='font-mono text-xs text-fg-subtle truncate'>{group.memberLineId}</div>
        </div>
        <div className='text-right shrink-0'>
          <span className='inline-flex items-center gap-1 h-6 px-2.5 rounded-pill bg-success-bg text-success font-display font-semibold text-xs'>
            {totalItems} 件待出貨
          </span>
          <div className='font-mono text-xs text-fg-muted mt-1'>
            NT$ {totalAmount.toLocaleString()}
          </div>
        </div>
        <svg
          width='16'
          height='16'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          className={`shrink-0 text-fg-subtle transition-transform ml-1 ${expanded ? 'rotate-90' : ''}`}
        >
          <path d='M9 6l6 6-6 6' />
        </svg>
      </button>

      {/* 展開：顯示全部訂單（AC-18.12a~d）*/}
      {expanded && (
        <div className='border-t border-line'>
          {loadingAll ? (
            <div className='px-5 py-4 text-sm text-fg-muted'>載入中…</div>
          ) : allOrders && allOrders.length > 0 ? (
            <>
              <div className='divide-y divide-line'>
                {allOrders.map((order) => {
                  const isAllocated = order.status === 'allocated'
                  const isSelected = selectedOrderId === order.id
                  const firstItem = order.items[0]
                  const label = firstItem
                    ? firstItem.product_name +
                      (firstItem.variant_specs ? `・${specLabel(firstItem.variant_specs)}` : '')
                    : '—'

                  return (
                    <div
                      key={order.id}
                      className={[
                        'flex items-center gap-3 px-5 py-3',
                        isAllocated ? '' : 'opacity-40',
                      ].join(' ')}
                    >
                      {/* AC-18.12b/d: checkbox */}
                      <input
                        type='checkbox'
                        disabled={!isAllocated}
                        checked={isSelected}
                        onChange={() => setSelectedOrderId(isSelected ? null : order.id)}
                        className='w-4 h-4 rounded accent-primary cursor-pointer disabled:cursor-not-allowed'
                      />
                      <div className='flex-1 min-w-0'>
                        <div className='text-sm font-semibold text-fg truncate'>{label}</div>
                        <div className='font-mono text-[10px] text-fg-subtle'>
                          {shortId(order.id)} · {formatDate(order.ordered_at)}
                        </div>
                      </div>
                      <div className='text-right shrink-0'>
                        <div className='font-mono text-sm'>
                          NT$ {orderSubtotal(order).toLocaleString()}
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* AC-18.12c: 代客結單按鈕（選了一筆 allocated 才啟用）*/}
              <div className='px-5 py-3 border-t border-line flex items-center justify-between bg-ink-50'>
                <span className='text-xs text-fg-muted'>
                  {selectedOrderId ? '已選 1 筆已到貨訂單' : '勾選已到貨訂單以代客結單'}
                </span>
                <button
                  type='button'
                  disabled={!selectedOrderId}
                  onClick={() => {
                    if (selectedOrderId) router.push(`/admin/orders/${selectedOrderId}/checkout`)
                  }}
                  className='h-8 px-4 rounded-pill bg-secondary text-white font-display font-semibold text-xs hover:bg-secondary-hv transition disabled:opacity-40 disabled:cursor-not-allowed'
                >
                  代客結單
                </button>
              </div>
            </>
          ) : (
            <div className='px-5 py-4 text-sm text-fg-muted'>此顧客沒有訂單</div>
          )}
        </div>
      )}

      {/* 未展開時：快捷操作 */}
      {!expanded && (
        <div className='flex gap-2 px-5 pb-5 border-t border-line pt-3'>
          <button
            type='button'
            onClick={handleExpand}
            className='flex-1 h-9 rounded-pill bg-secondary text-white font-display font-semibold text-xs hover:bg-secondary-hv transition'
          >
            展開查看全部訂單
          </button>
          <button
            type='button'
            onClick={() => {
              const firstAllocated = group.allocatedOrders[0]
              if (firstAllocated) router.push(`/admin/orders/${firstAllocated.id}`)
            }}
            className='inline-flex items-center justify-center h-9 px-4 rounded-pill border border-line text-fg font-display font-semibold text-xs hover:bg-sunken transition'
          >
            查看訂單
          </button>
        </div>
      )}
    </div>
  )
}

// ── 已結單 / 已出貨 展開卡片清單（含批次勾選）────────────────────────────────

interface SettledOrdersListProps {
  orders: AdminOrder[]
  showBatchSelection: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onRefresh: () => void
  toastFn: (msg: string, type: 'success' | 'error') => void
}

function SettledOrdersList({
  orders,
  showBatchSelection,
  selectedIds,
  onToggleSelect,
  onRefresh,
  toastFn,
}: SettledOrdersListProps) {
  return (
    <div className='divide-y divide-line'>
      {orders.map((order) => (
        <SettledOrderCard
          key={order.id}
          order={order}
          showCheckbox={showBatchSelection}
          isSelected={selectedIds.has(order.id)}
          onToggleSelect={() => onToggleSelect(order.id)}
          onRefresh={onRefresh}
          toastFn={toastFn}
        />
      ))}
    </div>
  )
}

interface SettledOrderCardProps {
  order: AdminOrder
  showCheckbox: boolean
  isSelected: boolean
  onToggleSelect: () => void
  onRefresh: () => void
  toastFn: (msg: string, type: 'success' | 'error') => void
}

function SettledOrderCard({
  order,
  showCheckbox,
  isSelected,
  onToggleSelect,
  onRefresh,
  toastFn,
}: SettledOrderCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [shippingNumber, setShippingNumber] = useState('')
  const [shippingVendor, setShippingVendor] = useState<ShippingVendor>('黑貓')
  const [isPending, startTransition] = useTransition()
  const isShipped = order.status === 'shipped'
  const { settlement } = order
  const subtotal = orderSubtotal(order)
  const firstItem = order.items[0]
  const itemLabel = firstItem
    ? firstItem.product_name +
      (firstItem.variant_specs ? `・${specLabel(firstItem.variant_specs)}` : '')
    : '—'
  const extraCount = order.items.length - 1
  const bgColor = avatarColor(order.member_name)

  function handleConfirmShip() {
    startTransition(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: Record<string, any> = { status: 'shipped', shipping_vendor: shippingVendor }
        if (shippingNumber.trim()) body.shipping_number = shippingNumber.trim()
        const res = await fetch(`/api/admin/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (json.success) {
          toastFn('已確認出貨', 'success')
          onRefresh()
        } else {
          throw new Error(json.error ?? '出貨失敗')
        }
      } catch (err) {
        toastFn(err instanceof Error ? err.message : '出貨失敗', 'error')
      }
    })
  }

  async function handleCopy() {
    if (!settlement) return
    const lines: string[] = [`【訂單 ${shortId(order.id)}】`, `顧客：${order.member_name}`]
    if (settlement.recipient_name) lines.push(`收件人：${settlement.recipient_name}`)
    if (settlement.recipient_phone) lines.push(`手機：${settlement.recipient_phone}`)
    lines.push(`物流：${SHIPPING_METHOD_LABELS[settlement.shipping_method]}`)
    if (settlement.store_name) lines.push(`超商：${settlement.store_name}`)
    if (settlement.recipient_address) lines.push(`地址：${settlement.recipient_address}`)
    lines.push(`付款：${PAYMENT_METHOD_LABELS[settlement.payment_method]}`)
    if (settlement.note) lines.push(`備註：${settlement.note}`)
    await navigator.clipboard.writeText(lines.join('\n'))
    toastFn('已複製收件資訊', 'success')
  }

  return (
    <div>
      <div
        className='flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-ink-50 transition select-none'
        onClick={() => setExpanded((e) => !e)}
      >
        {/* AC-B6: 批次勾選 checkbox */}
        {showCheckbox && (
          <input
            type='checkbox'
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelect()
            }}
            className='w-4 h-4 rounded accent-primary cursor-pointer shrink-0'
          />
        )}

        <div className='w-28 shrink-0'>
          <div className='font-mono font-semibold text-sm text-fg'>{shortId(order.id)}</div>
          <div className='font-mono text-[10px] text-fg-subtle'>{formatDate(order.ordered_at)}</div>
        </div>

        <div className='flex items-center gap-2 flex-1 min-w-0'>
          <div
            className={`w-7 h-7 rounded-pill ${bgColor} text-white font-display font-bold text-xs flex items-center justify-center shrink-0`}
          >
            {order.member_name.charAt(0)}
          </div>
          <span className='font-semibold text-sm truncate'>{order.member_name}</span>
        </div>

        <div className='flex-[2] min-w-0 hidden sm:block'>
          <div className='text-sm truncate text-fg'>
            {itemLabel}
            {extraCount > 0 && (
              <span className='font-mono text-[10px] text-fg-subtle ml-1'>+{extraCount} 件</span>
            )}
          </div>
        </div>

        <div className='w-24 text-right shrink-0'>
          <span className='font-mono text-sm font-semibold'>NT$ {subtotal.toLocaleString()}</span>
        </div>

        <div className='shrink-0'>
          <OrderStatusBadge status={order.status} />
        </div>

        <svg
          width='16'
          height='16'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          className={`shrink-0 text-fg-subtle transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          <polyline points='9 18 15 12 9 6' />
        </svg>
      </div>

      {expanded && (
        <div className='px-5 pb-5 bg-sunken border-t border-line space-y-4'>
          {settlement ? (
            <div className='pt-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='font-display font-semibold text-sm text-fg'>收件資訊</h3>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy()
                  }}
                  className='inline-flex items-center gap-1.5 h-7 px-3 rounded-pill border border-line bg-surface text-xs font-display font-semibold text-fg-muted hover:bg-ink-100 transition'
                >
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                  >
                    <rect x='9' y='9' width='13' height='13' rx='2' />
                    <path d='M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1' />
                  </svg>
                  複製收件資訊
                </button>
              </div>
              <div className='grid grid-cols-2 gap-x-6 gap-y-3 text-sm'>
                <div>
                  <div className='text-fg-subtle text-[11px] mb-0.5'>物流方式</div>
                  <div className='text-fg font-medium'>
                    {SHIPPING_METHOD_LABELS[settlement.shipping_method]}
                  </div>
                </div>
                <div>
                  <div className='text-fg-subtle text-[11px] mb-0.5'>付款方式</div>
                  <div className='text-fg font-medium'>
                    {PAYMENT_METHOD_LABELS[settlement.payment_method]}
                  </div>
                </div>
                {settlement.recipient_name && (
                  <div>
                    <div className='text-fg-subtle text-[11px] mb-0.5'>收件人</div>
                    <div className='text-fg'>{settlement.recipient_name}</div>
                  </div>
                )}
                {settlement.recipient_phone && (
                  <div>
                    <div className='text-fg-subtle text-[11px] mb-0.5'>手機</div>
                    <div className='font-mono text-fg'>{settlement.recipient_phone}</div>
                  </div>
                )}
                {settlement.store_name && (
                  <div className='col-span-2'>
                    <div className='text-fg-subtle text-[11px] mb-0.5'>超商名稱</div>
                    <div className='text-fg'>{settlement.store_name}</div>
                  </div>
                )}
                {settlement.recipient_address && (
                  <div className='col-span-2'>
                    <div className='text-fg-subtle text-[11px] mb-0.5'>收件地址</div>
                    <div className='text-fg'>{settlement.recipient_address}</div>
                  </div>
                )}
                {settlement.note && (
                  <div className='col-span-2'>
                    <div className='text-fg-subtle text-[11px] mb-0.5'>備註</div>
                    <div className='text-fg'>{settlement.note}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='pt-4 text-sm text-fg-muted'>尚無結單資訊</div>
          )}

          {isShipped && (order.shipping_number || order.shipping_vendor) && (
            <div className='border-t border-line pt-4'>
              <h3 className='font-display font-semibold text-sm text-fg mb-3'>出貨資訊</h3>
              <div className='grid grid-cols-2 gap-x-6 gap-y-3 text-sm'>
                {order.shipping_vendor && (
                  <div>
                    <div className='text-fg-subtle text-[11px] mb-0.5'>物流商</div>
                    <div className='text-fg font-medium'>{order.shipping_vendor}</div>
                  </div>
                )}
                {order.shipping_number && (
                  <div>
                    <div className='text-fg-subtle text-[11px] mb-0.5'>物流單號</div>
                    <div className='font-mono text-fg'>{order.shipping_number}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isShipped && (
            <div className='border-t border-line pt-4' onClick={(e) => e.stopPropagation()}>
              <h3 className='font-display font-semibold text-sm text-fg mb-3'>填寫出貨資訊</h3>
              <div className='grid grid-cols-2 gap-3 mb-3'>
                <div>
                  <label className='block text-fg-subtle text-[12px] mb-1.5'>物流商</label>
                  <select
                    value={shippingVendor}
                    onChange={(e) => setShippingVendor(e.target.value as ShippingVendor)}
                    className='w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm outline-none focus:border-primary transition'
                  >
                    {SHIPPING_VENDORS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-fg-subtle text-[12px] mb-1.5'>
                    物流單號
                    <span className='text-fg-subtle ml-1'>（選填）</span>
                  </label>
                  <input
                    type='text'
                    value={shippingNumber}
                    onChange={(e) => setShippingNumber(e.target.value)}
                    placeholder='例：12345678901'
                    className='w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm font-mono outline-none focus:border-primary transition placeholder:text-fg-subtle'
                  />
                </div>
              </div>
              <button
                type='button'
                disabled={isPending}
                onClick={handleConfirmShip}
                className='inline-flex items-center justify-center h-9 px-5 rounded-pill bg-primary text-white font-display font-semibold text-sm shadow-pink hover:bg-primary-hv transition disabled:opacity-50'
              >
                {isPending ? '處理中…' : '確認出貨'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── AC-B7~B8: BatchActionBar（已結單批次出貨）─────────────────────────────────

interface BatchActionBarProps {
  selectedIds: Set<string>
  onClear: () => void
  onSuccess: () => void
  toastFn: (msg: string, type: 'success' | 'error') => void
}

function BatchActionBar({ selectedIds, onClear, onSuccess, toastFn }: BatchActionBarProps) {
  const [showForm, setShowForm] = useState(false)
  const [shippingVendor, setShippingVendor] = useState<ShippingVendor>('黑貓')
  const [shippingNumber, setShippingNumber] = useState('')
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLDivElement>(null)

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/orders/batch', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderIds: Array.from(selectedIds),
            status: 'shipped',
            shipping_vendor: shippingVendor,
            ...(shippingNumber.trim() ? { shipping_number: shippingNumber.trim() } : {}),
          }),
        })
        const json = (await res.json()) as { success?: boolean; error?: string; updated?: number }
        if (json.success) {
          toastFn(`已批次確認出貨 ${json.updated} 筆訂單`, 'success')
          onSuccess()
        } else {
          throw new Error(json.error ?? '批次出貨失敗')
        }
      } catch (err) {
        toastFn(err instanceof Error ? err.message : '批次出貨失敗', 'error')
      }
    })
  }

  return (
    <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4'>
      <div className='bg-fg text-white rounded-2xl shadow-xl overflow-hidden'>
        {/* 主列 */}
        <div className='flex items-center gap-3 px-5 py-3'>
          <span className='font-display font-bold text-sm'>已選 {selectedIds.size} 筆</span>
          <div className='flex-1' />
          <button
            type='button'
            onClick={onClear}
            className='h-8 px-3 rounded-pill bg-white/10 hover:bg-white/20 font-display font-semibold text-xs transition'
          >
            取消選取
          </button>
          <button
            type='button'
            onClick={() => setShowForm((f) => !f)}
            className='h-8 px-4 rounded-pill bg-primary text-white font-display font-semibold text-xs shadow-pink hover:bg-primary-hv transition'
          >
            確認出貨
          </button>
        </div>

        {/* AC-B8: 展開填寫共用物流資訊 */}
        {showForm && (
          <div ref={formRef} className='border-t border-white/15 px-5 py-4 space-y-3'>
            <p className='text-xs text-white/70'>所有選取訂單將使用同一組物流資訊出貨</p>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-white/70 text-[11px] mb-1'>物流商</label>
                <select
                  value={shippingVendor}
                  onChange={(e) => setShippingVendor(e.target.value as ShippingVendor)}
                  className='w-full h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-primary transition'
                >
                  {SHIPPING_VENDORS.map((v) => (
                    <option key={v} value={v} className='text-fg'>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-white/70 text-[11px] mb-1'>
                  物流單號
                  <span className='ml-1 text-white/40'>（選填）</span>
                </label>
                <input
                  type='text'
                  value={shippingNumber}
                  onChange={(e) => setShippingNumber(e.target.value)}
                  placeholder='例：12345678901'
                  className='w-full h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-mono outline-none focus:border-primary transition placeholder:text-white/30'
                />
              </div>
            </div>
            <button
              type='button'
              disabled={isPending}
              onClick={handleConfirm}
              className='w-full h-10 rounded-pill bg-primary text-white font-display font-bold text-sm shadow-pink hover:bg-primary-hv transition disabled:opacity-50'
            >
              {isPending ? '處理中…' : `確認批次出貨 ${selectedIds.size} 筆`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 空狀態 ────────────────────────────────────────────────────────────────────

function EmptyOrders({ hasSearch, onNewOrder }: { hasSearch: boolean; onNewOrder: () => void }) {
  return (
    <div className='text-center py-16'>
      <div className='w-16 h-16 mx-auto rounded-2xl bg-sunken flex items-center justify-center mb-4'>
        <svg
          width='28'
          height='28'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.6'
          strokeLinecap='round'
          className='text-fg-subtle'
        >
          <path d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2' />
          <rect x='9' y='3' width='6' height='4' rx='1' />
          <path d='M9 12h6M9 16h4' />
        </svg>
      </div>
      <div className='font-display font-bold text-base'>
        {hasSearch ? '找不到符合的訂單' : '目前沒有訂單'}
      </div>
      <p className='text-sm text-fg-muted mt-1'>
        {hasSearch ? '試試調整搜尋關鍵字' : '顧客下單或代客建立訂單後將顯示在這裡'}
      </p>
      {!hasSearch && (
        <button
          type='button'
          onClick={onNewOrder}
          className='mt-4 inline-flex items-center gap-1.5 h-9 px-5 rounded-pill bg-primary text-white text-sm font-display font-semibold shadow-pink hover:bg-primary-hv transition'
        >
          代客建單
        </button>
      )}
    </div>
  )
}

// ── 載入骨架 ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className='animate-pulse'>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className='border-t border-line px-5 py-4 flex gap-4 items-center'>
          <div className='space-y-1.5'>
            <div className='h-4 w-20 bg-ink-200 rounded font-mono' />
            <div className='h-3 w-24 bg-ink-100 rounded' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-7 h-7 rounded-pill bg-ink-100' />
            <div className='h-4 w-24 bg-ink-100 rounded' />
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-md bg-ink-100' />
            <div className='h-4 w-36 bg-ink-100 rounded' />
          </div>
          <div className='h-6 w-12 bg-ink-100 rounded-pill hidden md:block' />
          <div className='h-4 w-20 bg-ink-100 rounded ml-auto font-mono' />
          <div className='h-6 w-14 bg-ink-100 rounded-pill' />
        </div>
      ))}
    </div>
  )
}

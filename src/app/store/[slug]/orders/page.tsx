'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { initLiff } from '@/lib/line/liff'
import { OrderStatusBadge } from '@/components/ui/Badge'
import OrderStatusFilter, { type OrderFilterValue } from '@/components/store/OrderStatusFilter'
import type { CustomerOrder } from '@/types'

// ── 工具函式 ──────────────────────────────────────────────────────────────────

function formatOrderedAt(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

function formatShortId(id: string): string {
  return `RS-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

function calcOrderTotal(order: CustomerOrder): number {
  return order.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
}

// ── 型別 ──────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'ready' | 'empty' | 'error'

// ── 主元件 ────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [pageState, setPageState] = useState<PageState>('loading')
  const [filterValue, setFilterValue] = useState<OrderFilterValue>('all')
  const [selectedSettleIds, setSelectedSettleIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!slug) return

    async function load() {
      try {
        let token = 'dev-mock-token'
        if (process.env.NODE_ENV !== 'development') {
          const liff = await initLiff()
          token = liff.getAccessToken() ?? ''
        }
        const res = await fetch(`/api/orders?storeSlug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          setPageState('error')
          return
        }
        const data = (await res.json()) as { orders: CustomerOrder[] }
        setOrders(data.orders)
        const settleIds = data.orders
          .filter((o) => o.status === 'allocated' || o.status === 'settled')
          .map((o) => o.id)
        setSelectedSettleIds(new Set(settleIds))
        setPageState(data.orders.length === 0 ? 'empty' : 'ready')
      } catch {
        setPageState('error')
      }
    }

    load()
  }, [slug])

  // ── 統計 ──────────────────────────────────────────────────────────────────

  const counts = useMemo(
    () => ({
      all: orders.length,
      ordered: orders.filter((o) => o.status === 'ordered').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      canSettle: orders.filter((o) => o.status === 'allocated' || o.status === 'settled').length,
      done: orders.filter((o) => o.status === 'completed' || o.status === 'shipped').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    }),
    [orders]
  )

  const filterCounts = useMemo(
    (): Record<OrderFilterValue, number> => ({
      all: orders.length,
      ordered: counts.ordered,
      can_settle: counts.canSettle,
      shipped: counts.shipped,
      completed: counts.completed,
      cancelled: counts.cancelled,
    }),
    [orders, counts]
  )

  // ── 篩選 ──────────────────────────────────────────────────────────────────

  const settleOrders = useMemo(
    () => orders.filter((o) => o.status === 'allocated' || o.status === 'settled'),
    [orders]
  )

  const otherOrders = useMemo(() => {
    const settleIds = new Set(settleOrders.map((o) => o.id))
    switch (filterValue) {
      case 'all':
        return orders.filter((o) => !settleIds.has(o.id))
      case 'can_settle':
        return []
      case 'ordered':
        return orders.filter((o) => o.status === 'ordered')
      case 'shipped':
        return orders.filter((o) => o.status === 'shipped')
      case 'completed':
        return orders.filter((o) => o.status === 'completed')
      case 'cancelled':
        return orders.filter((o) => o.status === 'cancelled')
      default:
        return []
    }
  }, [orders, filterValue, settleOrders])

  const showSettleCard =
    settleOrders.length > 0 && (filterValue === 'all' || filterValue === 'can_settle')

  // ── 結單小計 ──────────────────────────────────────────────────────────────

  const allSettleTotal = useMemo(
    () => settleOrders.reduce((sum, o) => sum + calcOrderTotal(o), 0),
    [settleOrders]
  )

  const settleSubtotal = useMemo(
    () =>
      settleOrders
        .filter((o) => selectedSettleIds.has(o.id))
        .reduce((sum, o) => sum + calcOrderTotal(o), 0),
    [settleOrders, selectedSettleIds]
  )

  const monthTotal = useMemo(
    () =>
      orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + calcOrderTotal(o), 0),
    [orders]
  )

  const toggleSettle = (orderId: string) => {
    setSelectedSettleIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
  }

  const selectAll = () => setSelectedSettleIds(new Set(settleOrders.map((o) => o.id)))
  const deselectAll = () => setSelectedSettleIds(new Set())

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (pageState === 'loading') return <OrdersSkeleton />

  if (pageState === 'error') {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] px-5 text-center'>
        <p className='text-sm text-fg-muted'>訂單載入失敗，請稍後再試。</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className='pb-6 lg:pb-12'>
      {/* ── Mobile sticky header（lg:hidden）─────────────────────── */}
      <div
        className='lg:hidden sticky top-14 z-9 bg-app border-b'
        style={{ borderColor: '#f7e5d8' }}
      >
        <div className='px-5 pt-3 pb-3'>
          <MobileStatsRow counts={counts} />
        </div>
        <div className='px-5 pb-3'>
          <OrderStatusFilter value={filterValue} onChange={setFilterValue} counts={filterCounts} />
        </div>
      </div>

      {/* ── Desktop page heading（hidden on mobile）──────────────── */}
      <div className='hidden lg:block px-8 pt-8'>
        <div className='flex items-end justify-between mb-4'>
          <div>
            <span
              className='font-mono text-[11px] tracking-[0.2em] uppercase'
              style={{ color: 'var(--c-primary-hv)' }}
            >
              MY ORDERS
            </span>
            <h1 className='font-display font-bold text-3xl mt-1.5 leading-tight'>我的訂單</h1>
            <p className='text-sm text-fg-muted mt-1'>追蹤所有預購進度，到貨後即可結單付款 ✿</p>
          </div>
          {monthTotal > 0 && (
            <div className='text-right'>
              <div className='font-mono text-[10px] text-fg-subtle tracking-wider uppercase'>
                累積消費
              </div>
              <div className='font-mono font-bold text-lg' style={{ color: '#D94466' }}>
                NT$ {monthTotal.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Desktop 5-segment stats bar */}
        <div
          className='grid grid-cols-5 bg-surface rounded-xl shadow-sm overflow-hidden'
          style={{ border: '1px solid #f0d9cb' }}
        >
          {[
            {
              label: '全部',
              value: counts.all,
              color: undefined,
              active: filterValue === 'all',
              filter: 'all' as const,
            },
            {
              label: '已訂購',
              value: counts.ordered,
              color: '#4E94CE',
              active: filterValue === 'ordered',
              filter: 'ordered' as const,
            },
            {
              label: '已出貨',
              value: counts.shipped,
              color: '#5E9763',
              active: filterValue === 'shipped',
              filter: 'shipped' as const,
            },
            {
              label: '可結單',
              value: counts.canSettle,
              color: '#D94466',
              active: filterValue === 'can_settle',
              filter: 'can_settle' as const,
            },
            {
              label: '已完成',
              value: counts.completed,
              color: '#5E9763',
              active: filterValue === 'completed',
              filter: 'completed' as const,
            },
          ].map((seg, i) => (
            <button
              key={seg.label}
              onClick={() => setFilterValue(seg.filter)}
              className={[
                'px-5 py-4 text-left border-r transition-colors',
                i === 4 ? 'border-r-0' : '',
                seg.active ? 'bg-primary-bg/50' : 'hover:bg-primary-bg/20',
              ].join(' ')}
              style={{ borderColor: '#f7e5d8', position: 'relative' }}
            >
              {seg.active && (
                <span className='absolute left-0 top-0 right-0 h-1 rounded-b-pill bg-primary' />
              )}
              <div
                className='font-mono text-[10px] text-fg-subtle tracking-wider uppercase'
                style={seg.color && seg.label === '可結單' ? { color: '#B82F50' } : undefined}
              >
                {seg.label}
              </div>
              <div
                className='font-display font-bold text-2xl leading-none mt-1.5'
                style={{ color: seg.color ?? 'var(--fg-default)' }}
              >
                {seg.value}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop: Settle hero card（lg only）─────────────────── */}
      {showSettleCard && (
        <div className='hidden lg:block px-8 pt-6'>
          <div
            className='rounded-2xl overflow-hidden grid grid-cols-[1fr_360px]'
            style={{
              background: 'linear-gradient(135deg, #FF6E94 0%, #E8527C 100%)',
              boxShadow: '0 20px 44px -16px rgba(232,82,124,0.42), 0 0 0 1px rgba(232,82,124,0.12)',
            }}
          >
            {/* Left: item list */}
            <div className='bg-white'>
              {/* Header strip */}
              <div
                className='px-6 pt-5 pb-3 flex items-center justify-between border-b'
                style={{ borderColor: '#f7e5d8' }}
              >
                <div className='flex items-center gap-3'>
                  <div
                    className='w-10 h-10 rounded-full bg-primary-bg flex items-center justify-center'
                    style={{ color: 'var(--c-primary-hv)' }}
                  >
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='1.8'
                      strokeLinecap='round'
                      aria-hidden='true'
                    >
                      <path d='M5 12l4 4 10-10' />
                    </svg>
                  </div>
                  <div>
                    <div
                      className='font-mono text-[10px] tracking-[0.2em] uppercase'
                      style={{ color: '#B82F50' }}
                    >
                      ✦ 已到貨 · 可結單
                    </div>
                    <div className='font-display font-bold text-lg leading-tight mt-0.5'>
                      {settleOrders.length} 件商品準備好了 — 隨時可一起結單
                    </div>
                  </div>
                </div>
                <div className='flex items-center gap-2 text-xs'>
                  <button
                    onClick={selectAll}
                    className='font-display font-semibold text-fg-muted hover:text-fg'
                  >
                    全選
                  </button>
                  <span className='text-fg-subtle'>·</span>
                  <button
                    onClick={deselectAll}
                    className='font-display font-semibold text-fg-muted hover:text-fg'
                  >
                    取消選取
                  </button>
                </div>
              </div>

              {/* Items */}
              {settleOrders.map((order, idx) => {
                const item = order.items[0]
                if (!item) return null
                const checked = selectedSettleIds.has(order.id)
                const specs = item.variant ? Object.values(item.variant.specs) : []
                return (
                  <div
                    key={order.id}
                    className={[
                      'flex items-center gap-4 px-6 py-3.5 border-b',
                      idx === settleOrders.length - 1 ? 'border-b-0' : '',
                      checked ? 'bg-primary-bg/30' : '',
                    ].join(' ')}
                    style={{ borderColor: '#f7e5d8' }}
                  >
                    <button
                      onClick={() => toggleSettle(order.id)}
                      aria-label={checked ? '取消選取' : '選取'}
                      className={[
                        'w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                        checked ? 'bg-primary border-primary' : 'bg-white border-line-strong',
                      ].join(' ')}
                    >
                      {checked && (
                        <svg
                          viewBox='0 0 12 12'
                          width='9'
                          height='9'
                          fill='none'
                          strokeWidth='2'
                          stroke='white'
                        >
                          <path d='M1.5 6l3 3 6-6' strokeLinecap='round' strokeLinejoin='round' />
                        </svg>
                      )}
                    </button>
                    <div
                      className='w-14 h-14 rounded-md overflow-hidden bg-sunken shrink-0 relative'
                      style={{ border: '1px solid #f0d9cb' }}
                    >
                      {item.product.primaryImage ? (
                        <Image
                          src={item.product.primaryImage}
                          alt={item.product.name}
                          fill
                          className='object-cover'
                          sizes='56px'
                        />
                      ) : (
                        <div
                          className='w-full h-full'
                          style={{
                            background:
                              'repeating-linear-gradient(135deg, #ffe9e0, #ffe9e0 6px, #ffd9e4 6px, #ffd9e4 12px)',
                          }}
                          aria-hidden='true'
                        />
                      )}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='font-display font-bold text-sm leading-tight truncate'>
                        {item.product.name}
                      </div>
                      <div className='font-mono text-[10px] text-fg-subtle mt-1'>
                        {specs.length > 0 ? `${specs.join(' · ')} · ` : ''}
                        {formatShortId(order.id)}
                      </div>
                    </div>
                    <div className='text-right shrink-0'>
                      <div className='font-mono text-[10px] text-fg-subtle'>
                        單價 NT$ {item.unit_price.toLocaleString()}
                      </div>
                      <div className='font-mono font-bold text-sm' style={{ color: '#D94466' }}>
                        × {item.quantity} · NT$ {(item.quantity * item.unit_price).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Right: gradient summary */}
            <div className='p-6 flex flex-col text-white'>
              <div className='font-mono text-[10px] tracking-[0.2em] uppercase text-white/85'>
                結單摘要
              </div>
              <div className='font-display font-bold text-xl mt-1 leading-tight'>
                已選 <span className='text-3xl'>{selectedSettleIds.size}</span> 件
              </div>

              <div
                className='mt-4 pt-4 space-y-1.5 text-sm'
                style={{ borderTop: '1px solid rgba(255,255,255,0.22)' }}
              >
                <div className='flex justify-between text-white/85'>
                  <span>商品小計</span>
                  <span className='font-mono'>NT$ {settleSubtotal.toLocaleString()}</span>
                </div>
                <div className='flex justify-between text-white/85'>
                  <span>運費（待選）</span>
                  <span className='font-mono'>—</span>
                </div>
              </div>

              <div className='mt-4 pt-4' style={{ borderTop: '1px solid rgba(255,255,255,0.22)' }}>
                <div className='font-mono text-[10px] tracking-wider uppercase text-white/80'>
                  合計
                </div>
                <div className='font-mono font-bold text-3xl mt-1'>
                  NT$ {settleSubtotal.toLocaleString()}
                </div>
                <div className='text-[11px] text-white/75 mt-1'>下一步選擇物流方式 · 運費另計</div>
              </div>

              <Link
                href={
                  selectedSettleIds.size > 0
                    ? `/store/${slug}/orders/checkout?ids=${Array.from(selectedSettleIds).join(',')}`
                    : '#'
                }
                aria-disabled={selectedSettleIds.size === 0}
                className={[
                  'mt-auto inline-flex items-center justify-center gap-1.5 h-12 px-5 rounded-full font-display font-bold text-sm transition',
                  selectedSettleIds.size > 0
                    ? 'bg-white text-primary hover:bg-white/95 active:scale-[.98]'
                    : 'bg-white/30 text-white/60 cursor-not-allowed',
                ].join(' ')}
              >
                前往結單 → 填寫物流
                <svg
                  width='14'
                  height='14'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.5'
                  strokeLinecap='round'
                  aria-hidden='true'
                >
                  <path d='M9 6l6 6-6 6' />
                </svg>
              </Link>
              <button
                onClick={deselectAll}
                className='mt-2 inline-flex items-center justify-center gap-1.5 h-9 rounded-full font-display font-semibold text-xs text-white'
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.32)',
                }}
              >
                僅結部分 / 分批結單？
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop: 其他訂單 heading + filter row（lg only）──────── */}
      <div className='hidden lg:flex items-center gap-3 px-8 pt-8 pb-3'>
        <h2 className='font-display font-bold text-lg whitespace-nowrap mr-2'>其他訂單</h2>
        <OrderStatusFilter value={filterValue} onChange={setFilterValue} counts={filterCounts} />
        <span
          className='flex-1 h-px'
          style={{ background: 'linear-gradient(to right, #e6c7b4, transparent)' }}
        />
        <button
          className='inline-flex items-center gap-1 h-8 px-3.5 rounded-full bg-surface font-display font-semibold text-xs shrink-0'
          style={{ border: '1px solid #f0d9cb', color: 'var(--fg-muted)' }}
        >
          時間 ↓
        </button>
      </div>

      {/* ── Mobile content + Desktop card grid ─────────────────── */}
      <div className='px-5 pt-3 lg:px-8 lg:pt-0'>
        {/* 空狀態 */}
        {pageState === 'empty' && (
          <div className='flex flex-col items-center justify-center py-16 text-center'>
            <div className='w-16 h-16 rounded-full bg-sunken flex items-center justify-center mb-4'>
              <svg
                viewBox='0 0 24 24'
                width='28'
                height='28'
                fill='none'
                stroke='var(--border-strong)'
                strokeWidth='1.5'
                aria-hidden='true'
              >
                <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' />
                <polyline points='14 2 14 8 20 8' />
                <line x1='16' y1='13' x2='8' y2='13' />
                <line x1='16' y1='17' x2='8' y2='17' />
              </svg>
            </div>
            <p className='text-sm text-fg-muted mb-4'>目前尚無訂單，快去選購吧！</p>
            <Link
              href={`/store/${slug}`}
              className='inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-hv text-white text-[13px] font-display font-bold rounded-pill transition-colors shadow-pink'
            >
              去逛商品
            </Link>
          </div>
        )}

        {/* Mobile 可結單漸層卡 */}
        {showSettleCard && (
          <div className='lg:hidden'>
            <MobileSettleCard
              orders={settleOrders}
              allTotal={allSettleTotal}
              selectedIds={selectedSettleIds}
              onToggle={toggleSettle}
              subtotal={settleSubtotal}
              slug={slug}
            />
          </div>
        )}

        {/* 其他訂單卡片 */}
        {otherOrders.length > 0 && (
          <div className='mt-4 lg:mt-0'>
            {filterValue === 'all' && showSettleCard && (
              <div className='flex items-center gap-3 pb-1 px-1 mb-3 lg:hidden'>
                <span className='font-display font-bold text-xs tracking-wider text-fg-muted uppercase whitespace-nowrap'>
                  其他訂單
                </span>
                <span
                  className='flex-1 h-px'
                  style={{ background: 'linear-gradient(to right, #e6c7b4, transparent)' }}
                />
              </div>
            )}
            <div className='space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4'>
              {otherOrders.map((order) => (
                <OtherOrderCard key={order.id} order={order} slug={slug} />
              ))}
            </div>
            <div className='py-6 flex items-center justify-center gap-3'>
              <span className='h-px w-12 lg:w-16' style={{ background: '#e6c7b4' }} />
              <span className='text-[11px] text-fg-subtle font-mono tracking-wider'>
                沒有更早的訂單了 ✿
              </span>
              <span className='h-px w-12 lg:w-16' style={{ background: '#e6c7b4' }} />
            </div>
          </div>
        )}

        {/* 篩選後無結果 */}
        {pageState === 'ready' && !showSettleCard && otherOrders.length === 0 && (
          <div className='py-16 text-center'>
            <p className='text-sm text-fg-muted'>目前沒有符合條件的訂單</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Mobile 三格統計列 ─────────────────────────────────────────────────────────

function MobileStatsRow({
  counts,
}: {
  counts: { ordered: number; canSettle: number; shipped: number }
}) {
  return (
    <div
      className='grid grid-cols-3 bg-surface rounded-xl shadow-sm overflow-hidden'
      style={{ border: '1px solid #f0d9cb' }}
    >
      <div className='px-2 py-2.5 text-center border-r' style={{ borderColor: '#f7e5d8' }}>
        <div className='font-display font-bold text-xl leading-none' style={{ color: '#4e94ce' }}>
          {counts.ordered}
        </div>
        <div className='text-[10px] text-fg-muted mt-1 tracking-wider'>已訂購</div>
      </div>
      <div
        className={[
          'px-2 py-2.5 text-center border-r relative',
          counts.canSettle > 0 ? 'bg-primary-bg/60' : '',
        ].join(' ')}
        style={{ borderColor: '#f7e5d8' }}
      >
        {counts.canSettle > 0 && (
          <span className='absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-primary' />
        )}
        <div className='font-display font-bold text-xl leading-none' style={{ color: '#d94466' }}>
          {counts.canSettle}
        </div>
        <div className='text-[10px] mt-1 tracking-wider' style={{ color: '#b82f50' }}>
          可結單
        </div>
      </div>
      <div className='px-2 py-2.5 text-center'>
        <div className='font-display font-bold text-xl leading-none' style={{ color: '#5e9763' }}>
          {counts.shipped}
        </div>
        <div className='text-[10px] text-fg-muted mt-1 tracking-wider'>已出貨</div>
      </div>
    </div>
  )
}

// ── Mobile 可結單漸層卡 ───────────────────────────────────────────────────────

interface MobileSettleCardProps {
  orders: CustomerOrder[]
  allTotal: number
  selectedIds: Set<string>
  onToggle: (id: string) => void
  subtotal: number
  slug: string
}

function MobileSettleCard({
  orders,
  allTotal,
  selectedIds,
  onToggle,
  subtotal,
  slug,
}: MobileSettleCardProps) {
  return (
    <div
      className='mb-2 rounded-xl overflow-hidden'
      style={{
        background: 'linear-gradient(135deg, #ff6e94 0%, #e8527c 100%)',
        boxShadow: '0 12px 28px -10px rgba(232,82,124,.45), 0 0 0 1px rgba(232,82,124,.12)',
      }}
    >
      <div className='px-4 pt-4 pb-3 text-white'>
        <div className='flex items-center justify-between'>
          <div>
            <div className='font-mono text-[10px] tracking-[.2em] text-white/85 uppercase'>
              ✦ 已到貨 · 可結單
            </div>
            <div className='font-display font-bold text-base mt-1 leading-tight'>
              {orders.length} 件商品準備好了
            </div>
          </div>
          <div className='text-right'>
            <div className='font-mono text-[10px] text-white/80 tracking-wider uppercase'>小計</div>
            <div className='font-display font-bold text-lg leading-none mt-0.5 whitespace-nowrap'>
              NT$ {allTotal.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className='bg-white'>
        {orders.map((order, idx) => {
          const item = order.items[0]
          if (!item) return null
          const checked = selectedIds.has(order.id)
          const specs = item.variant ? Object.values(item.variant.specs) : []
          return (
            <div
              key={order.id}
              className={[
                'flex items-center gap-3 px-4 py-3',
                idx < orders.length - 1 ? 'border-b' : '',
                checked ? 'bg-primary-bg/40' : '',
              ].join(' ')}
              style={idx < orders.length - 1 ? { borderColor: '#f0d9cb' } : undefined}
            >
              <button
                onClick={() => onToggle(order.id)}
                aria-label={checked ? '取消選取此訂單' : '選取此訂單'}
                className={[
                  'w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  checked ? 'bg-primary border-primary' : 'bg-white border-line-strong',
                ].join(' ')}
              >
                {checked && (
                  <svg
                    viewBox='0 0 12 12'
                    width='9'
                    height='9'
                    fill='none'
                    strokeWidth='2'
                    stroke='white'
                  >
                    <path d='M1.5 6l3 3 6-6' strokeLinecap='round' strokeLinejoin='round' />
                  </svg>
                )}
              </button>
              <div
                className='w-12 h-12 rounded-md overflow-hidden bg-sunken shrink-0 relative'
                style={{ border: '1px solid #f0d9cb' }}
              >
                {item.product.primaryImage ? (
                  <Image
                    src={item.product.primaryImage}
                    alt={item.product.name}
                    fill
                    className='object-cover'
                    sizes='48px'
                  />
                ) : (
                  <div
                    className='w-full h-full'
                    style={{
                      background:
                        'repeating-linear-gradient(135deg, #ffe9e0, #ffe9e0 6px, #ffd9e4 6px, #ffd9e4 12px)',
                    }}
                    aria-hidden='true'
                  />
                )}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='font-display font-bold text-sm leading-tight truncate'>
                  {item.product.name}
                </div>
                <div className='font-mono text-[10px] text-fg-subtle mt-1'>
                  {specs.length > 0 ? `${specs.join(' · ')} · ` : ''}
                  {formatShortId(order.id)}
                </div>
              </div>
              <div className='text-right shrink-0'>
                <div className='font-mono font-bold text-sm' style={{ color: '#d94466' }}>
                  NT$ {(item.quantity * item.unit_price).toLocaleString()}
                </div>
                <div className='font-mono text-[10px] text-fg-subtle'>× {item.quantity}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div
        className='px-4 py-3 flex items-center justify-between'
        style={{ background: '#fff6f1', borderTop: '1px solid #f7e5d8' }}
      >
        <div className='text-xs'>
          <span className='text-fg-muted'>已選 </span>
          <b className='font-display' style={{ color: '#d94466' }}>
            {selectedIds.size} 件
          </b>
          <span className='text-fg-muted'> · 合計 </span>
          <b className='font-mono' style={{ color: '#d94466' }}>
            NT$ {subtotal.toLocaleString()}
          </b>
        </div>
        <Link
          href={
            selectedIds.size > 0
              ? `/store/${slug}/orders/checkout?ids=${Array.from(selectedIds).join(',')}`
              : '#'
          }
          aria-disabled={selectedIds.size === 0}
          className={[
            'inline-flex items-center gap-1.5 h-10 px-5 rounded-pill font-display font-bold text-sm transition whitespace-nowrap',
            selectedIds.size > 0
              ? 'bg-primary text-white shadow-pink hover:bg-primary-hv active:scale-[.97]'
              : 'bg-ink-200 text-fg-muted cursor-not-allowed pointer-events-none',
          ].join(' ')}
        >
          前往結單
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            strokeLinecap='round'
            aria-hidden='true'
          >
            <path d='M9 6l6 6-6 6' />
          </svg>
        </Link>
      </div>
    </div>
  )
}

// ── 其他訂單卡片 ──────────────────────────────────────────────────────────────

function OtherOrderCard({ order, slug }: { order: CustomerOrder; slug: string }) {
  const item = order.items[0]
  if (!item) return null

  const total = calcOrderTotal(order)
  const specs = item.variant ? Object.values(item.variant.specs) : []
  const isShipped = order.status === 'shipped' && order.shipping_number
  const hasNote = order.note && (order.status === 'pending_purchase' || order.status === 'ordered')
  const isCompleted = order.status === 'completed'
  const isOrdered = order.status === 'ordered'

  return (
    <article
      className={[
        'bg-surface rounded-xl shadow-sm overflow-hidden',
        isCompleted ? 'opacity-90' : '',
      ].join(' ')}
      style={{ border: '1px solid #f0d9cb' }}
    >
      {/* Card header */}
      <div
        className='flex items-center justify-between px-4 lg:px-5 pt-3 pb-2.5 border-b'
        style={{ borderColor: '#f0d9cb', background: '#FDF6F0' }}
      >
        <div className='flex items-baseline gap-2'>
          <span className='font-mono text-xs font-semibold text-fg'>{formatShortId(order.id)}</span>
          <span className='font-mono text-[10px] text-fg-subtle'>
            {formatOrderedAt(order.ordered_at)}
          </span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Product */}
      <div className='flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-3.5'>
        <div
          className='w-14 h-14 rounded-md overflow-hidden bg-sunken shrink-0 relative'
          style={{ border: '1px solid #f0d9cb' }}
        >
          {item.product.primaryImage ? (
            <Image
              src={item.product.primaryImage}
              alt={item.product.name}
              fill
              className='object-cover'
              sizes='56px'
            />
          ) : (
            <div
              className='w-full h-full'
              style={{
                background:
                  'repeating-linear-gradient(135deg, #ffe9e0, #ffe9e0 6px, #ffd9e4 6px, #ffd9e4 12px)',
              }}
              aria-hidden='true'
            />
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='font-display font-bold text-sm leading-tight truncate'>
            {item.product.name}
          </div>
          <div className='font-mono text-[10px] text-fg-subtle mt-1'>
            {specs.length > 0 ? `${specs.join(' · ')} · ` : ''}× {item.quantity}
          </div>
        </div>
        <div className='text-right shrink-0'>
          <div
            className='font-mono font-bold text-sm'
            style={{ color: isCompleted ? 'var(--fg-muted)' : '#d94466' }}
          >
            NT$ {total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Note（ordered） */}
      {hasNote && (
        <div
          className='mx-4 lg:mx-5 mb-3 px-3 py-2 rounded-md flex items-center gap-2'
          style={{ background: '#fbf2ea', border: '1px solid #f2e2d0' }}
        >
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
            className='text-fg-muted shrink-0'
            aria-hidden='true'
          >
            <circle cx='12' cy='12' r='9' />
            <path d='M12 7v5l3 2' />
          </svg>
          <span className='text-xs text-fg-muted'>{order.note}</span>
        </div>
      )}

      {/* Shipping info（shipped） */}
      {isShipped && (
        <div
          className='mx-4 lg:mx-5 mb-3 pt-2.5 border-t flex items-center justify-between'
          style={{ borderColor: '#f0d9cb' }}
        >
          <div className='flex items-center gap-2 text-xs'>
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              className='text-secondary shrink-0'
              aria-hidden='true'
            >
              <rect x='3' y='9' width='13' height='9' rx='1' />
              <path d='M16 12h3l2 3v3h-5' />
              <circle cx='7' cy='19' r='2' />
              <circle cx='17' cy='19' r='2' />
            </svg>
            <span className='text-fg-muted'>{order.shipping_vendor ?? '快遞'}</span>
            <span className='font-mono font-semibold text-fg'>{order.shipping_number}</span>
          </div>
          <button className='text-xs font-display font-bold text-primary'>追蹤物流 →</button>
        </div>
      )}

      {/* Action buttons (ordered / completed) */}
      {(isOrdered || isCompleted) && (
        <div className='px-4 lg:px-5 pb-3 lg:pb-3.5 flex items-center justify-end gap-2'>
          {isOrdered && (
            <>
              <button
                className='h-8 px-3.5 rounded-pill bg-surface font-display font-semibold text-xs text-fg-muted hover:text-fg'
                style={{ border: '1px solid #f0d9cb' }}
              >
                取消訂單
              </button>
              <button
                className='h-8 px-3.5 rounded-pill bg-surface font-display font-semibold text-xs text-primary hover:bg-primary-bg'
                style={{ border: '1px solid #f0d9cb' }}
              >
                追蹤進度 →
              </button>
            </>
          )}
          {isCompleted && (
            <>
              <button
                className='h-8 px-3.5 rounded-pill bg-surface font-display font-semibold text-xs text-fg-muted'
                style={{ border: '1px solid #f0d9cb' }}
              >
                查看收據
              </button>
              <Link
                href={`/store/${slug}`}
                className='h-8 px-3.5 rounded-pill bg-primary text-white font-display font-bold text-xs shadow-pink inline-flex items-center'
              >
                再買一次
              </Link>
            </>
          )}
        </div>
      )}
    </article>
  )
}

// ── 骨架畫面 ──────────────────────────────────────────────────────────────────

function OrdersSkeleton() {
  return (
    <div className='pb-6 lg:pb-12'>
      {/* Mobile sticky skeleton */}
      <div
        className='lg:hidden sticky top-14 z-9 bg-app border-b'
        style={{ borderColor: '#f7e5d8' }}
      >
        <div className='px-5 pt-3 pb-3'>
          <div
            className='grid grid-cols-3 bg-surface rounded-xl overflow-hidden h-13'
            style={{ border: '1px solid #f0d9cb' }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={[
                  'flex flex-col items-center justify-center py-2.5',
                  i < 2 ? 'border-r' : '',
                ].join(' ')}
                style={i < 2 ? { borderColor: '#f7e5d8' } : undefined}
              >
                <div className='h-5 w-8 rounded-md bg-ink-100 animate-pulse mb-1' />
                <div className='h-2 w-12 rounded bg-ink-100 animate-pulse' />
              </div>
            ))}
          </div>
        </div>
        <div className='px-5 pb-3 flex gap-1.5'>
          {[72, 60, 60, 60, 60].map((w, i) => (
            <div
              key={i}
              className='h-8 rounded-pill bg-ink-100 animate-pulse shrink-0'
              style={{ width: w }}
            />
          ))}
        </div>
      </div>
      <div className='lg:hidden px-5 space-y-3 pt-3'>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className='bg-surface rounded-xl p-3 flex gap-3 shadow-sm'
            style={{ border: '1px solid #f0d9cb' }}
          >
            <div className='w-14 h-14 rounded-md bg-ink-100 animate-pulse shrink-0' />
            <div className='flex-1 flex flex-col gap-2 justify-center'>
              <div className='h-3 w-3/4 rounded bg-ink-100 animate-pulse' />
              <div className='h-3 w-1/2 rounded bg-ink-100 animate-pulse' />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton */}
      <div className='hidden lg:block px-8 pt-8'>
        <div className='h-8 w-48 rounded bg-ink-100 animate-pulse mb-2' />
        <div className='h-4 w-64 rounded bg-ink-100 animate-pulse mb-4' />
        <div
          className='grid grid-cols-5 bg-surface rounded-xl h-[68px]'
          style={{ border: '1px solid #f0d9cb' }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={['flex flex-col gap-2 justify-center px-5', i < 4 ? 'border-r' : ''].join(
                ' '
              )}
              style={{ borderColor: '#f7e5d8' }}
            >
              <div className='h-2 w-12 rounded bg-ink-100 animate-pulse' />
              <div className='h-6 w-8 rounded bg-ink-100 animate-pulse' />
            </div>
          ))}
        </div>
        <div className='mt-6 h-52 rounded-2xl bg-ink-100 animate-pulse' />
        <div className='mt-8 grid grid-cols-2 gap-4'>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className='bg-surface rounded-xl p-3 flex gap-3 shadow-sm'
              style={{ border: '1px solid #f0d9cb' }}
            >
              <div className='w-14 h-14 rounded-md bg-ink-100 animate-pulse shrink-0' />
              <div className='flex-1 flex flex-col gap-2 justify-center'>
                <div className='h-3 w-3/4 rounded bg-ink-100 animate-pulse' />
                <div className='h-3 w-1/2 rounded bg-ink-100 animate-pulse' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

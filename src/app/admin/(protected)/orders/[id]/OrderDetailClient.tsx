'use client'

import Link from 'next/link'
import { use, useCallback, useEffect, useState, useTransition } from 'react'
import type { AdminOrder, OrderStatus } from '@/types'
import { Button } from '@/components/ui/Button'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { ToastContainer, useToast } from '@/components/ui/Toast'

// ── 工具 ──────────────────────────────────────────────────────────────────────

function shortId(fullId: string) {
  return 'RS-' + fullId.slice(-6).toUpperCase()
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
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

// 合法的下一步狀態（商家可操作）
const NEXT_STATUS: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending_purchase: { status: 'ordered', label: '標記為已訂購' },
  ordered: { status: 'allocated', label: '標記為已配單' },
  allocated: { status: 'settled', label: '代客結單' },
  settled: { status: 'shipped', label: '標記為已出貨' },
  shipped: { status: 'completed', label: '標記為已完成' },
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_purchase: '待採買',
  ordered: '已訂購',
  allocated: '已配單',
  settled: '已結單',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export default function OrderDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params)
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toasts, toast, dismiss } = useToast()

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`)
      const json = (await res.json()) as { success: boolean; data: AdminOrder; error?: string }
      if (json.success) {
        setOrder(json.data)
      } else {
        toast(json.error ?? '載入失敗', 'error')
      }
    } catch {
      toast('載入訂單失敗，請重新整理', 'error')
    } finally {
      setLoading(false)
    }
  }, [orderId, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrder()
  }, [fetchOrder])

  const nextStep = order ? NEXT_STATUS[order.status] : null

  const handleStatusUpdate = () => {
    if (!nextStep || !order) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStep.status }),
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (json.success) {
          toast('訂單狀態已更新', 'success')
          setShowConfirm(false)
          await fetchOrder()
        } else {
          throw new Error(json.error ?? '更新失敗')
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : '更新失敗', 'error')
        setShowConfirm(false)
      }
    })
  }

  if (loading) {
    return (
      <div className='max-w-2xl animate-pulse space-y-4'>
        <div className='h-5 w-32 bg-ink-200 rounded' />
        <div className='bg-surface border border-line rounded-xl p-6 space-y-3'>
          <div className='h-4 w-48 bg-ink-200 rounded' />
          <div className='h-4 w-64 bg-ink-100 rounded' />
          <div className='h-4 w-40 bg-ink-100 rounded' />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className='max-w-2xl'>
        <p className='text-fg-muted'>找不到此訂單。</p>
        <Link href='/admin/orders' className='text-primary text-sm mt-2 inline-block'>
          ← 返回訂單列表
        </Link>
      </div>
    )
  }

  const subtotal = order.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {showConfirm && nextStep && (
        <ConfirmModal
          title={nextStep.label}
          message={`確定要將訂單 ${shortId(order.id)} 的狀態從「${STATUS_LABEL[order.status]}」更新為「${STATUS_LABEL[nextStep.status]}」嗎？`}
          confirmLabel={nextStep.label}
          onConfirm={handleStatusUpdate}
          onCancel={() => setShowConfirm(false)}
          isLoading={isPending}
        />
      )}

      {/* ── 麵包屑 / 返回 ── */}
      <div className='flex items-center gap-2 text-sm text-fg-muted mb-6'>
        <Link href='/admin/orders' className='hover:text-fg transition no-underline text-fg-muted'>
          訂單管理
        </Link>
        <svg
          viewBox='0 0 24 24'
          width='13'
          height='13'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          aria-hidden='true'
        >
          <polyline points='9 18 15 12 9 6' />
        </svg>
        <span className='font-mono text-fg font-medium'>{shortId(order.id)}</span>
      </div>

      <div className='max-w-2xl space-y-4'>
        {/* ── 訂單摘要卡 ── */}
        <div className='bg-surface border border-line rounded-xl p-5'>
          <div className='flex items-start justify-between gap-4 mb-4'>
            <div>
              <div className='font-mono text-xs text-fg-subtle mb-1'>{order.id}</div>
              <div className='font-display font-bold text-xl text-fg'>{shortId(order.id)}</div>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <OrderStatusBadge status={order.status} />
              {order.created_by === 'merchant' && (
                <span className='font-mono text-[10px] px-1.5 py-px rounded bg-earth-100 text-earth-700 border border-earth-200'>
                  代客建單
                </span>
              )}
            </div>
          </div>

          {/* 顧客資訊 */}
          <div className='border-t border-line pt-4 grid grid-cols-2 gap-3 text-sm'>
            <div>
              <div className='text-fg-subtle text-xs mb-1'>顧客</div>
              <div className='font-semibold text-fg'>{order.member_name}</div>
            </div>
            <div>
              <div className='text-fg-subtle text-xs mb-1'>LINE ID</div>
              <div className='font-mono text-fg-muted'>{order.member_line_id || '—'}</div>
            </div>
            <div>
              <div className='text-fg-subtle text-xs mb-1'>下單時間</div>
              <div className='text-fg-muted'>{formatDateTime(order.ordered_at)}</div>
            </div>
            <div>
              <div className='text-fg-subtle text-xs mb-1'>最後更新</div>
              <div className='text-fg-muted'>{formatDateTime(order.updated_at)}</div>
            </div>
            {order.cancelled_at && (
              <div className='col-span-2'>
                <div className='text-fg-subtle text-xs mb-1'>取消時間</div>
                <div className='text-fg-muted'>
                  {formatDateTime(order.cancelled_at)}
                  {order.cancelled_by &&
                    `（${order.cancelled_by === 'merchant' ? '商家' : '顧客'}取消）`}
                </div>
              </div>
            )}
            {order.note && (
              <div className='col-span-2'>
                <div className='text-fg-subtle text-xs mb-1'>備註</div>
                <div className='text-fg bg-sunken rounded-lg px-3 py-2 text-sm'>{order.note}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── 商品明細 ── */}
        <div className='bg-surface border border-line rounded-xl overflow-hidden'>
          <div className='px-5 py-3 border-b border-line'>
            <h2 className='font-display font-semibold text-sm text-fg'>商品明細</h2>
          </div>
          <div className='divide-y divide-line'>
            {order.items.map((item) => (
              <div key={item.id} className='px-5 py-4 flex items-start gap-4'>
                <div className='flex-1 min-w-0'>
                  <div className='font-medium text-sm text-fg'>{item.product_name}</div>
                  <div className='flex items-center gap-2 mt-1 flex-wrap'>
                    {item.variant_specs && (
                      <span className='font-mono text-[10px] text-fg-subtle'>
                        {specLabel(item.variant_specs)}
                      </span>
                    )}
                    {item.supplier_name && (
                      <span className='font-mono text-[10px] px-1.5 py-px rounded bg-ink-100 text-fg-subtle border border-line'>
                        {item.supplier_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className='text-right shrink-0'>
                  <div className='font-mono text-sm text-fg'>
                    NT$ {(item.unit_price * item.quantity).toLocaleString()}
                  </div>
                  <div className='font-mono text-[10px] text-fg-subtle mt-0.5'>
                    NT$ {item.unit_price.toLocaleString()} × {item.quantity}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* 合計 */}
          <div className='px-5 py-4 border-t border-line flex justify-between items-center bg-ink-50'>
            <span className='font-display font-semibold text-sm text-fg'>合計</span>
            <span className='font-display font-bold text-lg text-fg'>
              NT$ {subtotal.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── 出貨資訊（有出貨單號時顯示）── */}
        {(order.shipping_number || order.shipping_vendor) && (
          <div className='bg-surface border border-line rounded-xl p-5'>
            <h2 className='font-display font-semibold text-sm text-fg mb-3'>出貨資訊</h2>
            <div className='grid grid-cols-2 gap-3 text-sm'>
              {order.shipping_vendor && (
                <div>
                  <div className='text-fg-subtle text-xs mb-1'>物流商</div>
                  <div className='text-fg'>{order.shipping_vendor}</div>
                </div>
              )}
              {order.shipping_number && (
                <div>
                  <div className='text-fg-subtle text-xs mb-1'>單號</div>
                  <div className='font-mono text-fg'>{order.shipping_number}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 操作按鈕 ── */}
        {nextStep && order.status !== 'cancelled' && (
          <div className='flex gap-3'>
            <Button
              variant='secondary'
              onClick={() => setShowConfirm(true)}
              disabled={isPending}
              className='flex-1'
            >
              {nextStep.label}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

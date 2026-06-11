'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { OrderStatusBadge } from '@/components/ui/Badge'
import type { AdminOrder, ShippingMethod, PaymentMethod } from '@/types'

// ── 工具 ───────────────────────────────────────────────────────────────────────

type ShippingVendor = '黑貓' | '7-11' | '全家' | '賣貨便' | '其他'
const SHIPPING_VENDORS: ShippingVendor[] = ['黑貓', '7-11', '全家', '賣貨便', '其他']

const SHIPPING_METHODS: ShippingMethod[] = ['pickup', 'convenience', 'maihuobian', 'home_delivery']
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'transfer', 'cod']

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

function labelOrDash(labels: Record<string, string>, value: string | null | undefined): string {
  if (!value) return '—'
  return labels[value] ?? value
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

function shortId(fullId: string): string {
  return 'RS-' + fullId.replace(/-/g, '').slice(0, 6).toUpperCase()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function specLabel(specs: Record<string, string> | null): string {
  if (!specs) return ''
  return Object.values(specs).join(' / ')
}

function orderSubtotal(order: AdminOrder): number {
  return order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
}

// ── Bundle 資料結構 ────────────────────────────────────────────────────────────

interface Bundle {
  bundleId: string
  memberId: string
  memberName: string
  memberLineId: string
  orderIds: string[]
  allOrders: AdminOrder[]
  totalAmount: number
  shipping: AdminOrder['settlement']
  shippingNumber: string | null
  shippingVendor: ShippingVendor | null
  isAllShipped: boolean
  latestAt: string // 結單時間（settled_at）或出貨時間（updated_at）
}

interface CustomerSection {
  memberId: string
  memberName: string
  memberLineId: string
  bundles: Bundle[]
}

function buildBundles(orders: AdminOrder[]): CustomerSection[] {
  const bundleMap = new Map<string, Bundle>()

  for (const order of orders) {
    // 用 bundle_id 歸組；無 bundle_id 的舊資料用 order.id 作為合成 bundleKey
    const bundleKey = order.settlement?.bundle_id ?? order.id
    const mapKey = `${order.member_id}__${bundleKey}`

    const existing = bundleMap.get(mapKey)
    if (existing) {
      existing.orderIds.push(order.id)
      existing.allOrders.push(order)
      existing.totalAmount += orderSubtotal(order)
      if (order.status !== 'shipped') existing.isAllShipped = false
    } else {
      const isShipped = order.status === 'shipped'
      bundleMap.set(mapKey, {
        bundleId: bundleKey,
        memberId: order.member_id,
        memberName: order.member_name,
        memberLineId: order.member_line_id,
        orderIds: [order.id],
        allOrders: [order],
        totalAmount: orderSubtotal(order),
        shipping: order.settlement,
        shippingNumber: order.shipping_number,
        shippingVendor: order.shipping_vendor as ShippingVendor | null,
        isAllShipped: isShipped,
        latestAt: isShipped ? order.updated_at : (order.settlement?.settled_at ?? order.updated_at),
      })
    }
  }

  const customerMap = new Map<string, CustomerSection>()
  for (const bundle of bundleMap.values()) {
    const existing = customerMap.get(bundle.memberId)
    if (existing) {
      existing.bundles.push(bundle)
    } else {
      customerMap.set(bundle.memberId, {
        memberId: bundle.memberId,
        memberName: bundle.memberName,
        memberLineId: bundle.memberLineId,
        bundles: [bundle],
      })
    }
  }

  return Array.from(customerMap.values())
}

// ── 主元件 ─────────────────────────────────────────────────────────────────────

interface SettledBundleViewProps {
  orders: AdminOrder[]
  onRefresh: () => void
  toastFn: (msg: string, type: 'success' | 'error') => void
}

export default function SettledBundleView({ orders, onRefresh, toastFn }: SettledBundleViewProps) {
  const sections = buildBundles(orders)

  // 批次出貨：選取多個 bundle（collect all their orderIds）
  const [selectedBundleIds, setSelectedBundleIds] = useState<Set<string>>(new Set())

  function toggleBundle(bundleId: string) {
    setSelectedBundleIds((prev) => {
      const next = new Set(prev)
      if (next.has(bundleId)) next.delete(bundleId)
      else next.add(bundleId)
      return next
    })
  }

  // 收集所有選取 bundle 的 orderIds 和總金額（供批次出貨用）
  const allSelectedOrderIds: string[] = []
  let selectedBundlesTotal = 0
  for (const section of sections) {
    for (const bundle of section.bundles) {
      if (selectedBundleIds.has(bundle.bundleId)) {
        allSelectedOrderIds.push(...bundle.orderIds)
        selectedBundlesTotal += bundle.totalAmount
      }
    }
  }

  if (sections.length === 0) {
    return <div className='py-12 text-center text-sm text-fg-muted'>目前沒有已結單訂單</div>
  }

  return (
    <div className='divide-y divide-line'>
      {sections.map((section) => (
        <CustomerBundleSection
          key={section.memberId}
          section={section}
          selectedBundleIds={selectedBundleIds}
          onToggleBundle={toggleBundle}
          onRefresh={() => {
            setSelectedBundleIds(new Set())
            onRefresh()
          }}
          toastFn={toastFn}
        />
      ))}

      {/* 批次出貨 bar */}
      {selectedBundleIds.size > 0 && (
        <BatchShipBar
          selectedBundleIds={selectedBundleIds}
          allSelectedOrderIds={allSelectedOrderIds}
          selectedBundlesTotal={selectedBundlesTotal}
          onClear={() => setSelectedBundleIds(new Set())}
          onSuccess={() => {
            setSelectedBundleIds(new Set())
            onRefresh()
          }}
          toastFn={toastFn}
        />
      )}
    </div>
  )
}

// ── 顧客區段 ──────────────────────────────────────────────────────────────────

interface CustomerBundleSectionProps {
  section: CustomerSection
  selectedBundleIds: Set<string>
  onToggleBundle: (bundleId: string) => void
  onRefresh: () => void
  toastFn: (msg: string, type: 'success' | 'error') => void
}

function CustomerBundleSection({
  section,
  selectedBundleIds,
  onToggleBundle,
  onRefresh,
  toastFn,
}: CustomerBundleSectionProps) {
  const bgColor = avatarColor(section.memberName)
  const totalBundles = section.bundles.length
  const totalAmount = section.bundles.reduce((s, b) => s + b.totalAmount, 0)

  return (
    <div className='px-5 py-4 space-y-3'>
      {/* 顧客標頭 */}
      <div className='flex items-center gap-3'>
        <div
          className={`w-9 h-9 rounded-pill ${bgColor} text-white font-display font-bold text-sm flex items-center justify-center shrink-0 select-none`}
        >
          {section.memberName.charAt(0)}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='font-display font-bold text-sm text-fg'>{section.memberName}</div>
          <div className='font-mono text-[10px] text-fg-subtle'>{section.memberLineId}</div>
        </div>
        <span className='font-mono text-xs text-fg-muted shrink-0'>
          {totalBundles} 筆結單 · NT$ {totalAmount.toLocaleString()}
        </span>
      </div>

      {/* Bundle 列表 */}
      <div className='space-y-2'>
        {section.bundles.map((bundle) => (
          <BundleCard
            key={bundle.bundleId}
            bundle={bundle}
            isSelected={selectedBundleIds.has(bundle.bundleId)}
            onToggleSelect={() => onToggleBundle(bundle.bundleId)}
            onRefresh={onRefresh}
            toastFn={toastFn}
          />
        ))}
      </div>
    </div>
  )
}

// ── Bundle 卡片 ───────────────────────────────────────────────────────────────

interface BundleCardProps {
  bundle: Bundle
  isSelected: boolean
  onToggleSelect: () => void
  onRefresh: () => void
  toastFn: (msg: string, type: 'success' | 'error') => void
}

function BundleCard({ bundle, isSelected, onToggleSelect, onRefresh, toastFn }: BundleCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [shippingNumber, setShippingNumber] = useState(bundle.shippingNumber ?? '')
  const [shippingVendor, setShippingVendor] = useState<ShippingVendor>(
    bundle.shippingVendor ?? '7-11'
  )
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>(
    bundle.shipping?.shipping_method ?? 'convenience'
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    bundle.shipping?.payment_method ?? 'transfer'
  )
  const [shippingFee, setShippingFee] = useState<number>(() => {
    const method = bundle.shipping?.shipping_method ?? 'convenience'
    if (method === 'pickup') return 0
    if (method === 'maihuobian') return 38
    return 0
  })
  const profileFetchedRef = useRef(false)
  const [isPending, startTransition] = useTransition()

  const { shipping } = bundle
  const isShipped = bundle.isAllShipped
  const totalWithFee = bundle.totalAmount + shippingFee

  // 物流方式改變時自動計算固定運費（賣貨便 38 / 自取 0）
  useEffect(() => {
    if (shippingMethod === 'pickup') setShippingFee(0)
    else if (shippingMethod === 'maihuobian') setShippingFee(38)
  }, [shippingMethod])

  // 展開且尚未有物流/付款方式時，自動帶入顧客的預設收件資料
  useEffect(() => {
    if (!expanded) return
    if (isShipped) return
    if (profileFetchedRef.current) return
    if (bundle.shipping?.shipping_method && bundle.shipping?.payment_method) return

    profileFetchedRef.current = true
    fetch(`/api/admin/members/${bundle.memberId}/default-shipping`)
      .then((r) => r.json())
      .then(
        ({
          data,
        }: {
          data: { shipping_method: ShippingMethod; payment_method: PaymentMethod } | null
        }) => {
          if (data) {
            setShippingMethod(data.shipping_method)
            setPaymentMethod(data.payment_method)
          }
        }
      )
      .catch(() => {
        /* 靜默失敗，保持預設值 */
      })
  }, [expanded, isShipped, bundle.memberId, bundle.shipping])

  function handleConfirmShip() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/orders/batch', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderIds: bundle.orderIds,
            status: 'shipped',
            shipping_vendor: shippingVendor,
            shipping_method: shippingMethod,
            payment_method: paymentMethod,
            ...(shippingNumber.trim() ? { shipping_number: shippingNumber.trim() } : {}),
          }),
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
    const lines: string[] = []

    // 標題
    lines.push(`【${bundle.memberName} 結單明細】`)
    lines.push('')

    // 依訂單條列商品
    for (const order of bundle.allOrders) {
      lines.push(`▍${shortId(order.id)}`)
      for (const item of order.items) {
        const specStr = item.variant_specs ? `・${specLabel(item.variant_specs)}` : ''
        const itemTotal = item.unit_price * item.quantity
        lines.push(
          `  ${item.product_name}${specStr}  ×${item.quantity}  NT$ ${itemTotal.toLocaleString()}`
        )
      }
    }

    // 費用小計
    lines.push('')
    lines.push('──────────────────')
    lines.push(`商品小計：NT$ ${bundle.totalAmount.toLocaleString()}`)
    if (shippingMethod === 'pickup') {
      lines.push('運費：免運（自取）')
    } else {
      lines.push(`運費（${SHIPPING_METHOD_LABELS[shippingMethod]}）：NT$ ${shippingFee}`)
    }
    lines.push(`總計：NT$ ${totalWithFee.toLocaleString()}`)
    lines.push('──────────────────')

    // 收件資訊
    if (shipping?.recipient_name) lines.push(`收件人：${shipping.recipient_name}`)
    if (shipping?.recipient_phone) lines.push(`手機：${shipping.recipient_phone}`)
    lines.push(`物流：${SHIPPING_METHOD_LABELS[shippingMethod]}`)
    if (shipping?.store_name) lines.push(`超商：${shipping.store_name}`)
    if (shipping?.recipient_address) lines.push(`地址：${shipping.recipient_address}`)
    lines.push(`付款：${PAYMENT_METHOD_LABELS[paymentMethod]}`)
    if (shipping?.note) lines.push(`備註：${shipping.note}`)

    await navigator.clipboard.writeText(lines.join('\n'))
    toastFn('已複製結單明細', 'success')
  }

  return (
    <div
      className={`rounded-xl border transition ${isSelected ? 'border-secondary bg-secondary/5' : 'border-line bg-surface'}`}
    >
      {/* Bundle 摘要列（點擊展開）*/}
      <div
        className='flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-ink-50 transition rounded-xl select-none'
        onClick={() => setExpanded((e) => !e)}
      >
        {/* 批次選取 checkbox */}
        {!isShipped && (
          <input
            type='checkbox'
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation()
              onToggleSelect()
            }}
            className='w-4 h-4 rounded accent-secondary cursor-pointer shrink-0'
          />
        )}

        {/* 商品摘要 */}
        <div className='flex-1 min-w-0'>
          <div className='font-mono text-[10px] text-fg-subtle flex items-center gap-1.5 flex-wrap'>
            <span>
              {isShipped ? '出貨' : '結單'} {formatDate(bundle.latestAt)}
            </span>
            <span className='opacity-40'>·</span>
            <span className='opacity-70'>{bundle.orderIds.map(shortId).join(' · ')}</span>
          </div>
          <div className='text-sm font-semibold text-fg mt-1 truncate'>
            {bundle.allOrders
              .flatMap((o) => o.items)
              .map(
                (item) =>
                  `${item.product_name}${item.variant_specs ? `・${specLabel(item.variant_specs)}` : ''} × ${item.quantity}`
              )
              .join('、')}
          </div>
        </div>

        <div className='text-right shrink-0'>
          <div className='font-mono text-sm font-semibold'>
            NT$ {bundle.totalAmount.toLocaleString()}
          </div>
          <OrderStatusBadge status={isShipped ? 'shipped' : 'settled'} />
        </div>

        <svg
          width='14'
          height='14'
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

      {/* 展開：商品明細 + 收件資訊 + 出貨表單 */}
      {expanded && (
        <div className='border-t border-line px-4 pb-4 pt-3 space-y-3 bg-sunken rounded-b-xl'>
          {/* 商品明細（條列式）+ 複製按鈕 */}
          <div>
            <div className='flex items-center justify-between mb-2'>
              <h4 className='font-display font-semibold text-xs text-fg'>商品明細</h4>
              <button
                type='button'
                onClick={handleCopy}
                className='inline-flex items-center gap-1 h-6 px-2.5 rounded-pill border border-line bg-surface text-[10px] font-display font-semibold text-fg-muted hover:bg-ink-100 transition'
              >
                複製結單通知
              </button>
            </div>
            <div className='space-y-2'>
              {bundle.allOrders.map((order) => (
                <div key={order.id}>
                  <div className='font-mono text-[10px] text-fg-subtle mb-1 font-semibold'>
                    {shortId(order.id)}
                  </div>
                  <div className='space-y-0.5 pl-2'>
                    {order.items.map((item) => {
                      const specStr = item.variant_specs ? `・${specLabel(item.variant_specs)}` : ''
                      const itemTotal = item.unit_price * item.quantity
                      return (
                        <div key={item.id} className='flex items-center justify-between text-sm'>
                          <span className='text-fg truncate mr-4'>
                            {item.product_name}
                            {specStr}
                            <span className='text-fg-muted ml-1'>×{item.quantity}</span>
                          </span>
                          <span className='font-mono text-fg shrink-0'>
                            NT$ {itemTotal.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {/* 小計 */}
              <div className='border-t border-line pt-2 flex items-center justify-between text-sm font-semibold'>
                <span className='text-fg-muted'>商品小計</span>
                <span className='font-mono'>NT$ {bundle.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 收件資訊（有才顯示）*/}
          {shipping &&
            (shipping.recipient_name ||
              shipping.recipient_phone ||
              shipping.store_name ||
              shipping.recipient_address) && (
              <div className='border-t border-line pt-3'>
                <h4 className='font-display font-semibold text-xs text-fg mb-2'>收件資訊</h4>
                <div className='grid grid-cols-2 gap-x-6 gap-y-2 text-sm'>
                  <div>
                    <div className='text-fg-subtle text-[11px]'>物流方式</div>
                    <div
                      className={!shipping.shipping_method ? 'text-fg-subtle italic' : 'text-fg'}
                    >
                      {labelOrDash(SHIPPING_METHOD_LABELS, shipping.shipping_method)}
                    </div>
                  </div>
                  <div>
                    <div className='text-fg-subtle text-[11px]'>付款方式</div>
                    <div className={!shipping.payment_method ? 'text-fg-subtle italic' : 'text-fg'}>
                      {labelOrDash(PAYMENT_METHOD_LABELS, shipping.payment_method)}
                    </div>
                  </div>
                  {shipping.recipient_name && (
                    <div>
                      <div className='text-fg-subtle text-[11px]'>收件人</div>
                      <div className='text-fg'>{shipping.recipient_name}</div>
                    </div>
                  )}
                  {shipping.recipient_phone && (
                    <div>
                      <div className='text-fg-subtle text-[11px]'>手機</div>
                      <div className='font-mono text-fg'>{shipping.recipient_phone}</div>
                    </div>
                  )}
                  {shipping.store_name && (
                    <div className='col-span-2'>
                      <div className='text-fg-subtle text-[11px]'>超商門市</div>
                      <div className='text-fg'>{shipping.store_name}</div>
                    </div>
                  )}
                  {shipping.recipient_address && (
                    <div className='col-span-2'>
                      <div className='text-fg-subtle text-[11px]'>地址</div>
                      <div className='text-fg'>{shipping.recipient_address}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* 已出貨：唯讀物流資訊 */}
          {isShipped && bundle.shippingNumber && (
            <div className='border-t border-line pt-3'>
              <h4 className='font-display font-semibold text-xs text-fg mb-2'>出貨資訊</h4>
              <div className='grid grid-cols-2 gap-x-6 gap-y-2 text-sm'>
                {bundle.shippingVendor && (
                  <div>
                    <div className='text-fg-subtle text-[11px]'>物流商</div>
                    <div className='text-fg font-medium'>{bundle.shippingVendor}</div>
                  </div>
                )}
                <div>
                  <div className='text-fg-subtle text-[11px]'>物流單號</div>
                  <div className='font-mono text-fg'>{bundle.shippingNumber}</div>
                </div>
              </div>
            </div>
          )}

          {/* 未出貨：填寫出貨表單 */}
          {!isShipped && (
            <div className='border-t border-line pt-3'>
              <h4 className='font-display font-semibold text-xs text-fg mb-3'>填寫出貨資訊</h4>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-fg-subtle text-[11px] mb-1.5'>物流方式</label>
                  <select
                    value={shippingMethod}
                    onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)}
                    className='w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm outline-none focus:border-primary transition'
                  >
                    {SHIPPING_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {SHIPPING_METHOD_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-fg-subtle text-[11px] mb-1.5'>付款方式</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className='w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm outline-none focus:border-primary transition'
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-fg-subtle text-[11px] mb-1.5'>物流商</label>
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
                  <label className='block text-fg-subtle text-[11px] mb-1.5'>
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

                {/* 運費欄位：超商/宅配需手動輸入，其他自動 */}
                <div className='col-span-2'>
                  <label className='block text-fg-subtle text-[11px] mb-1.5'>運費</label>
                  {shippingMethod === 'pickup' ? (
                    <div className='h-9 px-3 rounded-lg border border-line bg-ink-50 text-sm text-fg-muted flex items-center'>
                      免運（自取）
                    </div>
                  ) : shippingMethod === 'maihuobian' ? (
                    <div className='h-9 px-3 rounded-lg border border-line bg-ink-50 text-sm text-fg-muted flex items-center'>
                      NT$ 38（賣貨便固定）
                    </div>
                  ) : (
                    <input
                      type='number'
                      min='0'
                      value={shippingFee}
                      onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value)))}
                      placeholder='請輸入運費'
                      className='w-full h-9 px-3 rounded-lg border border-line bg-surface text-sm font-mono outline-none focus:border-primary transition placeholder:text-fg-subtle'
                    />
                  )}
                </div>
              </div>

              {/* 總計預覽 */}
              <div className='mt-3 px-3 py-2.5 rounded-lg bg-primary-bg border border-primary/20 flex items-center justify-between text-sm'>
                <div className='space-y-0.5'>
                  <div className='text-fg-muted text-xs'>
                    商品 NT$ {bundle.totalAmount.toLocaleString()}
                    {shippingFee > 0 && ` + 運費 NT$ ${shippingFee}`}
                  </div>
                  <div className='font-display font-bold text-primary'>
                    總計 NT$ {totalWithFee.toLocaleString()}
                  </div>
                </div>
                <button
                  type='button'
                  disabled={isPending}
                  onClick={handleConfirmShip}
                  className='h-9 px-5 rounded-pill bg-primary text-white font-display font-semibold text-sm shadow-pink hover:bg-primary-hv transition disabled:opacity-50 shrink-0'
                >
                  {isPending ? '處理中…' : '確認出貨'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 批次出貨 Bar ──────────────────────────────────────────────────────────────

interface BatchShipBarProps {
  selectedBundleIds: Set<string>
  allSelectedOrderIds: string[]
  selectedBundlesTotal: number
  onClear: () => void
  onSuccess: () => void
  toastFn: (msg: string, type: 'success' | 'error') => void
}

function BatchShipBar({
  selectedBundleIds,
  allSelectedOrderIds,
  selectedBundlesTotal,
  onClear,
  onSuccess,
  toastFn,
}: BatchShipBarProps) {
  const [showForm, setShowForm] = useState(false)
  const [shippingVendor, setShippingVendor] = useState<ShippingVendor>('7-11')
  const [shippingNumber, setShippingNumber] = useState('')
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('convenience')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer')
  const [shippingFee, setShippingFee] = useState<number>(0)
  const [isPending, startTransition] = useTransition()

  const totalWithFee = selectedBundlesTotal + shippingFee

  useEffect(() => {
    if (shippingMethod === 'pickup') setShippingFee(0)
    else if (shippingMethod === 'maihuobian') setShippingFee(38)
  }, [shippingMethod])

  function handleConfirm() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/orders/batch', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderIds: allSelectedOrderIds,
            status: 'shipped',
            shipping_vendor: shippingVendor,
            shipping_method: shippingMethod,
            payment_method: paymentMethod,
            ...(shippingNumber.trim() ? { shipping_number: shippingNumber.trim() } : {}),
          }),
        })
        const json = (await res.json()) as { success?: boolean; error?: string; updated?: number }
        if (json.success) {
          toastFn(`已批次確認出貨 ${selectedBundleIds.size} 筆結單`, 'success')
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
        <div className='flex items-center gap-3 px-5 py-3'>
          <span className='font-display font-bold text-sm'>
            已選 {selectedBundleIds.size} 筆結單
          </span>
          <div className='flex-1' />
          <button
            type='button'
            onClick={onClear}
            className='h-8 px-3 rounded-pill bg-white/10 hover:bg-white/20 font-display font-semibold text-xs transition'
          >
            取消
          </button>
          <button
            type='button'
            onClick={() => setShowForm((f) => !f)}
            className='h-8 px-4 rounded-pill bg-primary text-white font-display font-semibold text-xs shadow-pink hover:bg-primary-hv transition'
          >
            合併出貨
          </button>
        </div>

        {showForm && (
          <div className='border-t border-white/15 px-5 py-4 space-y-3'>
            <p className='text-xs text-white/70'>
              共 {selectedBundleIds.size} 筆結單（{allSelectedOrderIds.length}{' '}
              件），使用同一組物流資訊出貨
            </p>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label className='block text-white/70 text-[11px] mb-1'>物流方式</label>
                <select
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)}
                  className='w-full h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-primary transition'
                >
                  {SHIPPING_METHODS.map((m) => (
                    <option key={m} value={m} className='text-fg'>
                      {SHIPPING_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='block text-white/70 text-[11px] mb-1'>付款方式</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className='w-full h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-primary transition'
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m} className='text-fg'>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
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
                  value={shippingNumber}
                  onChange={(e) => setShippingNumber(e.target.value)}
                  placeholder='例：12345678901'
                  className='w-full h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-mono outline-none focus:border-primary transition placeholder:text-white/30'
                />
              </div>

              {/* 運費 */}
              <div className='col-span-2'>
                <label className='block text-white/70 text-[11px] mb-1'>運費</label>
                {shippingMethod === 'pickup' ? (
                  <div className='h-9 px-3 rounded-lg bg-white/5 border border-white/20 text-white/50 text-sm flex items-center'>
                    免運（自取）
                  </div>
                ) : shippingMethod === 'maihuobian' ? (
                  <div className='h-9 px-3 rounded-lg bg-white/5 border border-white/20 text-white/70 text-sm flex items-center'>
                    NT$ 38（賣貨便固定）
                  </div>
                ) : (
                  <input
                    type='number'
                    min='0'
                    value={shippingFee}
                    onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value)))}
                    placeholder='請輸入運費'
                    className='w-full h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-mono outline-none focus:border-primary transition placeholder:text-white/30'
                  />
                )}
              </div>
            </div>

            {/* 總計 */}
            <div className='flex items-center justify-between text-xs text-white/60 px-1'>
              <span>
                商品 NT$ {selectedBundlesTotal.toLocaleString()}
                {shippingFee > 0 && ` + 運費 NT$ ${shippingFee}`}
              </span>
              <span className='font-bold text-white text-sm'>
                總計 NT$ {totalWithFee.toLocaleString()}
              </span>
            </div>

            <button
              type='button'
              disabled={isPending}
              onClick={handleConfirm}
              className='w-full h-10 rounded-pill bg-primary text-white font-display font-bold text-sm shadow-pink hover:bg-primary-hv transition disabled:opacity-50'
            >
              {isPending ? '處理中…' : `確認合併出貨 ${selectedBundleIds.size} 筆`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

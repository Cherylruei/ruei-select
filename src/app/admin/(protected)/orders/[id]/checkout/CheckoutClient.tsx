'use client'

import Link from 'next/link'
import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminOrder } from '@/types'
import { ToastContainer, useToast } from '@/components/ui/Toast'

// ── 型別 ───────────────────────────────────────────────────────────────────────

type ShippingMethod = 'pickup' | 'convenience' | 'maihuobian' | 'home_delivery'
type PaymentMethod = 'cash' | 'transfer' | 'cod'

// ── 常數 ───────────────────────────────────────────────────────────────────────

const SHIPPING_OPTIONS: {
  key: ShippingMethod
  label: string
  desc: string
  fee: string
  icon: React.ReactNode
}[] = [
  {
    key: 'pickup',
    label: '自取',
    desc: '約定時間到店面交',
    fee: '免運',
    icon: (
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      >
        <path d='M5 11h14M7 11V8a2 2 0 012-2h6a2 2 0 012 2v3M6 11l1 9h10l1-9' />
      </svg>
    ),
  },
  {
    key: 'convenience',
    label: '超商店到店',
    desc: '僅 7-11・匯款',
    fee: '+ NT$ 60',
    icon: (
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      >
        <rect x='4' y='7' width='16' height='13' rx='1.5' />
        <path d='M4 11h16M9 7V5h6v2' />
      </svg>
    ),
  },
  {
    key: 'maihuobian',
    label: '賣貨便',
    desc: '7-11 店到店・貨到付款',
    fee: '+ NT$ 38',
    icon: (
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      >
        <path d='M4 8h16l-2 12H6L4 8z' />
        <path d='M9 8V6a3 3 0 016 0v2' />
        <circle cx='12' cy='14' r='1.4' fill='currentColor' />
      </svg>
    ),
  },
  {
    key: 'home_delivery',
    label: '宅配',
    desc: '黑貓/郵局到府',
    fee: '粗估 NT$ 210',
    icon: (
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
      >
        <rect x='3' y='9' width='13' height='9' rx='1' />
        <path d='M16 12h3l2 3v3h-5' />
        <circle cx='7' cy='19' r='2' />
        <circle cx='17' cy='19' r='2' />
      </svg>
    ),
  },
]

const PAYMENT_BY_SHIPPING: Record<ShippingMethod, { key: PaymentMethod; label: string }[]> = {
  pickup: [{ key: 'cash', label: '現金自取' }],
  convenience: [{ key: 'transfer', label: '匯款' }],
  maihuobian: [{ key: 'cod', label: '賣貨便貨到付款' }],
  home_delivery: [{ key: 'transfer', label: '匯款' }],
}

// ── 工具 ───────────────────────────────────────────────────────────────────────

function shortId(id: string) {
  return 'RS-' + id.replace(/-/g, '').slice(0, 6).toUpperCase()
}

function specLabel(specs: Record<string, string> | null): string {
  if (!specs) return ''
  return Object.values(specs).join(' / ')
}

function avatarBg(name: string): string {
  const colors = ['bg-sakura-300', 'bg-forest-400', 'bg-earth-400', 'bg-info', 'bg-sakura-400']
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

const FLD =
  'w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition placeholder:text-fg-subtle'

// ── 主元件 ─────────────────────────────────────────────────────────────────────

export default function CheckoutClient({ params }: { params: Promise<{ id: string }> }) {
  const { id: orderId } = use(params)
  const router = useRouter()
  const { toasts, toast, dismiss } = useToast()

  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 表單狀態
  const [shipping, setShipping] = useState<ShippingMethod>('pickup')
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [storeName, setStoreName] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 切換物流時重設付款方式
  const changeShipping = (method: ShippingMethod) => {
    setShipping(method)
    setPayment(PAYMENT_BY_SHIPPING[method][0].key)
    setErrors({})
  }

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
    fetchOrder()
  }, [fetchOrder])

  // 驗證
  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    const phoneRe = /^09\d{8}$/

    if (shipping === 'convenience' || shipping === 'maihuobian') {
      if (!recipientName.trim()) errs.recipientName = '請填寫收件人姓名'
      if (!recipientPhone.trim()) errs.recipientPhone = '請填寫手機號碼'
      else if (!phoneRe.test(recipientPhone.trim()))
        errs.recipientPhone = '手機格式不正確（09xxxxxxxx）'
      if (!storeName.trim()) errs.storeName = '請填寫超商門市名稱'
    }
    if (shipping === 'home_delivery') {
      if (!recipientName.trim()) errs.recipientName = '請填寫收件人姓名'
      if (!recipientPhone.trim()) errs.recipientPhone = '請填寫手機號碼'
      else if (!phoneRe.test(recipientPhone.trim()))
        errs.recipientPhone = '手機格式不正確（09xxxxxxxx）'
      if (!recipientAddress.trim()) errs.recipientAddress = '請填寫收件地址'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const isValid = (): boolean => {
    const phoneRe = /^09\d{8}$/
    if (shipping === 'convenience' || shipping === 'maihuobian') {
      return (
        recipientName.trim() !== '' &&
        phoneRe.test(recipientPhone.trim()) &&
        storeName.trim() !== ''
      )
    }
    if (shipping === 'home_delivery') {
      return (
        recipientName.trim() !== '' &&
        phoneRe.test(recipientPhone.trim()) &&
        recipientAddress.trim() !== ''
      )
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validate() || !isValid()) return
    setSubmitting(true)
    try {
      const body = {
        shipping_method: shipping,
        payment_method: payment,
        recipient_name: recipientName.trim() || undefined,
        recipient_phone: recipientPhone.trim() || undefined,
        recipient_address: recipientAddress.trim() || undefined,
        store_name: storeName.trim() || undefined,
        note: note.trim() || undefined,
      }
      const res = await fetch(`/api/admin/orders/${orderId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (json.success) {
        toast('已代顧客完成結單', 'success')
        setTimeout(() => router.push('/admin/orders'), 1000)
      } else {
        toast(json.error ?? '結單失敗，請重試', 'error')
      }
    } catch {
      toast('結單失敗，請重試', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <CheckoutSkeleton />

  if (!order) {
    return (
      <div className='px-8 pt-8 max-w-xl'>
        <p className='text-fg-muted'>找不到此訂單。</p>
        <Link href='/admin/orders' className='text-primary text-sm mt-2 inline-block'>
          ← 返回訂單列表
        </Link>
      </div>
    )
  }

  if (order.status !== 'allocated') {
    return (
      <div className='px-8 pt-8 max-w-xl'>
        <div className='rounded-xl bg-warning-bg border border-warning/30 p-5'>
          <p className='font-display font-bold text-warning'>此訂單目前狀態為「{order.status}」</p>
          <p className='text-sm text-fg-muted mt-1'>只有「已配單」狀態的訂單才能進行代客結單。</p>
          <Link href='/admin/orders' className='text-primary text-sm mt-3 inline-block'>
            ← 返回訂單列表
          </Link>
        </div>
      </div>
    )
  }

  const subtotal = order.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const shippingFee =
    shipping === 'home_delivery'
      ? 210
      : shipping === 'convenience'
        ? 60
        : shipping === 'maihuobian'
          ? 38
          : 0
  const total = subtotal + shippingFee
  const bgColor = avatarBg(order.member_name)
  const paymentOptions = PAYMENT_BY_SHIPPING[shipping]

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── 結單對象提示卡 ─────────────────────────────────────────── */}
      <div className='px-8 pt-6'>
        <div
          className='rounded-xl bg-primary-bg p-4 flex items-center gap-4'
          style={{ border: '1px solid var(--c-primary)' }}
        >
          <div
            className={`w-12 h-12 rounded-pill ${bgColor} text-white font-display font-bold flex items-center justify-center shrink-0 select-none`}
          >
            {order.member_name.charAt(0)}
          </div>
          <div className='flex-1 leading-tight'>
            <div
              className='font-mono text-[10px] tracking-[0.2em] uppercase'
              style={{ color: 'var(--c-primary-hv)' }}
            >
              CHECKOUT TARGET
            </div>
            <div
              className='font-display font-bold text-lg mt-0.5'
              style={{ color: 'var(--c-primary-hv)' }}
            >
              正在為 {order.member_name} 代客結單
            </div>
            <div className='font-mono text-[11px] text-fg-muted mt-1'>
              LINE {order.member_line_id}
            </div>
          </div>
          <div className='text-right shrink-0'>
            <div className='font-mono text-[10px] text-fg-subtle tracking-wider uppercase'>
              訂單編號
            </div>
            <div className='font-mono font-semibold text-sm mt-0.5'>{shortId(orderId)}</div>
          </div>
        </div>
      </div>

      {/* ── 主要內容 Grid ────────────────────────────────────────────── */}
      <div className='px-8 pt-6 pb-12 grid grid-cols-3 gap-6 max-w-[1200px]'>
        {/* ── 左欄：表單 ───────────────────────────────────────────── */}
        <div className='col-span-2 space-y-5'>
          {/* Step 1: 待結品項 */}
          <div className='bg-surface border border-line rounded-xl p-6'>
            <div className='flex items-center gap-2 mb-1'>
              <StepBadge n={1} />
              <h3 className='font-display font-bold text-base'>待結品項</h3>
              <span className='inline-flex items-center h-5 px-2 rounded-pill bg-success-bg text-success font-display font-semibold text-[10px] ml-1'>
                已到貨 · {order.items.reduce((s, i) => s + i.quantity, 0)} 件
              </span>
            </div>
            <p className='text-xs text-fg-subtle ml-8 mb-3'>以下為此訂單已到貨的所有商品</p>
            <div className='ml-8 border border-line rounded-md overflow-hidden'>
              <div className='divide-y divide-line'>
                {order.items.map((item) => (
                  <div key={item.id} className='flex items-center gap-3 px-3 py-3'>
                    <div
                      className='w-11 h-11 rounded-md shrink-0 border border-line bg-ink-50'
                      style={{
                        background:
                          'repeating-linear-gradient(135deg,var(--ink-100),var(--ink-100) 5px,var(--ink-50) 5px,var(--ink-50) 10px)',
                      }}
                    />
                    <div className='flex-1 leading-tight min-w-0'>
                      <div className='font-display font-semibold text-sm truncate'>
                        {item.product_name}
                      </div>
                      <div className='flex items-center gap-1.5 mt-0.5'>
                        {item.supplier_name && (
                          <span className='inline-flex items-center h-4 px-1.5 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[9px]'>
                            {item.supplier_name}
                          </span>
                        )}
                        {item.variant_specs && (
                          <span className='font-mono text-[10px] text-fg-subtle'>
                            {specLabel(item.variant_specs)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='text-right shrink-0'>
                      <div className='font-mono text-[10px] text-fg-subtle'>
                        NT$ {item.unit_price.toLocaleString()} × {item.quantity}
                      </div>
                      <div className='font-mono font-bold text-sm'>
                        NT$ {(item.unit_price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className='px-3 py-2 bg-ink-50 border-t border-line flex items-center justify-between'>
                <span className='font-display font-semibold text-xs text-fg-muted'>商品小計</span>
                <span className='font-mono font-bold text-sm'>NT$ {subtotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Step 2: 物流方式 */}
          <div className='bg-surface border border-line rounded-xl p-6'>
            <div className='flex items-center gap-2 mb-1'>
              <StepBadge n={2} />
              <h3 className='font-display font-bold text-base'>
                物流方式 <span className='text-danger'>*</span>
              </h3>
            </div>
            <p className='text-xs text-fg-subtle ml-8 mb-4'>
              與顧客確認後勾選 · 切換時下方收件欄位與付款方式會聯動
            </p>

            <div className='ml-8 grid grid-cols-2 gap-3 max-w-2xl'>
              {SHIPPING_OPTIONS.map((opt) => {
                const isSelected = shipping === opt.key
                return (
                  <button
                    key={opt.key}
                    type='button'
                    onClick={() => changeShipping(opt.key)}
                    className={[
                      'relative p-4 rounded-xl border-[1.5px] text-left transition flex flex-col gap-2.5 min-h-[110px]',
                      isSelected
                        ? 'border-primary bg-primary-bg shadow-[0_8px_18px_-8px_rgba(255,110,148,0.35),0_0_0_1px_var(--c-primary)]'
                        : 'border-line bg-surface hover:border-line-strong',
                    ].join(' ')}
                  >
                    {isSelected && (
                      <span className='absolute top-2.5 right-2.5 w-5 h-5 rounded-pill bg-primary flex items-center justify-center'>
                        <svg
                          width='11'
                          height='11'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='white'
                          strokeWidth='3'
                          strokeLinecap='round'
                        >
                          <path d='M5 12l4 4 10-10' />
                        </svg>
                      </span>
                    )}
                    <div className='flex items-center justify-between'>
                      <div
                        className={[
                          'w-9 h-9 rounded-lg flex items-center justify-center transition',
                          isSelected ? 'bg-primary text-white' : 'bg-sunken text-fg-muted',
                        ].join(' ')}
                      >
                        {opt.icon}
                      </div>
                      <span
                        className={[
                          'font-mono text-xs font-semibold',
                          opt.key === 'pickup'
                            ? 'text-success'
                            : isSelected
                              ? 'text-primary-hv'
                              : 'text-fg-muted',
                        ].join(' ')}
                      >
                        {opt.fee}
                      </span>
                    </div>
                    <div>
                      <div className='font-display font-bold text-sm'>{opt.label}</div>
                      <div className='text-[11px] text-fg-muted leading-snug mt-0.5'>
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step 3: 收件資訊（依物流顯示） */}
          {shipping !== 'pickup' && (
            <div className='bg-surface border border-line rounded-xl p-6'>
              <div className='flex items-center gap-2 mb-3'>
                <StepBadge n={3} />
                <h3 className='font-display font-bold text-base'>
                  收件資訊 <span className='text-danger'>*</span>
                </h3>
              </div>

              <div className='ml-8 space-y-4 max-w-md'>
                <div>
                  <label className='block text-sm font-semibold mb-1.5'>
                    收件人姓名 <span className='text-danger'>*</span>
                  </label>
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder='收件人真實姓名'
                    className={FLD}
                  />
                  {errors.recipientName && (
                    <p className='text-xs text-danger mt-1'>{errors.recipientName}</p>
                  )}
                </div>

                <div>
                  <label className='block text-sm font-semibold mb-1.5'>
                    手機號碼 <span className='text-danger'>*</span>
                  </label>
                  <input
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder='09xxxxxxxx'
                    maxLength={10}
                    className={FLD}
                  />
                  {errors.recipientPhone && (
                    <p className='text-xs text-danger mt-1'>{errors.recipientPhone}</p>
                  )}
                </div>

                {(shipping === 'convenience' || shipping === 'maihuobian') && (
                  <div>
                    <label className='block text-sm font-semibold mb-1.5'>
                      超商門市名稱 <span className='text-danger'>*</span>
                    </label>
                    <input
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder={
                        shipping === 'convenience' ? '例：7-11 信義門市' : '例：7-11 大安門市'
                      }
                      className={FLD}
                    />
                    {errors.storeName && (
                      <p className='text-xs text-danger mt-1'>{errors.storeName}</p>
                    )}
                  </div>
                )}

                {shipping === 'home_delivery' && (
                  <div>
                    <label className='block text-sm font-semibold mb-1.5'>
                      收件地址 <span className='text-danger'>*</span>
                    </label>
                    <input
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      placeholder='縣市 + 鄉鎮區 + 路段門號'
                      className={FLD}
                    />
                    {errors.recipientAddress && (
                      <p className='text-xs text-danger mt-1'>{errors.recipientAddress}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: 付款方式（自取為 Step 3） */}
          <div className='bg-surface border border-line rounded-xl p-6'>
            <div className='flex items-center gap-2 mb-3'>
              <StepBadge n={shipping !== 'pickup' ? 4 : 3} />
              <h3 className='font-display font-bold text-base'>
                付款方式 <span className='text-danger'>*</span>
              </h3>
            </div>
            <p className='text-xs text-fg-subtle ml-8 mb-4'>付款方式依物流方式聯動，已自動帶入</p>
            <div className='ml-8 space-y-2 max-w-md'>
              {paymentOptions.map((opt) => {
                const isSelected = payment === opt.key
                return (
                  <div
                    key={opt.key}
                    className={[
                      'flex items-center gap-3 px-3.5 py-3 rounded-lg border-[1.5px] transition',
                      isSelected ? 'border-primary bg-primary-bg' : 'border-line bg-surface',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'w-[18px] h-[18px] rounded-pill border-2 flex-shrink-0 relative',
                        isSelected ? 'border-primary' : 'border-line-strong',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <div className='absolute inset-[3px] rounded-pill bg-primary' />
                      )}
                    </div>
                    <span className='font-display font-semibold text-sm'>{opt.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 備註（選填） */}
          <div className='bg-surface border border-line rounded-xl p-6'>
            <h3 className='font-display font-bold text-base mb-3'>內部備註（選填）</h3>
            <div className='max-w-md'>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder='商家內部備註，顧客不可見'
                className={`${FLD} resize-y`}
              />
            </div>
          </div>
        </div>

        {/* ── 右欄：訂單摘要 + 確認按鈕 ─────────────────────────── */}
        <div className='col-span-1'>
          <div className='sticky top-28 bg-surface border border-line rounded-xl overflow-hidden shadow-sm'>
            <div className='px-5 py-4 border-b border-line bg-primary-bg'>
              <div
                className='font-mono text-[10px] tracking-[0.2em] uppercase'
                style={{ color: 'var(--c-primary-hv)' }}
              >
                結單摘要
              </div>
              <div
                className='font-display font-bold text-lg mt-0.5'
                style={{ color: 'var(--c-primary-hv)' }}
              >
                {order.member_name}
              </div>
            </div>

            <div className='p-5 space-y-3 text-sm'>
              {/* 商品 */}
              <div className='space-y-1.5'>
                {order.items.map((item) => (
                  <div key={item.id} className='flex justify-between items-center gap-2'>
                    <span className='text-fg-muted truncate flex-1'>
                      {item.product_name}
                      {item.variant_specs && `・${specLabel(item.variant_specs)}`}
                    </span>
                    <span className='font-mono text-fg shrink-0'>
                      NT$ {(item.unit_price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* 費用明細 */}
              <div className='pt-3 border-t border-line space-y-1.5'>
                <div className='flex justify-between text-fg-muted'>
                  <span>商品小計</span>
                  <span className='font-mono'>NT$ {subtotal.toLocaleString()}</span>
                </div>
                <div className='flex justify-between text-fg-muted'>
                  <span>運費</span>
                  <span
                    className={['font-mono', shippingFee === 0 ? 'text-success' : ''].join(' ')}
                  >
                    {shippingFee === 0 ? '免運' : `NT$ ${shippingFee}`}
                  </span>
                </div>
                <div className='flex justify-between items-baseline pt-2 mt-1 border-t border-line'>
                  <span className='font-display font-bold'>總計</span>
                  <span className='font-mono font-bold text-xl text-primary'>
                    NT$ {total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 物流 + 付款 */}
              <div className='pt-2 text-xs space-y-1 text-fg-muted'>
                <div className='flex items-center gap-1.5'>
                  <span className='inline-flex items-center h-4 px-1.5 rounded-pill bg-sunken text-fg-muted font-display font-semibold text-[9px]'>
                    物流
                  </span>
                  <span>{SHIPPING_OPTIONS.find((o) => o.key === shipping)?.label}</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  <span className='inline-flex items-center h-4 px-1.5 rounded-pill bg-sunken text-fg-muted font-display font-semibold text-[9px]'>
                    付款
                  </span>
                  <span>{paymentOptions[0].label}</span>
                </div>
              </div>
            </div>

            <div className='px-5 pb-5 pt-0 space-y-2'>
              <button
                type='button'
                disabled={!isValid() || submitting}
                onClick={handleSubmit}
                className='w-full h-11 rounded-pill bg-primary text-white font-display font-bold shadow-pink hover:bg-primary-hv active:scale-[.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {submitting ? (
                  <>
                    <Spinner />
                    結單中…
                  </>
                ) : (
                  '確認代客結單'
                )}
              </button>
              <Link
                href='/admin/orders'
                className='block w-full h-9 rounded-pill text-center text-fg-muted font-display font-semibold text-sm hover:bg-sunken transition leading-9'
              >
                取消
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── 小元件 ────────────────────────────────────────────────────────────────────

function StepBadge({ n }: { n: number }) {
  return (
    <div className='w-6 h-6 rounded-pill bg-primary text-white font-display font-bold text-xs flex items-center justify-center shrink-0'>
      {n}
    </div>
  )
}

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
      aria-hidden='true'
    >
      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
    </svg>
  )
}

function CheckoutSkeleton() {
  return (
    <div className='px-8 pt-6 pb-12 grid grid-cols-3 gap-6 max-w-[1200px] animate-pulse'>
      <div className='col-span-2 space-y-5'>
        {[1, 2, 3].map((i) => (
          <div key={i} className='bg-surface border border-line rounded-xl p-6 space-y-3'>
            <div className='h-4 w-24 bg-ink-200 rounded' />
            <div className='h-10 bg-ink-50 rounded-md' />
          </div>
        ))}
      </div>
      <div className='bg-surface border border-line rounded-xl h-72' />
    </div>
  )
}

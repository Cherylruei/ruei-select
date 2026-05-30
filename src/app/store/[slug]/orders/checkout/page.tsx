'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { initLiff } from '@/lib/line/liff'
import type { CustomerOrder } from '@/types'

type ShippingMethod = 'pickup' | 'cvs' | 'shopee' | 'home'
type PaymentMethod = 'atm' | 'linepay' | 'cod'

const SHIPPING_FEE: Record<ShippingMethod, number> = { pickup: 0, cvs: 60, shopee: 60, home: 210 }
const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  pickup: '自取',
  cvs: '超商店到店',
  shopee: '賣貨便',
  home: '宅配',
}
const CITIES = [
  '台北市',
  '新北市',
  '桃園市',
  '台中市',
  '台南市',
  '高雄市',
  '基隆市',
  '新竹市',
  '嘉義市',
]
const DISTRICTS: Record<string, string[]> = {
  台北市: [
    '中正區',
    '大同區',
    '中山區',
    '松山區',
    '大安區',
    '萬華區',
    '信義區',
    '士林區',
    '北投區',
    '內湖區',
    '南港區',
    '文山區',
  ],
  新北市: [
    '板橋區',
    '三重區',
    '中和區',
    '永和區',
    '新莊區',
    '新店區',
    '土城區',
    '蘆洲區',
    '樹林區',
  ],
  桃園市: ['桃園區', '中壢區', '平鎮區', '八德區', '楊梅區', '蘆竹區'],
  台中市: [
    '中區',
    '東區',
    '西區',
    '南區',
    '北區',
    '西屯區',
    '南屯區',
    '北屯區',
    '豐原區',
    '大里區',
  ],
  台南市: ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區'],
  高雄市: [
    '楠梓區',
    '左營區',
    '鼓山區',
    '三民區',
    '苓雅區',
    '前鎮區',
    '旗津區',
    '小港區',
    '鳳山區',
  ],
}

function calcTotal(order: CustomerOrder) {
  return order.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
}

function formatId(id: string) {
  return `RS-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

const SELECT_ARROW = {
  appearance: 'none' as const,
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A38B7B' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>\")",
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 12px center' as const,
  paddingRight: 30,
}

const FLD =
  'w-full bg-surface text-sm outline-none rounded-xl px-3.5 py-3 transition-colors focus:border-primary'
const FLD_BORDER = { border: '1.5px solid #f0d9cb' }

// ── Sub-components ─────────────────────────────────────────────────────────────

function Lbl({ label, required }: { label: string; required?: boolean }) {
  return (
    <div className='font-display font-bold text-[12.5px] mb-1.5 flex items-center gap-1'>
      {label}
      {required && <span style={{ color: 'var(--c-primary)' }}>*</span>}
    </div>
  )
}

function StepIndicator({ sm }: { sm?: boolean }) {
  const dot = sm ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-sm'
  const txt = sm ? 'text-[11px]' : 'text-sm'
  const line = sm ? 'flex-1' : 'w-16'
  return (
    <div className={`flex items-center gap-2 ${sm ? 'mt-3' : ''}`}>
      <div className='flex items-center gap-1.5'>
        <span
          className={`${dot} rounded-full bg-primary text-white font-display font-bold flex items-center justify-center`}
        >
          1
        </span>
        <span className={`${txt} font-display font-bold`} style={{ color: 'var(--c-primary-hv)' }}>
          填寫資訊
        </span>
      </div>
      <span
        className={`${line} h-px`}
        style={{ background: 'linear-gradient(to right, var(--c-primary), #e6c7b4)' }}
      />
      <div className='flex items-center gap-1.5'>
        <span
          className={`${dot} rounded-full bg-surface text-fg-subtle font-display font-bold flex items-center justify-center`}
          style={{ border: '1px solid #f0d9cb' }}
        >
          2
        </span>
        <span className={`${txt} font-display font-semibold text-fg-subtle`}>確認送出</span>
      </div>
    </div>
  )
}

function RadioCard({
  selected,
  onClick,
  fee,
  label,
  desc,
  icon,
}: {
  selected: boolean
  onClick: () => void
  fee: string
  label: string
  desc: string
  icon: React.ReactNode
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='relative flex flex-col gap-2 p-3.5 rounded-xl cursor-pointer text-left min-h-[116px] transition-all'
      style={
        selected
          ? {
              border: '1.5px solid var(--c-primary)',
              background: 'var(--c-primary-bg)',
              boxShadow: '0 10px 22px -10px rgba(255,110,148,0.5),0 0 0 1px var(--c-primary)',
            }
          : { border: '1.5px solid #f0d9cb', background: 'var(--bg-surface)' }
      }
    >
      {selected && (
        <span className='absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center'>
          <svg
            width='11'
            height='11'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='3'
            strokeLinecap='round'
          >
            <path d='M5 12l4 4 10-10' />
          </svg>
        </span>
      )}
      <div className='flex items-center justify-between'>
        <div
          className='w-[34px] h-[34px] rounded-full flex items-center justify-center transition-all'
          style={{
            background: selected ? 'var(--c-primary)' : '#fbf2ea',
            color: selected ? '#fff' : 'var(--fg-muted)',
          }}
        >
          {icon}
        </div>
        <span
          className='font-mono text-[10px] font-semibold'
          style={{ color: selected ? 'var(--c-primary-hv)' : 'var(--fg-muted)' }}
        >
          {fee}
        </span>
      </div>
      <div>
        <div className='font-display font-bold text-sm leading-tight'>{label}</div>
        <div className='text-[11px] text-fg-muted leading-snug mt-0.5'>{desc}</div>
      </div>
    </button>
  )
}

function PayBtn({
  selected,
  disabled,
  onClick,
  icon,
  iconColor,
  label,
  sub,
}: {
  selected: boolean
  disabled: boolean
  onClick: () => void
  icon: React.ReactNode
  iconColor: string
  label: string
  sub: string
}) {
  return (
    <button
      type='button'
      disabled={disabled}
      onClick={onClick}
      className='flex items-center gap-3 p-3 rounded-xl w-full text-left transition-all'
      style={{
        border: `1.5px solid ${disabled ? '#f7e5d8' : selected ? 'var(--c-primary)' : '#f0d9cb'}`,
        background: disabled ? '#fbf2ea' : selected ? 'var(--c-primary-bg)' : 'var(--bg-surface)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--fg-subtle)' : undefined,
      }}
    >
      <div
        className='w-[18px] h-[18px] rounded-full border-2 shrink-0 flex items-center justify-center'
        style={{
          borderColor: !disabled && selected ? 'var(--c-primary)' : '#e6c7b4',
          background: '#fff',
        }}
      >
        {!disabled && selected && (
          <div className='w-2.5 h-2.5 rounded-full' style={{ background: 'var(--c-primary)' }} />
        )}
      </div>
      <span
        className='w-8 h-8 lg:w-9 lg:h-9 rounded-md bg-surface flex items-center justify-center shrink-0'
        style={{ border: '1px solid #f0d9cb', color: disabled ? 'var(--fg-subtle)' : iconColor }}
      >
        {icon}
      </span>
      <div className='flex-1 leading-tight min-w-0'>
        <div className='font-display font-bold text-sm'>{label}</div>
        <div className='font-mono text-[10px] text-fg-subtle mt-0.5 truncate'>{sub}</div>
      </div>
      {disabled && (
        <span className='inline-flex items-center h-5 px-2 rounded-full bg-sunken font-mono text-[9px] font-semibold text-fg-subtle tracking-wider shrink-0'>
          不可用
        </span>
      )}
    </button>
  )
}

function ItemsSummary({
  orders,
  subtotal,
  open,
  onToggle,
  slug,
}: {
  orders: CustomerOrder[]
  subtotal: number
  open: boolean
  onToggle: () => void
  slug: string
}) {
  return (
    <div
      className='rounded-xl bg-surface shadow-sm overflow-hidden'
      style={{ border: '1px solid #f0d9cb' }}
    >
      <button
        type='button'
        onClick={onToggle}
        className='w-full flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4 text-left'
      >
        <div className='flex items-center gap-2.5 lg:gap-3'>
          <span
            className='w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-primary-bg flex items-center justify-center'
            style={{ color: 'var(--c-primary-hv)' }}
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
            >
              <path d='M5 8h14l-1 12H6L5 8z' />
              <path d='M9 8V6a3 3 0 016 0v2' />
            </svg>
          </span>
          <div>
            <div className='font-display font-bold text-sm leading-tight'>
              {orders.length} 件商品結單
            </div>
            <div className='font-mono text-[10px] text-fg-subtle mt-0.5'>
              {orders
                .slice(0, 3)
                .map((o) => formatId(o.id))
                .join(' · ')}
              <span className='hidden lg:inline'> · 商品小計 NT$ {subtotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div className='flex items-center gap-2 lg:gap-3'>
          <Link
            href={`/store/${slug}/orders`}
            onClick={(e) => e.stopPropagation()}
            className='hidden lg:block font-display font-semibold text-xs text-fg-muted hover:text-fg'
          >
            修改選取
          </Link>
          <span className='font-mono font-bold text-base lg:hidden' style={{ color: '#d94466' }}>
            NT$ {subtotal.toLocaleString()}
          </span>
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.2'
            strokeLinecap='round'
            className='text-fg-muted transition-transform'
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          >
            <path d='M6 9l6 6 6-6' />
          </svg>
        </div>
      </button>

      {open && (
        <div className='border-t' style={{ borderColor: '#f7e5d8' }}>
          {/* Mobile: vertical list */}
          <div className='lg:hidden'>
            {orders.map((order, idx) => {
              const item = order.items[0]
              if (!item) return null
              const specs = item.variant ? Object.values(item.variant.specs) : []
              return (
                <div
                  key={order.id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${idx < orders.length - 1 ? 'border-b' : ''}`}
                  style={idx < orders.length - 1 ? { borderColor: '#f7e5d8' } : undefined}
                >
                  <div
                    className='w-10 h-10 rounded-md overflow-hidden bg-sunken shrink-0 relative'
                    style={{ border: '1px solid #f0d9cb' }}
                  >
                    {item.product.primaryImage ? (
                      <Image
                        src={item.product.primaryImage}
                        alt={item.product.name}
                        fill
                        className='object-cover'
                        sizes='40px'
                      />
                    ) : (
                      <div
                        className='w-full h-full'
                        style={{
                          background:
                            'repeating-linear-gradient(135deg,#ffe9e0,#ffe9e0 6px,#ffd9e4 6px,#ffd9e4 12px)',
                        }}
                        aria-hidden='true'
                      />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='font-display font-semibold text-sm leading-tight truncate'>
                      {item.product.name}
                    </div>
                    <div className='font-mono text-[10px] text-fg-subtle'>
                      {specs.length > 0 ? `${specs.join(' · ')} · ` : ''}× {item.quantity}
                    </div>
                  </div>
                  <span className='font-mono font-semibold text-sm whitespace-nowrap'>
                    NT$ {(item.quantity * item.unit_price).toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Desktop: 3-col grid */}
          <div
            className='hidden lg:grid'
            style={{ gridTemplateColumns: `repeat(${Math.min(orders.length, 3)}, 1fr)` }}
          >
            {orders.slice(0, 3).map((order, idx) => {
              const item = order.items[0]
              if (!item) return null
              const specs = item.variant ? Object.values(item.variant.specs) : []
              const last = idx === Math.min(orders.length, 3) - 1
              return (
                <div
                  key={order.id}
                  className={`flex items-center gap-3 px-5 py-3 ${!last ? 'border-r' : ''}`}
                  style={!last ? { borderColor: '#f7e5d8' } : undefined}
                >
                  <div
                    className='w-11 h-11 rounded-md overflow-hidden bg-sunken shrink-0 relative'
                    style={{ border: '1px solid #f0d9cb' }}
                  >
                    {item.product.primaryImage ? (
                      <Image
                        src={item.product.primaryImage}
                        alt={item.product.name}
                        fill
                        className='object-cover'
                        sizes='44px'
                      />
                    ) : (
                      <div
                        className='w-full h-full'
                        style={{
                          background:
                            'repeating-linear-gradient(135deg,#ffe9e0,#ffe9e0 8px,#ffd9e4 8px,#ffd9e4 16px)',
                        }}
                        aria-hidden='true'
                      />
                    )}
                  </div>
                  <div className='flex-1 min-w-0 leading-tight'>
                    <div className='font-display font-semibold text-sm truncate'>
                      {item.product.name}
                    </div>
                    <div className='font-mono text-[10px] text-fg-subtle mt-0.5'>
                      {specs.length > 0 ? `${specs.join(' · ')} · ` : ''}× {item.quantity}
                    </div>
                    <div
                      className='font-mono text-xs font-semibold mt-0.5'
                      style={{ color: '#D94466' }}
                    >
                      NT$ {(item.quantity * item.unit_price).toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ShippingSection({
  method,
  onChange,
}: {
  method: ShippingMethod
  onChange: (m: ShippingMethod) => void
}) {
  const opts = [
    {
      key: 'pickup' as const,
      fee: '免運',
      label: '自取',
      desc: '約定時間到店面交',
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
      key: 'cvs' as const,
      fee: 'NT$ 60',
      label: '超商店到店',
      desc: '7-11 店到店',
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
      key: 'shopee' as const,
      fee: 'NT$ 60',
      label: '賣貨便',
      desc: '7-11 店到店',
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
      key: 'home' as const,
      fee: 'NT$ 210',
      label: '宅配',
      desc: '黑貓 1-3 天（粗估）',
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
  return (
    <div
      className='bg-surface rounded-xl shadow-sm p-4 lg:p-6'
      style={{ border: '1px solid #f0d9cb' }}
    >
      <div className='flex items-baseline justify-between mb-1'>
        <div className='flex items-center gap-2'>
          <div className='hidden lg:flex w-7 h-7 rounded-full bg-primary text-white font-display font-bold text-sm items-center justify-center'>
            1
          </div>
          <h2 className='font-display font-bold text-base'>
            物流方式 <span style={{ color: 'var(--c-primary)' }}>*</span>
          </h2>
        </div>
        <span className='font-mono text-[10px] text-fg-subtle tracking-[0.15em] uppercase'>
          SHIPPING
        </span>
      </div>
      <p className='text-xs text-fg-subtle mb-3 lg:mb-4 lg:ml-9'>不同物流影響運費與可用付款方式</p>
      <div className='grid grid-cols-2 gap-2.5 lg:ml-9 lg:grid-cols-4 lg:gap-3'>
        {opts.map((o) => (
          <RadioCard
            key={o.key}
            selected={method === o.key}
            onClick={() => onChange(o.key)}
            fee={o.fee}
            label={o.label}
            desc={o.desc}
            icon={o.icon}
          />
        ))}
      </div>
    </div>
  )
}

function RecipientSection({
  shippingMethod,
  name,
  onName,
  phone,
  onPhone,
  city,
  onCity,
  district,
  onDistrict,
  address,
  onAddress,
  cvsBranch,
  onCvsBranch,
}: {
  shippingMethod: ShippingMethod
  name: string
  onName: (v: string) => void
  phone: string
  onPhone: (v: string) => void
  city: string
  onCity: (v: string) => void
  district: string
  onDistrict: (v: string) => void
  address: string
  onAddress: (v: string) => void
  cvsBranch: string
  onCvsBranch: (v: string) => void
}) {
  const isCvs = shippingMethod === 'cvs' || shippingMethod === 'shopee'
  const isHome = shippingMethod === 'home'
  const districts = DISTRICTS[city] ?? ['第一區', '第二區', '第三區']
  const methodLabel =
    shippingMethod === 'pickup'
      ? '自取'
      : shippingMethod === 'shopee'
        ? '賣貨便取貨'
        : shippingMethod === 'cvs'
          ? '7-11 取貨'
          : '宅配地址'
  return (
    <div
      className='bg-surface rounded-xl shadow-sm p-4 lg:p-6'
      style={{ border: '1px solid #f0d9cb' }}
    >
      <div className='flex items-baseline justify-between mb-1'>
        <div className='flex items-center gap-2'>
          <div className='hidden lg:flex w-7 h-7 rounded-full bg-primary text-white font-display font-bold text-sm items-center justify-center'>
            2
          </div>
          <h2 className='font-display font-bold text-base'>
            收件資訊 <span style={{ color: 'var(--c-primary)' }}>*</span>
          </h2>
          <span className='hidden lg:inline-flex items-center h-5 px-2 rounded-full bg-sunken font-display font-semibold text-[10px] text-fg-subtle ml-1'>
            當前：{methodLabel}
          </span>
        </div>
        <span className='font-mono text-[10px] text-fg-subtle tracking-[0.15em] uppercase'>
          RECIPIENT
        </span>
      </div>
      <p className='text-xs text-fg-subtle mb-3 lg:mb-4 lg:ml-9'>物流方式切換時欄位會聯動</p>
      <div className='space-y-3 lg:ml-9'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          <div>
            <Lbl label='收件人姓名' required />
            <input
              className={FLD}
              style={FLD_BORDER}
              placeholder='請輸入姓名'
              value={name}
              onChange={(e) => onName(e.target.value)}
            />
          </div>
          <div>
            <Lbl label='手機號碼' required />
            <input
              className={FLD}
              style={FLD_BORDER}
              inputMode='tel'
              placeholder='0912-345-678'
              value={phone}
              onChange={(e) => onPhone(e.target.value)}
            />
          </div>
        </div>

        {isHome && (
          <div className='grid grid-cols-[110px_1fr] lg:grid-cols-[140px_180px_1fr] gap-2.5 lg:gap-3'>
            <div>
              <Lbl label='縣市' required />
              <select
                className={FLD}
                style={{ ...FLD_BORDER, ...SELECT_ARROW }}
                value={city}
                onChange={(e) => {
                  onCity(e.target.value)
                  onDistrict((DISTRICTS[e.target.value] ?? ['第一區'])[0])
                }}
              >
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <Lbl label='行政區' required />
              <select
                className={FLD}
                style={{ ...FLD_BORDER, ...SELECT_ARROW }}
                value={district}
                onChange={(e) => onDistrict(e.target.value)}
              >
                {districts.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className='col-span-2 lg:col-span-1'>
              <Lbl label='詳細地址' required />
              <input
                className={FLD}
                style={FLD_BORDER}
                placeholder='路 / 街 / 巷 / 弄 / 號 / 樓'
                value={address}
                onChange={(e) => onAddress(e.target.value)}
              />
            </div>
          </div>
        )}

        {isCvs && (
          <div>
            <Lbl
              label={shippingMethod === 'shopee' ? '取貨門市（賣貨便 · 7-11）' : '取貨門市（7-11）'}
              required
            />
            <input
              className={FLD}
              style={FLD_BORDER}
              placeholder='門市名稱，例：大安復興店'
              value={cvsBranch}
              onChange={(e) => onCvsBranch(e.target.value)}
            />
            <p className='mt-1.5 text-[10px] text-fg-subtle'>請先查詢門市後手動填寫名稱</p>
          </div>
        )}

        {shippingMethod === 'pickup' && (
          <div
            className='px-3 py-2 rounded-md text-xs text-fg-muted'
            style={{ background: '#fbf2ea', border: '1px solid #f2e2d0' }}
          >
            店主確認後會私訊約取貨時間 ✿
          </div>
        )}
      </div>
    </div>
  )
}

function PaymentSection({
  method,
  onChange,
  atmDisabled,
  linepayDisabled,
  codDisabled,
}: {
  method: PaymentMethod
  onChange: (m: PaymentMethod) => void
  atmDisabled: boolean
  linepayDisabled: boolean
  codDisabled: boolean
}) {
  const atmIcon = (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
    >
      <rect x='3' y='6' width='18' height='13' rx='2' />
      <path d='M3 10h18M7 15h3' />
    </svg>
  )
  const codIcon = (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
    >
      <rect x='4' y='7' width='16' height='13' rx='1.5' />
      <path d='M4 11h16M9 7V5h6v2' />
    </svg>
  )
  const lineIcon = (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
      <rect x='3' y='4' width='18' height='16' rx='2' opacity='0.15' />
      <rect
        x='3'
        y='4'
        width='18'
        height='16'
        rx='2'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.6'
      />
      <text
        x='12'
        y='15.5'
        textAnchor='middle'
        fontFamily='system-ui'
        fontWeight='900'
        fontSize='6.5'
        fill='currentColor'
      >
        PAY
      </text>
    </svg>
  )
  return (
    <div
      className='bg-surface rounded-xl shadow-sm p-4 lg:p-6'
      style={{ border: '1px solid #f0d9cb' }}
    >
      <div className='flex items-baseline justify-between mb-1'>
        <div className='flex items-center gap-2'>
          <div className='hidden lg:flex w-7 h-7 rounded-full bg-primary text-white font-display font-bold text-sm items-center justify-center'>
            3
          </div>
          <h2 className='font-display font-bold text-base'>
            付款方式 <span style={{ color: 'var(--c-primary)' }}>*</span>
          </h2>
        </div>
        <span className='font-mono text-[10px] text-fg-subtle tracking-[0.15em] uppercase'>
          PAYMENT
        </span>
      </div>
      <p className='text-xs text-fg-subtle mb-3 lg:ml-9'>
        賣貨便僅限貨到付款 · 超商 / 宅配 / 自取僅限匯款或 LINE Pay
      </p>
      <div
        className='lg:hidden mb-2.5 px-3 py-2 rounded-md flex items-center gap-2'
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
        >
          <circle cx='12' cy='12' r='9' />
          <path d='M12 8v4M12 16h.01' />
        </svg>
        <span className='text-[11px] text-fg-muted leading-snug'>
          賣貨便<b className='text-fg'>僅限貨到付款</b>；超商 / 宅配 / 自取只能
          <b className='text-fg'>匯款或 LINE Pay</b>
        </span>
      </div>
      <div className='space-y-2 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-3 lg:ml-9'>
        <PayBtn
          selected={method === 'atm'}
          disabled={atmDisabled}
          onClick={() => !atmDisabled && onChange('atm')}
          icon={atmIcon}
          iconColor='var(--c-primary-hv)'
          label='匯款 / ATM 轉帳'
          sub='玉山銀行 808 · 末五碼對帳'
        />
        <PayBtn
          selected={method === 'linepay'}
          disabled={linepayDisabled}
          onClick={() => !linepayDisabled && onChange('linepay')}
          icon={lineIcon}
          iconColor='#00b900'
          label='LINE Pay'
          sub='即時付款'
        />
        <PayBtn
          selected={method === 'cod'}
          disabled={codDisabled}
          onClick={() => !codDisabled && onChange('cod')}
          icon={codIcon}
          iconColor='inherit'
          label='貨到付款'
          sub={!codDisabled ? '到貨時現場付款' : '僅限賣貨便'}
        />
      </div>
    </div>
  )
}

function NoteSection({ note, onChange }: { note: string; onChange: (v: string) => void }) {
  return (
    <div
      className='bg-surface rounded-xl shadow-sm p-4 lg:p-6'
      style={{ border: '1px solid #f0d9cb' }}
    >
      <div className='flex items-baseline justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <div className='hidden lg:flex w-7 h-7 rounded-full bg-primary text-white font-display font-bold text-sm items-center justify-center'>
            4
          </div>
          <h2 className='font-display font-bold text-base'>
            訂單備註 <span className='font-body font-normal text-xs text-fg-subtle'>（選填）</span>
          </h2>
        </div>
        <span className='font-mono text-[10px] text-fg-subtle tracking-[0.15em] uppercase'>
          NOTE
        </span>
      </div>
      <div className='lg:ml-9'>
        <textarea
          className='w-full bg-surface text-sm outline-none rounded-xl px-3.5 py-3 resize-y transition-colors focus:border-primary'
          style={FLD_BORDER}
          rows={3}
          placeholder='希望幾號前收到 / 包裝備註 / 給店主的話 ✿'
          value={note}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

function CostCard({
  subtotal,
  shippingFee,
  shippingMethod,
  total,
}: {
  subtotal: number
  shippingFee: number
  shippingMethod: ShippingMethod
  total: number
}) {
  return (
    <div>
      <div className='rounded-xl bg-surface shadow-sm p-4' style={{ border: '1px solid #f0d9cb' }}>
        <div className='flex items-center gap-2 mb-3'>
          <span
            className='w-6 h-6 rounded-full bg-primary-bg flex items-center justify-center'
            style={{ color: 'var(--c-primary-hv)' }}
          >
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
            >
              <path d='M3 6h18M3 12h18M3 18h12' />
            </svg>
          </span>
          <h3 className='font-display font-bold text-sm'>費用明細</h3>
        </div>
        <div className='space-y-1.5 text-sm'>
          <div className='flex justify-between text-fg-muted'>
            <span>商品小計</span>
            <span className='font-mono'>NT$ {subtotal.toLocaleString()}</span>
          </div>
          <div className='flex justify-between text-fg-muted'>
            <span>運費（{SHIPPING_LABEL[shippingMethod]}）</span>
            <span className='font-mono'>+ NT$ {shippingFee.toLocaleString()}</span>
          </div>
          {shippingMethod === 'home' && (
            <p className='text-[10px] text-fg-subtle -mt-0.5'>＊宅配運費為粗估，請與賣家確認</p>
          )}
          <div
            className='border-t pt-2 mt-2 flex justify-between items-baseline'
            style={{ borderColor: '#f7e5d8' }}
          >
            <span className='font-display font-bold'>總計</span>
            <span className='font-mono font-bold text-xl' style={{ color: '#d94466' }}>
              NT$ {total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <p className='mt-3 px-1 text-[11px] text-fg-subtle leading-relaxed'>
        送出後狀態變為「待付款」
        <br />
        店主收到款項 / 確認貨到付款後再安排寄出 ✿
      </p>
    </div>
  )
}

function SummaryAside({
  subtotal,
  shippingFee,
  shippingMethod,
  paymentMethod,
  total,
  city,
  district,
  address,
  slug,
}: {
  subtotal: number
  shippingFee: number
  shippingMethod: ShippingMethod
  paymentMethod: PaymentMethod
  total: number
  city: string
  district: string
  address: string
  slug: string
}) {
  const payLabel =
    paymentMethod === 'atm' ? '匯款 / ATM' : paymentMethod === 'linepay' ? 'Line Pay' : '貨到付款'
  const paySub =
    paymentMethod === 'atm'
      ? '送出後顯示帳號 · 末五碼對帳'
      : paymentMethod === 'linepay'
        ? '即時付款 · 手續費 $0'
        : '到貨時現場付款'
  const addrLine =
    shippingMethod === 'home'
      ? `${city}${district}\n${address || '（尚未填寫）'}`
      : shippingMethod === 'pickup'
        ? '面交取貨'
        : shippingMethod === 'shopee'
          ? '賣貨便取貨（7-11）'
          : '7-11 店到店'
  const shipIcon = (
    <svg
      width='16'
      height='16'
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
  )
  const atmIcon = (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
    >
      <rect x='3' y='6' width='18' height='13' rx='2' />
      <path d='M3 10h18M7 15h3' />
    </svg>
  )
  return (
    <div
      className='rounded-xl bg-surface shadow-sm overflow-hidden'
      style={{ border: '1px solid #f0d9cb' }}
    >
      <div className='px-5 py-4 border-b bg-primary-bg' style={{ borderColor: '#f7e5d8' }}>
        <div
          className='font-mono text-[10px] tracking-[0.2em] uppercase'
          style={{ color: 'var(--c-primary-hv)' }}
        >
          費用明細
        </div>
        <div
          className='font-display font-bold text-lg mt-1 leading-tight'
          style={{ color: 'var(--c-primary-hv)' }}
        >
          應付 NT$ {total.toLocaleString()}
        </div>
      </div>
      <div className='p-5 space-y-3 text-sm'>
        <div className='flex items-start gap-2.5 pb-3 border-b' style={{ borderColor: '#f7e5d8' }}>
          <span
            className='w-9 h-9 rounded-md bg-primary-bg flex items-center justify-center shrink-0'
            style={{ color: 'var(--c-primary-hv)' }}
          >
            {shipIcon}
          </span>
          <div className='flex-1 leading-tight'>
            <div className='text-xs text-fg-subtle'>物流</div>
            <div className='font-semibold'>
              {SHIPPING_LABEL[shippingMethod]} · NT$ {shippingFee.toLocaleString()}
            </div>
            <div className='font-mono text-[10px] text-fg-subtle mt-0.5 whitespace-pre-line'>
              {addrLine}
            </div>
            {shippingMethod === 'home' && (
              <div className='font-mono text-[10px] text-fg-subtle mt-0.5'>
                ＊運費粗估，請與賣家確認
              </div>
            )}
          </div>
        </div>
        <div className='flex items-start gap-2.5 pb-3 border-b' style={{ borderColor: '#f7e5d8' }}>
          <span className='w-9 h-9 rounded-md bg-sunken flex items-center justify-center shrink-0 text-fg-muted'>
            {atmIcon}
          </span>
          <div className='flex-1 leading-tight'>
            <div className='text-xs text-fg-subtle'>付款</div>
            <div className='font-semibold'>{payLabel}</div>
            <div className='font-mono text-[10px] text-fg-subtle mt-0.5'>{paySub}</div>
          </div>
        </div>
        <div className='space-y-1.5'>
          <div className='flex justify-between text-fg-muted'>
            <span>商品小計</span>
            <span className='font-mono'>NT$ {subtotal.toLocaleString()}</span>
          </div>
          <div className='flex justify-between text-fg-muted'>
            <span>運費（{SHIPPING_LABEL[shippingMethod]}）</span>
            <span className='font-mono'>+ NT$ {shippingFee.toLocaleString()}</span>
          </div>
          {shippingMethod === 'home' && (
            <p className='text-[10px] text-fg-subtle -mt-1'>＊宅配運費為粗估，請與賣家確認</p>
          )}
          <div
            className='pt-2 mt-2 border-t flex justify-between items-baseline'
            style={{ borderColor: '#f7e5d8' }}
          >
            <span className='font-display font-bold'>總計</span>
            <span className='font-mono font-bold text-2xl' style={{ color: '#D94466' }}>
              NT$ {total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <div className='p-5 pt-0 space-y-2'>
        <button className='w-full h-12 rounded-full bg-primary text-white font-display font-bold text-sm shadow-pink hover:bg-primary-hv active:scale-[.98] transition flex items-center justify-center gap-1.5'>
          確認送單
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            strokeLinecap='round'
          >
            <path d='M9 6l6 6-6 6' />
          </svg>
        </button>
        <Link
          href={`/store/${slug}/orders`}
          className='block text-center w-full h-9 leading-9 rounded-full font-display font-semibold text-xs text-fg-muted hover:bg-sunken transition'
        >
          返回訂單列表
        </Link>
      </div>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className='px-5 pt-4 space-y-4 pb-36 lg:max-w-[1280px] lg:mx-auto lg:px-8 lg:pt-8 lg:pb-16 lg:grid lg:grid-cols-[1fr_380px] lg:gap-8'>
      <div className='space-y-4'>
        {[80, 220, 200, 160, 120].map((h, i) => (
          <div
            key={i}
            className='rounded-xl bg-surface animate-pulse'
            style={{ height: h, border: '1px solid #f0d9cb' }}
          />
        ))}
      </div>
      <div className='hidden lg:block'>
        <div
          className='rounded-xl bg-surface animate-pulse h-96'
          style={{ border: '1px solid #f0d9cb' }}
        />
      </div>
    </div>
  )
}

// ── Main content ───────────────────────────────────────────────────────────────

function CheckoutContent() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const searchParams = useSearchParams()

  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('home')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('atm')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('台北市')
  const [district, setDistrict] = useState('大安區')
  const [address, setAddress] = useState('')
  const [cvsBranch, setCvsBranch] = useState('')
  const [note, setNote] = useState('')
  const [itemsOpen, setItemsOpen] = useState(true)

  const selectedIds = useMemo(() => {
    const raw = searchParams.get('ids')
    return raw ? new Set(raw.split(',').filter(Boolean)) : null
  }, [searchParams])

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
        const settle = data.orders.filter((o) => o.status === 'allocated' || o.status === 'settled')
        const filtered = selectedIds ? settle.filter((o) => selectedIds.has(o.id)) : settle
        setOrders(filtered)
        setPageState(filtered.length === 0 ? 'error' : 'ready')
      } catch {
        setPageState('error')
      }
    }
    load()
  }, [slug, selectedIds])

  useEffect(() => {
    if (shippingMethod === 'shopee') {
      setPaymentMethod('cod')
    } else if (paymentMethod === 'cod') {
      setPaymentMethod('atm')
    }
  }, [shippingMethod, paymentMethod])

  const subtotal = useMemo(() => orders.reduce((s, o) => s + calcTotal(o), 0), [orders])
  const shippingFee = SHIPPING_FEE[shippingMethod]
  const total = subtotal + shippingFee
  const atmDisabled = shippingMethod === 'shopee'
  const linepayDisabled = shippingMethod === 'shopee'
  const codDisabled = shippingMethod !== 'shopee'

  if (pageState === 'loading') return <CheckoutSkeleton />

  if (pageState === 'error') {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] px-5 text-center'>
        <p className='text-sm text-fg-muted mb-4'>找不到可結單的訂單，請返回重試。</p>
        <Link
          href={`/store/${slug}/orders`}
          className='inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-[13px] font-display font-bold rounded-full shadow-pink'
        >
          返回訂單列表
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Mobile top bar */}
      <header
        className='lg:hidden sticky top-14 z-10 bg-app/90 backdrop-blur-md border-b px-5 pt-4 pb-3'
        style={{ borderColor: '#f7e5d8' }}
      >
        <div className='flex items-center justify-between'>
          <Link
            href={`/store/${slug}/orders`}
            className='w-10 h-10 rounded-full bg-surface flex items-center justify-center shadow-sm'
            style={{ border: '1px solid #f0d9cb' }}
            aria-label='返回'
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
            >
              <path d='M15 6l-6 6 6 6' />
            </svg>
          </Link>
          <span className='font-display font-bold text-base'>結單</span>
          <div className='w-10 h-10' />
        </div>
        <StepIndicator sm />
      </header>

      {/* Desktop breadcrumb + heading */}
      <div className='hidden lg:block max-w-[1280px] mx-auto px-8 pt-8'>
        <div className='font-mono text-[11px] text-fg-subtle mb-2 flex items-center gap-1.5'>
          <Link href={`/store/${slug}`} className='hover:text-fg'>
            賣場首頁
          </Link>
          <span>›</span>
          <Link href={`/store/${slug}/orders`} className='hover:text-fg'>
            我的訂單
          </Link>
          <span>›</span>
          <span className='text-fg'>結單</span>
        </div>
        <div className='flex items-end justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <Link
              href={`/store/${slug}/orders`}
              className='w-10 h-10 rounded-full bg-surface flex items-center justify-center'
              style={{ border: '1px solid #f0d9cb' }}
              aria-label='返回'
            >
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
              >
                <path d='M15 6l-6 6 6 6' />
              </svg>
            </Link>
            <div>
              <span
                className='font-mono text-[11px] tracking-[0.2em] uppercase'
                style={{ color: 'var(--c-primary-hv)' }}
              >
                CHECKOUT
              </span>
              <h1 className='font-display font-bold text-3xl mt-1 leading-tight'>
                結單{' '}
                <span className='font-body font-normal text-base text-fg-muted ml-2'>
                  {orders.length} 件商品
                </span>
              </h1>
            </div>
          </div>
          <StepIndicator />
        </div>
      </div>

      {/* Main grid */}
      <div className='lg:max-w-[1280px] lg:mx-auto lg:px-8 lg:pb-16 lg:grid lg:grid-cols-[1fr_380px] lg:gap-8 lg:items-start'>
        {/* Left: form */}
        <div className='px-5 pt-4 pb-36 space-y-4 lg:px-0 lg:pt-0 lg:pb-0 lg:space-y-5'>
          <ItemsSummary
            orders={orders}
            subtotal={subtotal}
            open={itemsOpen}
            onToggle={() => setItemsOpen((v) => !v)}
            slug={slug}
          />
          <ShippingSection method={shippingMethod} onChange={setShippingMethod} />
          <RecipientSection
            shippingMethod={shippingMethod}
            name={name}
            onName={setName}
            phone={phone}
            onPhone={setPhone}
            city={city}
            onCity={setCity}
            district={district}
            onDistrict={setDistrict}
            address={address}
            onAddress={setAddress}
            cvsBranch={cvsBranch}
            onCvsBranch={setCvsBranch}
          />
          <PaymentSection
            method={paymentMethod}
            onChange={setPaymentMethod}
            atmDisabled={atmDisabled}
            linepayDisabled={linepayDisabled}
            codDisabled={codDisabled}
          />
          <NoteSection note={note} onChange={setNote} />
          <div className='lg:hidden'>
            <CostCard
              subtotal={subtotal}
              shippingFee={shippingFee}
              shippingMethod={shippingMethod}
              total={total}
            />
          </div>
        </div>

        {/* Right: sticky aside */}
        <aside className='hidden lg:block'>
          <div className='sticky top-24 space-y-3'>
            <SummaryAside
              subtotal={subtotal}
              shippingFee={shippingFee}
              shippingMethod={shippingMethod}
              paymentMethod={paymentMethod}
              total={total}
              city={city}
              district={district}
              address={address}
              slug={slug}
            />
            <div className='rounded-xl bg-surface/70 p-4' style={{ border: '1px solid #f0d9cb' }}>
              <div className='font-display font-bold text-xs mb-1.5'>送出後會發生什麼?</div>
              <ul className='text-[11px] text-fg-muted leading-relaxed space-y-1'>
                <li>
                  • 狀態變為 <b className='text-fg'>待付款</b>，LINE 會收到通知
                </li>
                <li>• 匯款 / Line Pay 完款後，店主確認入帳</li>
                <li>• 隔日 17:00 前完成出貨</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile fixed CTA */}
      <div
        className='lg:hidden fixed bottom-0 left-0 right-0 z-40 max-w-[420px] mx-auto px-5 py-3 flex items-center gap-3'
        style={{
          background: 'rgba(255,246,241,0.96)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #f0d9cb',
        }}
      >
        <div className='leading-tight'>
          <div className='font-mono text-[10px] text-fg-subtle tracking-wider uppercase'>應付</div>
          <div className='font-mono font-bold text-lg' style={{ color: '#d94466' }}>
            NT$ {total.toLocaleString()}
          </div>
        </div>
        <button className='flex-1 h-12 rounded-full bg-primary text-white font-display font-bold text-sm shadow-pink hover:bg-primary-hv active:scale-[.97] transition flex items-center justify-center gap-1.5'>
          確認送單
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            strokeLinecap='round'
          >
            <path d='M9 6l6 6-6 6' />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutContent />
    </Suspense>
  )
}

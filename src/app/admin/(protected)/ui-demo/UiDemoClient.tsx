'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge, OrderStatusBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Field, Input, Textarea, Select } from '@/components/ui/Input'
import { SearchSelect, type SearchSelectOption } from '@/components/ui/SearchSelect'
import { Switch, Checkbox, Radio } from '@/components/ui/Choice'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ToastContainer, useToast } from '@/components/ui/Toast'

// ── Types ──────────────────────────────────────────────────────────────────

type Variant = 'forest' | 'candy'

interface UiDemoClientProps {
  initialVariant: Variant
}

// ── Demo data ──────────────────────────────────────────────────────────────

const CUSTOMER_OPTIONS: SearchSelectOption[] = [
  { value: 'c1', label: '陳小美', sublabel: 'LINE: @cherry_chen', avatar: '陳' },
  { value: 'c2', label: '林大華', sublabel: 'LINE: @dahua_lin', avatar: '林' },
  { value: 'c3', label: '王雅婷', sublabel: 'LINE: @yating_w', avatar: '王' },
  { value: 'c4', label: '李怡君', sublabel: 'LINE: @yijun.lee', avatar: '李' },
]

const STATUS_OPTIONS: SearchSelectOption[] = [
  { value: 'pending_purchase', label: '待採買' },
  { value: 'ordered', label: '已訂購' },
  { value: 'allocated', label: '已配單' },
  { value: 'settled', label: '已結單' },
  { value: 'shipped', label: '已出貨' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const PRODUCT_OPTIONS: SearchSelectOption[] = [
  {
    value: 'p1',
    label: '棉麻寬褲 — 米白 M',
    sublabel: 'SKU: P-001-W-M',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4357?w=80&q=60',
  },
  {
    value: 'p2',
    label: '日系碎花上衣 S',
    sublabel: 'SKU: P-002-F-S',
    imageUrl: 'https://images.unsplash.com/photo-1551489186-cf8726f514f8?w=80&q=60',
  },
  {
    value: 'p3',
    label: '草編手提包 — 原色',
    sublabel: 'SKU: P-003-N',
    imageUrl: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=80&q=60',
  },
]

const TABLE_ROWS = [
  {
    id: 'ORD-0051',
    customer: '陳小美',
    product: '棉麻寬褲 M',
    amount: 'NT$ 890',
    status: 'pending_purchase' as const,
  },
  {
    id: 'ORD-0050',
    customer: '林大華',
    product: '日系碎花上衣 S',
    amount: 'NT$ 560',
    status: 'ordered' as const,
  },
  {
    id: 'ORD-0049',
    customer: '王雅婷',
    product: '草編手提包',
    amount: 'NT$ 1,280',
    status: 'allocated' as const,
  },
  {
    id: 'ORD-0048',
    customer: '李怡君',
    product: '棉麻寬褲 S',
    amount: 'NT$ 890',
    status: 'settled' as const,
  },
  {
    id: 'ORD-0047',
    customer: '陳小美',
    product: '日系碎花上衣 M',
    amount: 'NT$ 560',
    status: 'cancelled' as const,
  },
]

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='mb-12'>
      <h2 className='font-display font-bold text-xl text-fg mb-6 pb-3 border-b border-line'>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className='mb-4'>
      {label && <p className='text-xs text-fg-subtle font-mono mb-2'>{label}</p>}
      <div className='flex flex-wrap items-center gap-3'>{children}</div>
    </div>
  )
}

// ── Shipping Card Demo ────────────────────────────────────────────────────

const SHIP_OPTIONS = [
  {
    value: 'pickup',
    label: '自取',
    sub: '約定時間到店取貨',
    icon: (
      <svg
        key='pickup'
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        aria-hidden='true'
      >
        <path d='M4 8l8-4 8 4-8 4-8-4z' />
        <path d='M4 8v8l8 4 8-4V8' />
      </svg>
    ),
  },
  {
    value: 'cvs',
    label: '超商店到店',
    sub: '7-11 / 全家 取貨',
    icon: (
      <svg
        key='cvs'
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        aria-hidden='true'
      >
        <rect x='4' y='6' width='16' height='14' rx='2' />
        <path d='M8 10h8' />
      </svg>
    ),
  },
  {
    value: 'seller',
    label: '賣貨便',
    sub: '貨到付款',
    icon: (
      <svg
        key='seller'
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        aria-hidden='true'
      >
        <path d='M4 8l8-4 8 4-8 4-8-4z' />
        <path d='M4 8v8l8 4 8-4V8' />
      </svg>
    ),
  },
  {
    value: 'delivery',
    label: '宅配',
    sub: '運費 NT$ 210',
    icon: (
      <svg
        key='dlv'
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        aria-hidden='true'
      >
        <rect x='3' y='9' width='13' height='9' rx='1' />
        <path d='M16 12h3l2 3v3h-5' />
        <circle cx='7' cy='19' r='2' />
        <circle cx='17' cy='19' r='2' />
      </svg>
    ),
  },
]

function ShippingCardDemo() {
  const [selected, setSelected] = useState('pickup')
  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
      {SHIP_OPTIONS.map((opt) => {
        const isSelected = selected === opt.value
        return (
          <button
            key={opt.value}
            type='button'
            onClick={() => setSelected(opt.value)}
            className={[
              'text-left p-4 rounded-xl border-[1.5px] transition',
              isSelected
                ? 'border-primary bg-primary-bg shadow-pink'
                : 'border-line bg-surface hover:border-line-strong',
            ].join(' ')}
          >
            <div
              className={[
                'w-10 h-10 rounded-pill flex items-center justify-center mb-3 transition',
                isSelected ? 'bg-primary text-white' : 'bg-sunken text-fg-muted',
              ].join(' ')}
            >
              {opt.icon}
            </div>
            <div className='font-display font-bold text-sm text-fg'>{opt.label}</div>
            <div className='text-xs text-fg-muted mt-1'>{opt.sub}</div>
          </button>
        )
      })}
    </div>
  )
}

// ── Filter Pills Demo（需要 useState，抽成獨立元件）─────────────────────────

const STATUS_PILLS = ['全部', '待採買', '已訂購', '已配單', '已結單', '已出貨', '已完成'] as const
type PillStatus = (typeof STATUS_PILLS)[number]

function FilterPillsDemo() {
  const [active, setActive] = useState<PillStatus>('全部')
  const counts: Record<PillStatus, number> = {
    全部: 12,
    待採買: 2,
    已訂購: 1,
    已配單: 3,
    已結單: 4,
    已出貨: 2,
    已完成: 0,
  }
  return (
    <div className='flex flex-wrap gap-1.5'>
      {STATUS_PILLS.map((s) => (
        <button
          key={s}
          onClick={() => setActive(s)}
          className={[
            'inline-flex items-center gap-1 h-7 px-3 rounded-pill',
            'font-display font-semibold text-xs transition',
            active === s ? 'bg-primary text-white' : 'bg-sunken text-fg-muted hover:bg-ink-200',
          ].join(' ')}
        >
          {active === s && <span className='w-1.5 h-1.5 rounded-pill bg-current' />}
          {s} · {counts[s]}
        </button>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function UiDemoClient({ initialVariant }: UiDemoClientProps) {
  const [variant, setVariant] = useState<Variant>(initialVariant)

  // choices demo state
  const [switchOn, setSwitchOn] = useState(false)
  const [check1, setCheck1] = useState(false)
  const [check2, setCheck2] = useState(true)
  const [radio, setRadio] = useState('a')

  // form demo state
  const [inputErr, setInputErr] = useState('')
  const [customer, setCustomer] = useState<string | null>(null)
  const [product, setProduct] = useState<string | null>(null)
  const [statusDemo, setStatusDemo] = useState<string | null>(null)

  // modal demo state
  const [modalOpen, setModalOpen] = useState(false)

  // toast
  const { toasts, toast, dismiss } = useToast()

  // ── Variant switcher ───────────────────────────────────────────────────

  function changeVariant(v: Variant) {
    setVariant(v)
  }

  // 同步 variant → <html data-variant> 讓全頁 CSS cascade 生效
  // 同時寫 cookie 供 SSR 讀取（避免 FOUC）
  // cleanup：離開 gallery 時移除，讓 AdminShell 的 :root 森林色重新生效
  useEffect(() => {
    document.documentElement.setAttribute('data-variant', variant)
    document.cookie = `ruei-variant=${variant}; path=/; max-age=31536000; SameSite=Lax`
    return () => {
      document.documentElement.removeAttribute('data-variant')
    }
  }, [variant])

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className='min-h-screen bg-app'>
      {/* ── 頁首 ── */}
      <header className='sticky top-[60px] z-20 bg-surface/[.92] backdrop-blur-[8px] backdrop-saturate-[140%] border-b border-line -mx-8 px-8 py-4 flex items-center justify-between'>
        <div>
          <h1 className='font-display font-bold text-xl text-fg'>UI Component Gallery</h1>
          <p className='text-xs text-fg-subtle font-mono mt-0.5'>芮選系統設計系統 · 元件預覽</p>
        </div>

        {/* 主題切換 segmented control */}
        <div className='flex items-center gap-1.5 bg-sunken rounded-pill p-1'>
          {(['forest', 'candy'] as Variant[]).map((v) => (
            <button
              key={v}
              onClick={() => changeVariant(v)}
              className={[
                'h-8 px-4 rounded-pill text-sm font-display font-semibold transition',
                variant === v ? 'bg-primary text-white shadow-sm' : 'text-fg-muted hover:text-fg',
              ].join(' ')}
            >
              {v === 'forest' ? '🌿 森林櫻花' : '🍬 蜜糖可愛'}
            </button>
          ))}
        </div>
      </header>

      {/* ── 內容 ── */}
      <main className='max-w-4xl mx-auto px-8 py-10'>
        {/* ── 1. Color Tokens ── */}
        {/*
         * Tailwind JIT safelist — dynamic color swatches, keep complete class strings:
         * bg-sakura-50 bg-sakura-100 bg-sakura-200 bg-sakura-300 bg-sakura-400
         * bg-sakura-500 bg-sakura-600 bg-sakura-700 bg-sakura-800
         * bg-forest-50 bg-forest-100 bg-forest-200 bg-forest-300 bg-forest-400
         * bg-forest-500 bg-forest-600 bg-forest-700 bg-forest-800
         */}
        <Section title='1. Color Tokens'>
          <div className='grid grid-cols-2 gap-6'>
            {/* Brand */}
            <div>
              <p className='text-xs font-mono text-fg-subtle mb-2'>Sakura (Primary)</p>
              <div className='flex gap-1'>
                {(
                  [
                    ['50', 'bg-sakura-50'],
                    ['100', 'bg-sakura-100'],
                    ['200', 'bg-sakura-200'],
                    ['300', 'bg-sakura-300'],
                    ['400', 'bg-sakura-400'],
                    ['500', 'bg-sakura-500'],
                    ['600', 'bg-sakura-600'],
                    ['700', 'bg-sakura-700'],
                    ['800', 'bg-sakura-800'],
                  ] as [string, string][]
                ).map(([n, cls]) => (
                  <div key={n} className='flex-1 flex flex-col gap-1 items-center'>
                    <div className={`h-8 w-full rounded-sm ${cls}`} />
                    <span className='text-[9px] font-mono text-fg-subtle'>{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className='text-xs font-mono text-fg-subtle mb-2'>Forest (Secondary)</p>
              <div className='flex gap-1'>
                {(
                  [
                    ['50', 'bg-forest-50'],
                    ['100', 'bg-forest-100'],
                    ['200', 'bg-forest-200'],
                    ['300', 'bg-forest-300'],
                    ['400', 'bg-forest-400'],
                    ['500', 'bg-forest-500'],
                    ['600', 'bg-forest-600'],
                    ['700', 'bg-forest-700'],
                    ['800', 'bg-forest-800'],
                  ] as [string, string][]
                ).map(([n, cls]) => (
                  <div key={n} className='flex-1 flex flex-col gap-1 items-center'>
                    <div className={`h-8 w-full rounded-sm ${cls}`} />
                    <span className='text-[9px] font-mono text-fg-subtle'>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Semantic */}
          <div className='mt-4 flex flex-wrap gap-2'>
            {[
              { label: 'primary', cls: 'bg-primary' },
              { label: 'primary-bg', cls: 'bg-primary-bg border border-line' },
              { label: 'secondary', cls: 'bg-secondary' },
              { label: 'secondary-bg', cls: 'bg-secondary-bg border border-line' },
              { label: 'success', cls: 'bg-success' },
              { label: 'success-bg', cls: 'bg-success-bg border border-line' },
              { label: 'warning', cls: 'bg-warning' },
              { label: 'warning-bg', cls: 'bg-warning-bg border border-line' },
              { label: 'danger', cls: 'bg-danger' },
              { label: 'danger-bg', cls: 'bg-danger-bg border border-line' },
              { label: 'info', cls: 'bg-info' },
              { label: 'info-bg', cls: 'bg-info-bg border border-line' },
              { label: 'surface', cls: 'bg-surface border border-line' },
              { label: 'sunken', cls: 'bg-sunken border border-line' },
              { label: 'app', cls: 'bg-app border border-line' },
            ].map(({ label, cls }) => (
              <div key={label} className='flex flex-col items-center gap-1'>
                <div className={`w-12 h-8 rounded-md ${cls}`} />
                <span className='text-[9px] font-mono text-fg-subtle'>{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 2. Typography ── */}
        <Section title='2. Typography'>
          <div className='space-y-3'>
            <p className='font-display font-bold text-[28px] text-fg'>
              Display / 頁標（Zen Maru Gothic）
            </p>
            <p className='font-display font-bold text-xl text-fg'>
              Heading / 標題 — font-display bold
            </p>
            <p className='font-display font-semibold text-base text-fg'>
              SubHeading — font-display semibold
            </p>
            <p className='font-body text-base text-fg'>
              Body 內文 — font-body 14px（Noto Sans TC）
            </p>
            <p className='font-body text-sm text-fg-muted'>
              Small / Secondary — text-sm text-fg-muted
            </p>
            <p className='font-mono text-sm text-fg-subtle'>
              NT$ 1,280 · ORD-0051 — font-mono（JetBrains Mono）
            </p>
          </div>
        </Section>

        {/* ── 3. Button ── */}
        <Section title='3. Button'>
          <Row label='variant'>
            <Button variant='primary'>主要按鈕</Button>
            <Button variant='secondary'>次要按鈕</Button>
            <Button variant='outline'>框線按鈕</Button>
            <Button variant='ghost'>Ghost</Button>
            <Button variant='danger'>刪除</Button>
          </Row>
          <Row label='size'>
            <Button size='sm'>Small</Button>
            <Button size='md'>Medium</Button>
            <Button size='lg'>Large</Button>
          </Row>
          <Row label='disabled'>
            <Button variant='primary' disabled>
              Primary disabled
            </Button>
            <Button variant='secondary' disabled>
              Secondary disabled
            </Button>
            <Button variant='outline' disabled>
              Outline disabled
            </Button>
          </Row>
          <Row label='icon-only'>
            <Button iconOnly aria-label='新增'>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                strokeLinecap='round'
                aria-hidden='true'
              >
                <path d='M12 5v14M5 12h14' />
              </svg>
            </Button>
            <Button iconOnly variant='secondary' aria-label='搜尋'>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                aria-hidden='true'
              >
                <circle cx='11' cy='11' r='6' />
                <path d='M20 20l-4-4' />
              </svg>
            </Button>
            <Button iconOnly variant='ghost' aria-label='更多'>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                aria-hidden='true'
              >
                <circle cx='5' cy='12' r='1.5' />
                <circle cx='12' cy='12' r='1.5' />
                <circle cx='19' cy='12' r='1.5' />
              </svg>
            </Button>
          </Row>
        </Section>

        {/* ── 4. Badge ── */}
        <Section title='4. Badge'>
          <Row label='tone (no dot)'>
            <Badge tone='pink'>粉紅</Badge>
            <Badge tone='green'>森林</Badge>
            <Badge tone='earth'>大地</Badge>
            <Badge tone='info'>資訊</Badge>
            <Badge tone='warning'>警告</Badge>
            <Badge tone='danger'>危險</Badge>
            <Badge tone='success'>成功</Badge>
            <Badge tone='solid'>Solid</Badge>
            <Badge tone='neutral'>中性</Badge>
          </Row>
          <Row label='tone (with dot)'>
            <Badge tone='pink' dot>
              粉紅
            </Badge>
            <Badge tone='green' dot>
              森林
            </Badge>
            <Badge tone='info' dot>
              資訊
            </Badge>
            <Badge tone='warning' dot>
              警告
            </Badge>
            <Badge tone='danger' dot>
              危險
            </Badge>
            <Badge tone='success' dot>
              成功
            </Badge>
          </Row>
          <Row label='OrderStatusBadge — admin statuses'>
            <OrderStatusBadge status='pending_purchase' />
            <OrderStatusBadge status='ordered' />
            <OrderStatusBadge status='allocated' />
            <OrderStatusBadge status='settled' />
            <OrderStatusBadge status='shipped' />
            <OrderStatusBadge status='completed' />
            <OrderStatusBadge status='cancelled' />
          </Row>
          <Row label='OrderStatusBadge — customer display statuses'>
            <OrderStatusBadge status='已下單' />
            <OrderStatusBadge status='已到貨' />
            <OrderStatusBadge status='已結單' />
            <OrderStatusBadge status='已出貨' />
            <OrderStatusBadge status='已完成' />
            <OrderStatusBadge status='已取消' />
          </Row>
        </Section>

        {/* ── 5. Card ── */}
        <Section title='5. Card'>
          <div className='bg-ink-200 rounded-xl p-6 grid grid-cols-3 gap-4'>
            <Card elevation='flat' className='flex flex-col gap-2'>
              <p className='font-display font-bold text-sm text-fg'>Flat Card</p>
              <p className='text-xs text-fg-muted'>elevation=&quot;flat&quot; — 只有邊框</p>
            </Card>
            <Card elevation='sm' className='flex flex-col gap-2'>
              <p className='font-display font-bold text-sm text-fg'>Shadow SM</p>
              <p className='text-xs text-fg-muted'>elevation=&quot;sm&quot; — 預設</p>
            </Card>
            <Card elevation='md' className='flex flex-col gap-2'>
              <p className='font-display font-bold text-sm text-fg'>Shadow MD</p>
              <p className='text-xs text-fg-muted'>elevation=&quot;md&quot; — 浮層感</p>
            </Card>
          </div>
        </Section>

        {/* ── 6. StatCard ── */}
        <Section title='6. StatCard'>
          <div className='grid grid-cols-2 gap-4'>
            <StatCard
              tone='pink'
              icon={
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
                  <circle cx='9' cy='7' r='4' />
                  <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
                  <path d='M16 3.13a4 4 0 0 1 0 7.75' />
                </svg>
              }
              label='本月活躍顧客'
              value={42}
              unit='人'
              delta={{ value: '↑ 8 vs 上月', trend: 'up' }}
              meta='5 月'
            />
            <StatCard
              tone='green'
              icon={
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <rect x='2' y='3' width='20' height='14' rx='2' />
                  <path d='M8 21h8M12 17v4' />
                </svg>
              }
              label='本月訂單數'
              value={128}
              unit='筆'
              delta={{ value: '↓ 3 vs 上月', trend: 'down' }}
              meta='5 月'
            />
            <StatCard
              tone='earth'
              icon={
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <path d='M12 2L2 7l10 5 10-5-10-5z' />
                  <path d='M2 17l10 5 10-5M2 12l10 5 10-5' />
                </svg>
              }
              label='待採買品項'
              value={7}
              unit='件'
              delta={{ value: '持平', trend: 'flat' }}
            />
            <StatCard
              tone='accent'
              icon={
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <line x1='12' y1='1' x2='12' y2='23' />
                  <path d='M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' />
                </svg>
              }
              label='本月營業額'
              value='NT$ 86,420'
              delta={{ value: '↑ 12% MoM', trend: 'up' }}
              meta='5 月'
            />
          </div>
        </Section>

        {/* ── 7. Input / Field ── */}
        <Section title='7. Input / Field / Textarea / Select'>
          <div className='grid grid-cols-2 gap-6'>
            <Field label='顧客姓名' required>
              <Input placeholder='請輸入顧客姓名' />
            </Field>
            <Field label='電話號碼' hint='格式：09xx-xxx-xxx'>
              <Input type='tel' placeholder='09xx-xxx-xxx' />
            </Field>
            <Field label='訂單備註' error={inputErr || undefined}>
              <Input
                placeholder='請輸入備註'
                hasError={!!inputErr}
                value={inputErr ? '不合法的輸入' : ''}
                onChange={() => {}}
              />
              <button
                type='button'
                className='text-xs text-fg-subtle underline mt-1 self-start'
                onClick={() => setInputErr(inputErr ? '' : '此欄位為必填')}
              >
                {inputErr ? '清除錯誤' : '模擬錯誤狀態'}
              </button>
            </Field>
            <Field label='商品描述'>
              <Textarea placeholder='請輸入商品描述…' />
            </Field>
            <Field label='排序方式（native Select）'>
              <Select defaultValue=''>
                <option value='' disabled>
                  請選擇排序
                </option>
                <option value='newest'>建立時間：最新優先</option>
                <option value='oldest'>建立時間：最舊優先</option>
                <option value='amount_desc'>金額：高至低</option>
                <option value='amount_asc'>金額：低至高</option>
              </Select>
            </Field>
            <Field label='停用狀態'>
              <Input placeholder='已停用輸入框' disabled />
            </Field>
          </div>
        </Section>

        {/* ── 8. SearchSelect ── */}
        <Section title='8. SearchSelect'>
          <div className='grid grid-cols-2 gap-6'>
            <Field label='選擇顧客（有 avatar）'>
              <SearchSelect
                options={CUSTOMER_OPTIONS}
                value={customer}
                onChange={setCustomer}
                placeholder='搜尋顧客姓名或 LINE ID…'
              />
            </Field>
            <Field label='選擇商品（有縮圖）'>
              <SearchSelect
                options={PRODUCT_OPTIONS}
                value={product}
                onChange={setProduct}
                placeholder='搜尋商品名稱…'
              />
            </Field>
            <Field label='訂單狀態（SearchSelect — 弧度一致）'>
              <SearchSelect
                options={STATUS_OPTIONS}
                value={statusDemo}
                onChange={setStatusDemo}
                placeholder='請選擇狀態…'
                emptyMessage='找不到狀態'
              />
            </Field>
            <Field label='Size sm'>
              <SearchSelect
                options={CUSTOMER_OPTIONS}
                value={null}
                onChange={() => {}}
                size='sm'
                placeholder='sm 尺寸…'
              />
            </Field>
            <Field label='Disabled 狀態'>
              <SearchSelect options={CUSTOMER_OPTIONS} value='c1' onChange={() => {}} disabled />
            </Field>
          </div>
        </Section>

        {/* ── 9. Choice ── */}
        <Section title='9. Choice（Checkbox / Radio / Switch）'>
          <div className='grid grid-cols-3 gap-8'>
            {/* Checkbox */}
            <div className='flex flex-col gap-3'>
              <p className='text-xs font-mono text-fg-subtle'>Checkbox</p>
              <Checkbox
                label='未選取'
                checked={check1}
                onChange={(e) => setCheck1(e.target.checked)}
              />
              <Checkbox
                label='已選取'
                checked={check2}
                onChange={(e) => setCheck2(e.target.checked)}
              />
              <Checkbox label='停用未選' disabled />
              <Checkbox label='停用已選' checked disabled onChange={() => {}} />
            </div>

            {/* Radio */}
            <div className='flex flex-col gap-3'>
              <p className='text-xs font-mono text-fg-subtle'>Radio</p>
              <Radio
                label='選項 A'
                name='demo-radio'
                value='a'
                checked={radio === 'a'}
                onChange={() => setRadio('a')}
              />
              <Radio
                label='選項 B'
                name='demo-radio'
                value='b'
                checked={radio === 'b'}
                onChange={() => setRadio('b')}
              />
              <Radio
                label='選項 C'
                name='demo-radio'
                value='c'
                checked={radio === 'c'}
                onChange={() => setRadio('c')}
              />
              <Radio label='停用選項' disabled />
            </div>

            {/* Switch */}
            <div className='flex flex-col gap-3'>
              <p className='text-xs font-mono text-fg-subtle'>Switch</p>
              <Switch
                label={switchOn ? '已開啟' : '已關閉'}
                checked={switchOn}
                onChange={setSwitchOn}
              />
              <Switch label='停用關閉' checked={false} onChange={() => {}} disabled />
              <Switch label='停用開啟' checked={true} onChange={() => {}} disabled />
            </div>
          </div>
        </Section>

        {/* ── 10. Table ── */}
        <Section title='10. Table'>
          <Table>
            <Thead>
              <Th>訂單編號</Th>
              <Th>顧客</Th>
              <Th>商品</Th>
              <Th>金額</Th>
              <Th>狀態</Th>
            </Thead>
            <Tbody>
              {TABLE_ROWS.map((row) => (
                <Tr key={row.id}>
                  <Td isId>{row.id}</Td>
                  <Td>{row.customer}</Td>
                  <Td>{row.product}</Td>
                  <Td numeric>{row.amount}</Td>
                  <Td>
                    <OrderStatusBadge status={row.status} />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Section>

        {/* ── 11. EmptyState ── */}
        <Section title='11. EmptyState'>
          <div className='grid grid-cols-2 gap-6'>
            <EmptyState
              title='目前沒有訂單'
              description='此賣場尚未收到任何訂單，等待顧客下單中。'
              icon={
                <svg
                  width='28'
                  height='28'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  aria-hidden='true'
                >
                  <path
                    d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <line x1='3' y1='6' x2='21' y2='6' />
                  <path d='M16 10a4 4 0 01-8 0' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              }
              action={<Button size='sm'>建立第一筆訂單</Button>}
            />
            <EmptyState title='找不到符合的結果' description='請嘗試調整搜尋條件或篩選器。' />
          </div>
        </Section>

        {/* ── 12. Modal ── */}
        <Section title='12. Modal'>
          <Row>
            <Button onClick={() => setModalOpen(true)}>開啟 Modal</Button>
          </Row>
          {modalOpen && (
            <Modal
              title='確認操作'
              onClose={() => setModalOpen(false)}
              footer={
                <>
                  <Button variant='ghost' onClick={() => setModalOpen(false)}>
                    取消
                  </Button>
                  <Button
                    onClick={() => {
                      setModalOpen(false)
                      toast('操作已完成！', 'success')
                    }}
                  >
                    確認
                  </Button>
                </>
              }
            >
              <p className='text-sm text-fg-muted leading-relaxed'>
                這是一個模態對話框範例。點擊「確認」會關閉 Modal 並觸發 Toast 通知。
              </p>
            </Modal>
          )}
        </Section>

        {/* ── 13. Toast ── */}
        <Section title='13. Toast'>
          <Row>
            <Button variant='primary' onClick={() => toast('操作成功完成！', 'success')}>
              Success Toast
            </Button>
            <Button variant='outline' onClick={() => toast('這是一則資訊通知', 'info')}>
              Info Toast
            </Button>
            <Button variant='danger' onClick={() => toast('發生錯誤，請稍後再試', 'error')}>
              Error Toast
            </Button>
          </Row>
        </Section>

        {/* ── 14. Radio Card（物流方式選擇器）── */}
        <Section title='14. Radio Card · 物流四選一'>
          <p className='text-sm text-fg-muted mb-4'>
            代客結單 / 顧客結單流程的物流方式選擇器。大卡片 + 圖示 + 標題 + 副標。 選中態用 primary
            框線與背景。切換到 🍬 蜜糖可愛看明顯圓角差異。
          </p>
          <ShippingCardDemo />
        </Section>

        {/* ── 15. Filter Pills（訂單狀態篩選）── */}
        <Section title='15. Filter Pills · 訂單狀態篩選'>
          <FilterPillsDemo />
        </Section>

        {/* ── 16. Sprint 4 Patterns ── */}
        <Section title='16. Sprint 4 Patterns'>
          {/* 代客結單橫幅 */}
          <p className='text-xs font-mono text-fg-subtle mb-2'>代客結單提示橫幅</p>
          <div className='bg-primary-bg border border-primary/20 rounded-xl px-5 py-4 flex items-center gap-4 mb-6'>
            <div className='w-10 h-10 rounded-pill bg-primary text-white flex items-center justify-center font-display font-bold shrink-0'>
              陳
            </div>
            <div className='flex-1 min-w-0'>
              <div className='font-display font-bold text-sm text-primary-hv'>
                正在為「陳小美」代客結單
              </div>
              <div className='text-xs text-fg-muted mt-0.5'>
                3 件已到貨商品 · 顧客不熟悉系統時使用
              </div>
            </div>
            <button
              type='button'
              className='h-8 px-3 rounded-pill bg-transparent text-fg-muted font-display font-semibold text-sm hover:bg-white/50 transition shrink-0'
            >
              退出
            </button>
          </div>

          {/* Page Header */}
          <p className='text-xs font-mono text-fg-subtle mb-2'>頁面標題列（Page Header）</p>
          <div className='bg-surface border border-line rounded-xl p-6 flex items-center justify-between'>
            <div>
              <h1 className='font-display font-bold text-2xl text-fg'>訂單管理</h1>
              <p className='text-sm text-fg-muted mt-1'>共 12 筆訂單 · 6 筆待處理</p>
            </div>
            <div className='flex items-center gap-2'>
              <Button iconOnly variant='ghost' aria-label='搜尋'>
                <svg
                  width='20'
                  height='20'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='1.8'
                  aria-hidden='true'
                >
                  <circle cx='11' cy='11' r='6' />
                  <path d='M20 20l-4-4' strokeLinecap='round' />
                </svg>
              </Button>
              <Button>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  aria-hidden='true'
                >
                  <path d='M12 5v14M5 12h14' />
                </svg>
                代客建單
              </Button>
            </div>
          </div>
        </Section>
      </main>

      {/* Toast 容器 */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

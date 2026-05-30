/* Tailwind JIT safelist — avatar & chart dynamic classes
 * bg-sakura-300 bg-sakura-400 bg-forest-400 bg-earth-400 bg-info
 */

import Link from 'next/link'
import { getServerUserProfile } from '@/lib/auth/session'
import { OrderStatusBadge } from '@/components/ui/Badge'

type OrderStatus =
  | 'pending_purchase'
  | 'ordered'
  | 'allocated'
  | 'settled'
  | 'shipped'
  | 'completed'
  | 'cancelled'

// ── Static mock data ───────────────────────────────────────────────────────────
// TODO: replace with real aggregated API calls after data model supports revenue/profit

const MINI_BARS = [40, 55, 45, 70, 60, 85, 100]

interface MockOrder {
  id: string
  date: string
  name: string
  initial: string
  avatarClass: string
  product: string
  amount: number
  status: OrderStatus
}

const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'RS-2410',
    date: '6/17 14:32',
    name: '陳小美',
    initial: '陳',
    avatarClass: 'bg-sakura-300',
    product: '棉麻寬褲 · 米白 · M',
    amount: 1280,
    status: 'allocated',
  },
  {
    id: 'RS-2409',
    date: '6/17 11:08',
    name: '林媽媽',
    initial: '林',
    avatarClass: 'bg-forest-400',
    product: '蜂蜜檸檬茶 × 2',
    amount: 680,
    status: 'ordered',
  },
  {
    id: 'RS-2408',
    date: '6/16 21:45',
    name: 'Anna',
    initial: 'A',
    avatarClass: 'bg-earth-400',
    product: '手工餅乾組 · 抹茶',
    amount: 480,
    status: 'pending_purchase',
  },
  {
    id: 'RS-2407',
    date: '6/16 16:20',
    name: 'Joyce',
    initial: 'J',
    avatarClass: 'bg-info',
    product: '保溫瓶 · 櫻花粉 500ml',
    amount: 1980,
    status: 'settled',
  },
  {
    id: 'RS-2406',
    date: '6/15 19:12',
    name: 'Cheryl',
    initial: 'C',
    avatarClass: 'bg-sakura-400',
    product: '蜂蜜檸檬茶 × 1',
    amount: 340,
    status: 'shipped',
  },
]

const MOCK_PRODUCTS = [
  {
    name: '日本直送・手工棉麻寬褲',
    supplier: 'MIKI',
    orders: 8,
    qty: 11,
    revenue: 14080,
    trend: 22,
  },
  {
    name: '英國有機蜂蜜檸檬茶',
    supplier: 'Penny Lane',
    orders: 6,
    qty: 14,
    revenue: 4760,
    trend: 15,
  },
  {
    name: '台灣手工餅乾組 · 抹茶限定',
    supplier: '五分埔',
    orders: 5,
    qty: 5,
    revenue: 2400,
    trend: 8,
  },
  { name: '櫻花粉保溫瓶 500ml', supplier: 'MIKI', orders: 4, qty: 4, revenue: 7920, trend: -3 },
]

const MOCK_SUPPLIERS = [
  { name: 'MIKI · 東京', days: '7.2', pct: 35, color: '--c-success' },
  { name: 'Penny Lane · 倫敦', days: '14.8', pct: 72, color: '--c-info' },
  { name: '五分埔 · 台北', days: '2.1', pct: 11, color: '--c-secondary' },
  { name: '日本職人小舖', days: '21.3', pct: 100, color: '--c-warning' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function getGreeting(hour: number) {
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const profile = await getServerUserProfile()
  const displayName = profile?.display_name ?? '管理員'
  const now = new Date()
  const greeting = getGreeting(now.getHours())
  const dateLabel = now.toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const todayLabel = now.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })

  return (
    <div className='space-y-6'>
      {/* ── Page header ─────────────────────────────────────────────────────────── */}
      <section className='flex items-start justify-between gap-4 flex-wrap'>
        <div>
          <div className='font-mono text-[11px] text-primary tracking-[0.2em] uppercase mb-1'>
            DASHBOARD
          </div>
          <h1 className='font-display font-bold text-2xl'>
            {displayName}
            {greeting} 👋
          </h1>
          <p className='text-sm text-fg-muted mt-0.5'>{dateLabel} · 有 6 筆訂單需要處理</p>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          <div className='relative hidden lg:block'>
            <input
              className='w-64 h-10 pl-10 pr-4 rounded-pill border border-line bg-surface outline-none text-sm placeholder:text-fg-subtle focus:border-primary transition'
              placeholder='搜尋訂單、商品、顧客…'
            />
            <svg
              className='absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle'
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
            >
              <circle cx='11' cy='11' r='6' />
              <path d='M20 20l-4-4' />
            </svg>
          </div>
          <button
            type='button'
            className='w-10 h-10 rounded-pill hover:bg-sunken flex items-center justify-center relative text-fg-muted'
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
              <path d='M6 16V11a6 6 0 1112 0v5l2 2H4l2-2z' />
              <path d='M10 20a2 2 0 004 0' />
            </svg>
            <span className='absolute top-2 right-2 w-2 h-2 rounded-pill bg-danger' />
          </button>
          <Link
            href='/admin/products/new'
            className='inline-flex items-center gap-1.5 h-10 rounded-pill bg-primary text-white px-5 font-display font-semibold text-sm shadow-pink hover:bg-primary-hv active:scale-[.97] transition'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
              strokeLinecap='round'
            >
              <path d='M12 5v14M5 12h14' />
            </svg>
            新增商品
          </Link>
        </div>
      </section>

      {/* ── Stat cards ──────────────────────────────────────────────────────────── */}
      <section className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* 本月營業額 */}
        <div className='bg-surface border border-line rounded-xl p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div className='w-10 h-10 rounded-md bg-sakura-100 text-sakura-700 flex items-center justify-center'>
              <svg
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
              >
                <path d='M12 6v12M9 9h4.5a2 2 0 010 4H10.5a2 2 0 000 4H15' />
              </svg>
            </div>
            <span className='font-mono text-[10px] text-fg-subtle'>6 月</span>
          </div>
          <div className='text-sm text-fg-muted mt-3'>本月營業額</div>
          <div className='flex items-baseline gap-1 mt-1'>
            <span className='font-mono text-sm text-fg-subtle'>NT$</span>
            <span className='font-display font-bold text-2xl'>86,420</span>
          </div>
          <div className='flex items-center gap-1.5 mt-2'>
            <span className='font-mono text-xs text-success'>↑ 12.4%</span>
            <span className='text-xs text-fg-subtle'>vs 上月</span>
          </div>
          <div className='flex items-end gap-0.5 mt-3 h-8'>
            {MINI_BARS.map((h, i) => (
              <div
                key={i}
                className='flex-1'
                style={{
                  height: `${h}%`,
                  background: 'var(--c-primary)',
                  opacity: 0.75,
                  borderRadius: '3px 3px 0 0',
                }}
              />
            ))}
          </div>
        </div>

        {/* 本月毛利 */}
        <div className='bg-surface border border-line rounded-xl p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div className='w-10 h-10 rounded-md bg-forest-100 text-forest-700 flex items-center justify-center'>
              <svg
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
              >
                <path d='M3 17l5-5 4 4 8-9' />
                <path d='M14 7h6v6' />
              </svg>
            </div>
            <span className='font-mono text-[10px] text-fg-subtle'>毛利率 32.6%</span>
          </div>
          <div className='text-sm text-fg-muted mt-3'>本月毛利</div>
          <div className='flex items-baseline gap-1 mt-1'>
            <span className='font-mono text-sm text-fg-subtle'>NT$</span>
            <span className='font-display font-bold text-2xl'>28,180</span>
          </div>
          <div className='flex items-center gap-1.5 mt-2'>
            <span className='font-mono text-xs text-success'>↑ 9.1%</span>
            <span className='text-xs text-fg-subtle'>vs 上月</span>
          </div>
          <div className='mt-3 h-2 rounded-pill bg-sunken overflow-hidden'>
            <div className='h-full rounded-pill bg-secondary' style={{ width: '65%' }} />
          </div>
        </div>

        {/* 待處理訂單 */}
        <div className='bg-surface border border-line rounded-xl p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div className='w-10 h-10 rounded-md bg-earth-100 text-earth-700 flex items-center justify-center'>
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
                <path d='M12 7v5l3 2' />
              </svg>
            </div>
            <span className='inline-flex items-center h-5 px-2 rounded-pill bg-warning-bg text-warning font-display font-semibold text-[10px]'>
              急
            </span>
          </div>
          <div className='text-sm text-fg-muted mt-3'>待處理訂單</div>
          <div className='flex items-baseline gap-1 mt-1'>
            <span className='font-display font-bold text-2xl'>6</span>
            <span className='font-mono text-sm text-fg-subtle'>筆</span>
          </div>
          <div className='flex items-center gap-1.5 mt-2'>
            <span className='font-mono text-xs text-fg-muted'>平均 4hr 配貨</span>
          </div>
          <div className='grid grid-cols-3 gap-1 mt-3 text-center'>
            <div className='text-[10px] text-fg-subtle'>
              <b className='block font-mono text-fg text-sm'>2</b>待採買
            </div>
            <div className='text-[10px] text-fg-subtle'>
              <b className='block font-mono text-fg text-sm'>1</b>已訂購
            </div>
            <div className='text-[10px] text-fg-subtle'>
              <b className='block font-mono text-fg text-sm'>3</b>已配單
            </div>
          </div>
        </div>

        {/* 新顧客 */}
        <div className='bg-surface border border-line rounded-xl p-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <div className='w-10 h-10 rounded-md bg-primary-bg text-primary flex items-center justify-center'>
              <svg
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
              >
                <circle cx='9' cy='8' r='3' />
                <path d='M3 19c0-3 3-5 6-5s6 2 6 5' />
                <path d='M18 8v6M21 11h-6' />
              </svg>
            </div>
            <span className='font-mono text-[10px] text-fg-subtle'>本月</span>
          </div>
          <div className='text-sm text-fg-muted mt-3'>新顧客</div>
          <div className='flex items-baseline gap-1 mt-1'>
            <span className='font-display font-bold text-2xl'>14</span>
            <span className='font-mono text-sm text-fg-subtle'>人</span>
          </div>
          <div className='flex items-center mt-2'>
            <Link
              href='/admin/customers'
              className='inline-flex items-center gap-1 h-5 px-2 rounded-pill bg-warning-bg text-warning font-display font-semibold text-[10px] hover:opacity-80 transition'
            >
              3 待審核
            </Link>
          </div>
          <div className='flex -space-x-2 mt-3'>
            {[
              { bg: 'bg-sakura-300', label: '陳' },
              { bg: 'bg-forest-400', label: '林' },
              { bg: 'bg-earth-400', label: 'A' },
              { bg: 'bg-info', label: 'J' },
            ].map(({ bg, label }) => (
              <div
                key={label}
                className={`w-7 h-7 rounded-pill ${bg} text-white font-display font-bold text-xs flex items-center justify-center border-2 border-surface`}
              >
                {label}
              </div>
            ))}
            <div className='w-7 h-7 rounded-pill bg-sunken text-fg-muted font-mono font-semibold text-[10px] flex items-center justify-center border-2 border-surface'>
              +10
            </div>
          </div>
        </div>
      </section>

      {/* ── Orders + Todos ──────────────────────────────────────────────────────── */}
      <section className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Orders table (2/3) */}
        <div className='lg:col-span-2 bg-surface border border-line rounded-xl overflow-hidden'>
          <div className='px-5 py-4 flex items-center justify-between border-b border-line flex-wrap gap-2'>
            <div>
              <h2 className='font-display font-bold text-lg'>最近訂單</h2>
              <p className='text-xs text-fg-muted mt-0.5'>過去 7 天 · 共 12 筆</p>
            </div>
            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                className='inline-flex items-center h-7 px-3 rounded-pill bg-primary text-white font-display font-semibold text-xs'
              >
                <span className='w-1.5 h-1.5 rounded-pill bg-current mr-1' />
                全部
              </button>
              <button
                type='button'
                className='inline-flex items-center h-7 px-3 rounded-pill bg-sunken text-fg-muted font-display font-semibold text-xs hover:bg-ink-200 transition'
              >
                待採買
              </button>
              <button
                type='button'
                className='inline-flex items-center h-7 px-3 rounded-pill bg-sunken text-fg-muted font-display font-semibold text-xs hover:bg-ink-200 transition'
              >
                已配單
              </button>
              <button
                type='button'
                className='inline-flex items-center h-7 px-3 rounded-pill bg-sunken text-fg-muted font-display font-semibold text-xs hover:bg-ink-200 transition'
              >
                已出貨
              </button>
            </div>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-ink-50'>
                  <th className='text-left px-5 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted whitespace-nowrap'>
                    訂單
                  </th>
                  <th className='text-left px-5 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted'>
                    顧客
                  </th>
                  <th className='text-left px-4 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted'>
                    商品
                  </th>
                  <th className='text-right px-5 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted whitespace-nowrap'>
                    金額
                  </th>
                  <th className='text-left px-5 py-2.5 font-mono font-semibold text-[10px] uppercase tracking-wider text-fg-muted'>
                    狀態
                  </th>
                  <th className='w-8' />
                </tr>
              </thead>
              <tbody>
                {MOCK_ORDERS.map((o) => (
                  <tr
                    key={o.id}
                    className='border-t border-line hover:bg-ink-50 cursor-pointer transition-colors'
                  >
                    <td className='px-5 py-3'>
                      <div className='font-mono text-fg-muted'>{o.id}</div>
                      <div className='font-mono text-[10px] text-fg-subtle'>{o.date}</div>
                    </td>
                    <td className='px-5 py-3'>
                      <div className='flex items-center gap-2'>
                        <div
                          className={`w-7 h-7 rounded-pill ${o.avatarClass} text-white font-display font-bold text-xs flex items-center justify-center shrink-0`}
                        >
                          {o.initial}
                        </div>
                        <span className='font-semibold whitespace-nowrap'>{o.name}</span>
                      </div>
                    </td>
                    <td className='px-4 py-3 text-fg-muted max-w-[160px]'>
                      <div className='truncate'>{o.product}</div>
                    </td>
                    <td className='px-5 py-3 text-right font-mono font-semibold whitespace-nowrap'>
                      NT$ {o.amount.toLocaleString()}
                    </td>
                    <td className='px-5 py-3'>
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className='px-3'>
                      <svg
                        width='14'
                        height='14'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        className='text-fg-subtle'
                      >
                        <path d='M9 6l6 6-6 6' />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className='px-5 py-3 border-t border-line bg-ink-50 flex items-center justify-between'>
            <span className='text-xs text-fg-muted'>顯示 5 / 12 筆</span>
            <Link
              href='/admin/orders'
              className='text-xs font-semibold text-primary hover:underline'
            >
              查看全部訂單 →
            </Link>
          </div>
        </div>

        {/* Today todos (1/3) */}
        <div className='bg-surface border border-line rounded-xl p-5'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='font-display font-bold text-lg'>今日待辦</h2>
            <span className='font-mono text-xs text-fg-subtle'>{todayLabel}</span>
          </div>
          <div className='space-y-3'>
            {/* Urgent: 下單廠商 */}
            <div
              className='flex gap-3 p-3 rounded-md'
              style={{ background: 'rgba(251,235,210,0.45)' }}
            >
              <div className='w-1 self-stretch rounded-pill bg-warning shrink-0' />
              <div className='flex-1'>
                <div className='font-display font-bold text-sm'>向 MIKI 廠下單</div>
                <p className='text-xs text-fg-muted mt-1'>
                  3 筆訂單共 5 件商品，截單時間：今天 22:00
                </p>
                <div className='flex items-center gap-2 mt-2'>
                  <button
                    type='button'
                    className='inline-flex items-center h-7 px-3 rounded-pill bg-secondary text-white font-display font-semibold text-xs shadow-green hover:bg-secondary-hv transition'
                  >
                    立即下單
                  </button>
                  <button
                    type='button'
                    className='inline-flex items-center h-7 px-3 rounded-pill text-fg font-display font-semibold text-xs hover:bg-sunken transition'
                  >
                    稍後
                  </button>
                </div>
              </div>
            </div>

            {/* 顧客審核 */}
            <Link
              href='/admin/customers'
              className='flex gap-3 p-3 rounded-md hover:bg-sunken cursor-pointer transition-colors'
            >
              <div className='w-1 self-stretch rounded-pill bg-primary shrink-0' />
              <div className='flex-1'>
                <div className='font-display font-bold text-sm'>3 位顧客等待審核</div>
                <p className='text-xs text-fg-muted mt-1'>陳小美、王太太、Joyce</p>
              </div>
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                className='text-fg-subtle self-center shrink-0'
              >
                <path d='M9 6l6 6-6 6' />
              </svg>
            </Link>

            {/* 到貨確認 */}
            <Link
              href='/admin/orders'
              className='flex gap-3 p-3 rounded-md hover:bg-sunken cursor-pointer transition-colors'
            >
              <div className='w-1 self-stretch rounded-pill bg-info shrink-0' />
              <div className='flex-1'>
                <div className='font-display font-bold text-sm'>確認 2 筆已到貨商品</div>
                <p className='text-xs text-fg-muted mt-1'>點擊配貨給顧客</p>
              </div>
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                className='text-fg-subtle self-center shrink-0'
              >
                <path d='M9 6l6 6-6 6' />
              </svg>
            </Link>

            {/* 許願池 */}
            <div className='flex gap-3 p-3 rounded-md hover:bg-sunken cursor-pointer transition-colors'>
              <div className='w-1 self-stretch rounded-pill bg-earth-400 shrink-0' />
              <div className='flex-1'>
                <div className='font-display font-bold text-sm'>許願池 5 件未處理</div>
                <p className='text-xs text-fg-muted mt-1'>最久的已等候 7 天</p>
              </div>
              <svg
                width='14'
                height='14'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                className='text-fg-subtle self-center shrink-0'
              >
                <path d='M9 6l6 6-6 6' />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── Top products + Suppliers ─────────────────────────────────────────────── */}
      <section className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Top products (2/3) */}
        <div className='lg:col-span-2 bg-surface border border-line rounded-xl p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h2 className='font-display font-bold text-lg'>本月熱銷</h2>
              <p className='text-xs text-fg-muted mt-0.5'>依訂單數量排序</p>
            </div>
            <select className='h-8 px-3 rounded-pill bg-sunken border-0 outline-none font-display font-semibold text-xs cursor-pointer'>
              <option>本月</option>
              <option>本週</option>
              <option>今日</option>
            </select>
          </div>
          <div className='space-y-1'>
            {MOCK_PRODUCTS.map((p) => (
              <div
                key={p.name}
                className='flex items-center gap-3 p-2.5 rounded-md hover:bg-ink-50 transition-colors'
              >
                <div
                  className='w-12 h-12 rounded-md shrink-0'
                  style={{
                    background:
                      'repeating-linear-gradient(135deg,var(--ink-100),var(--ink-100) 8px,var(--ink-50) 8px,var(--ink-50) 16px)',
                  }}
                />
                <div className='flex-1 min-w-0'>
                  <div className='font-display font-semibold text-sm truncate'>{p.name}</div>
                  <div className='flex items-center gap-2 mt-1'>
                    <span className='inline-flex items-center h-5 px-2 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[10px]'>
                      {p.supplier}
                    </span>
                    <span className='text-xs text-fg-muted'>
                      {p.orders} 訂單 · {p.qty} 件
                    </span>
                  </div>
                </div>
                <div className='text-right shrink-0'>
                  <div className='font-mono font-semibold text-sm'>
                    NT$ {p.revenue.toLocaleString()}
                  </div>
                  <div
                    className={`font-mono text-[10px] ${p.trend > 0 ? 'text-success' : 'text-danger'}`}
                  >
                    {p.trend > 0 ? '+' : ''}
                    {p.trend}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supplier breakdown (1/3) */}
        <div className='bg-surface border border-line rounded-xl p-5'>
          <h2 className='font-display font-bold text-lg'>廠商表現</h2>
          <p className='text-xs text-fg-muted mt-0.5 mb-4'>平均到貨天數</p>
          <div className='space-y-4'>
            {MOCK_SUPPLIERS.map((s) => (
              <div key={s.name}>
                <div className='flex justify-between text-sm mb-1.5'>
                  <span className='font-semibold'>{s.name}</span>
                  <span className='font-mono text-fg-muted'>{s.days} 天</span>
                </div>
                <div className='h-2 rounded-pill bg-sunken overflow-hidden'>
                  <div
                    className='h-full rounded-pill'
                    style={{ width: `${s.pct}%`, background: `var(${s.color})` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link
            href='/admin/suppliers'
            className='flex items-center justify-center w-full mt-5 h-9 rounded-pill border border-secondary text-secondary font-display font-semibold text-sm hover:bg-secondary-bg transition'
          >
            查看完整分析
          </Link>
        </div>
      </section>
    </div>
  )
}

import Link from 'next/link'
import { getServerUserProfile, getServerStore } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import { DashboardOrdersTable } from './DashboardOrdersTable'
import { DashboardTopProducts } from './DashboardTopProducts'
import type { MockOrder } from './DashboardOrdersTable'
import type { MockProduct } from './DashboardTopProducts'

// ── 假資料：本月熱銷需要聚合查詢，先保留 mock ──────────────────────────────────
// TODO: 實作 order_items GROUP BY product_id 取得真實熱銷排行
const MOCK_PRODUCTS: MockProduct[] = [
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

const MINI_BARS = [40, 55, 45, 70, 60, 85, 100]

// ── DB row 型別 ────────────────────────────────────────────────────────────────

interface OrderRow {
  id: string
  status: string
  ordered_at: string
  store_members: { name: string } | null
  order_items: { quantity: number; unit_price: number; products: { name: string } | null }[]
}

interface MemberRow {
  id: string
  status: string
  applied_at: string
  name: string | null
}

interface SupplierRow {
  id: string
  name: string
  products: { id: string }[] | null
}

interface OrderStatusRow {
  status: string
}

interface MonthOrderRow {
  order_items: { unit_price: number; quantity: number }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function shortDisplayId(uuid: string): string {
  return `RS-${uuid.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${h}:${min}`
}

const AVATAR_COLORS = ['bg-sakura-300', 'bg-forest-400', 'bg-earth-400', 'bg-info', 'bg-sakura-400']
function avatarColor(name: string): string {
  const hash = Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function getGreeting(hour: number) {
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default async function AdminDashboard() {
  const [profile, store] = await Promise.all([getServerUserProfile(), getServerStore()])

  const displayName = profile?.display_name ?? '管理員'
  const now = new Date()
  const greeting = getGreeting(now.getHours())
  const dateLabel = now.toLocaleDateString('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  const todayLabel = now.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
  const monthLabel = now.toLocaleDateString('zh-TW', { month: 'long' })

  // ── 真實資料（有 store 才查）────────────────────────────────────────────────
  let recentOrders: MockOrder[] = []
  let orderCounts = { pendingPurchase: 0, ordered: 0, allocated: 0 }
  let totalNeedAttention = 0
  let pendingMembersCount = 0
  let pendingMemberNames: string[] = []
  let newMembersCount = 0
  let totalApprovedMembers = 0
  let suppliers: { id: string; name: string; productCount: number }[] = []
  let monthlyRevenue = 0

  if (store) {
    const storeId = store.id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [ordersRes, membersRes, suppliersRes, statusRes, monthRevenueRes] = await Promise.all([
      db
        .from('orders')
        .select(
          'id, status, ordered_at, store_members(name), order_items(quantity, unit_price, products(name))'
        )
        .eq('store_id', storeId)
        .order('ordered_at', { ascending: false })
        .limit(10),

      db.from('store_members').select('id, status, applied_at, name').eq('store_id', storeId),

      db.from('suppliers').select('id, name, products(id)').eq('store_id', storeId).order('name'),

      db.from('orders').select('status').eq('store_id', storeId).neq('status', 'cancelled'),

      db
        .from('orders')
        .select('order_items(unit_price, quantity)')
        .eq('store_id', storeId)
        .neq('status', 'cancelled')
        .gte('ordered_at', monthStart),
    ])

    // Recent orders → MockOrder 格式
    recentOrders = ((ordersRes.data ?? []) as OrderRow[]).map((row) => {
      const name = row.store_members?.name ?? '未知顧客'
      const firstItem = row.order_items[0]
      const subtotal = row.order_items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
      return {
        id: shortDisplayId(row.id),
        date: fmtDate(row.ordered_at),
        name,
        initial: name.charAt(0),
        avatarClass: avatarColor(name),
        product: firstItem?.products?.name ?? '—',
        amount: subtotal,
        status: row.status as MockOrder['status'],
      }
    })

    // 顧客統計
    const members = (membersRes.data ?? []) as MemberRow[]
    const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
    pendingMembersCount = members.filter((m) => m.status === 'pending').length
    pendingMemberNames = members
      .filter((m) => m.status === 'pending')
      .slice(0, 3)
      .map((m) => m.name ?? '未知')
    newMembersCount = members.filter((m) => new Date(m.applied_at) >= monthStartDate).length
    totalApprovedMembers = members.filter((m) => m.status === 'approved').length

    // 訂單狀態計數
    const statuses = (statusRes.data ?? []) as OrderStatusRow[]
    orderCounts = {
      pendingPurchase: statuses.filter((o) => o.status === 'pending_purchase').length,
      ordered: statuses.filter((o) => o.status === 'ordered').length,
      allocated: statuses.filter((o) => o.status === 'allocated').length,
    }
    totalNeedAttention = orderCounts.pendingPurchase + orderCounts.ordered + orderCounts.allocated

    // 廠商清單（含商品數）
    suppliers = ((suppliersRes.data ?? []) as SupplierRow[]).map((s) => ({
      id: s.id,
      name: s.name,
      productCount: (s.products ?? []).length,
    }))

    // 本月營業額
    const monthOrders = (monthRevenueRes.data ?? []) as MonthOrderRow[]
    monthlyRevenue = monthOrders.reduce(
      (total, order) =>
        total +
        (order.order_items ?? []).reduce((s, item) => s + item.unit_price * item.quantity, 0),
      0
    )
  }

  const maxProductCount = Math.max(...suppliers.map((s) => s.productCount), 1)

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
          <p className='text-sm text-fg-muted mt-0.5'>
            {dateLabel}
            {totalNeedAttention > 0 && ` · 有 ${totalNeedAttention} 筆訂單需要處理`}
          </p>
        </div>
        <div className='flex items-center gap-2 shrink-0'>
          <form action='/admin/orders' method='get' className='relative hidden lg:block'>
            <input
              name='q'
              className='w-64 h-10 pl-10 pr-4 rounded-pill border border-line bg-surface outline-none text-sm placeholder:text-fg-subtle focus:border-primary transition'
              placeholder='搜尋訂單、商品、顧客…'
            />
            <svg
              className='absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none'
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
          </form>
          <Link
            href='/admin/orders'
            className='w-10 h-10 rounded-pill hover:bg-sunken flex items-center justify-center relative text-fg-muted'
            aria-label='訂單通知'
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
            {totalNeedAttention > 0 && (
              <span className='absolute top-2 right-2 w-2 h-2 rounded-pill bg-danger' />
            )}
          </Link>
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
        {/* 本月營業額（真實計算） */}
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
            <span className='font-mono text-[10px] text-fg-subtle'>{monthLabel}</span>
          </div>
          <div className='text-sm text-fg-muted mt-3'>本月營業額</div>
          <div className='flex items-baseline gap-1 mt-1'>
            <span className='font-mono text-sm text-fg-subtle'>NT$</span>
            <span className='font-display font-bold text-2xl'>
              {monthlyRevenue.toLocaleString()}
            </span>
          </div>
          <div className='flex items-center gap-1.5 mt-2'>
            <span className='text-xs text-fg-subtle'>已下單商品金額小計</span>
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

        {/* 本月毛利（需成本資料，暫不顯示） */}
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
            <span className='font-mono text-[10px] text-fg-subtle'>{monthLabel}</span>
          </div>
          <div className='text-sm text-fg-muted mt-3'>本月毛利</div>
          <div className='flex items-baseline gap-1 mt-1'>
            <span className='font-mono text-sm text-fg-subtle'>NT$</span>
            <span className='font-display font-bold text-2xl text-fg-subtle'>—</span>
          </div>
          <div className='flex items-center gap-1.5 mt-2'>
            <span className='text-xs text-fg-subtle'>需填寫商品成本後計算</span>
          </div>
          <div className='mt-3 h-2 rounded-pill bg-sunken overflow-hidden'>
            <div className='h-full rounded-pill bg-secondary' style={{ width: '0%' }} />
          </div>
        </div>

        {/* 待處理訂單（真實計數） */}
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
            {totalNeedAttention > 0 && (
              <span className='inline-flex items-center h-5 px-2 rounded-pill bg-warning-bg text-warning font-display font-semibold text-[10px]'>
                急
              </span>
            )}
          </div>
          <div className='text-sm text-fg-muted mt-3'>待處理訂單</div>
          <div className='flex items-baseline gap-1 mt-1'>
            <span className='font-display font-bold text-2xl'>{totalNeedAttention}</span>
            <span className='font-mono text-sm text-fg-subtle'>筆</span>
          </div>
          <div className='flex items-center gap-1.5 mt-2'>
            <span className='font-mono text-xs text-fg-muted'>
              {totalNeedAttention === 0 ? '目前沒有待處理訂單' : '需要你的操作'}
            </span>
          </div>
          <div className='grid grid-cols-3 gap-1 mt-3 text-center'>
            <div className='text-[10px] text-fg-subtle'>
              <b className='block font-mono text-fg text-sm'>{orderCounts.pendingPurchase}</b>
              待採買
            </div>
            <div className='text-[10px] text-fg-subtle'>
              <b className='block font-mono text-fg text-sm'>{orderCounts.ordered}</b>
              已訂購
            </div>
            <div className='text-[10px] text-fg-subtle'>
              <b className='block font-mono text-fg text-sm'>{orderCounts.allocated}</b>
              已配單
            </div>
          </div>
        </div>

        {/* 顧客（真實計數） */}
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
            <span className='font-mono text-[10px] text-fg-subtle'>已審核</span>
          </div>
          <div className='text-sm text-fg-muted mt-3'>顧客人數</div>
          <div className='flex items-baseline gap-1 mt-1'>
            <span className='font-display font-bold text-2xl'>{totalApprovedMembers}</span>
            <span className='font-mono text-sm text-fg-subtle'>人</span>
          </div>
          <div className='flex items-center mt-2'>
            {pendingMembersCount > 0 ? (
              <Link
                href='/admin/customers'
                className='inline-flex items-center gap-1 h-5 px-2 rounded-pill bg-warning-bg text-warning font-display font-semibold text-[10px] hover:opacity-80 transition'
              >
                {pendingMembersCount} 待審核
              </Link>
            ) : (
              <span className='font-mono text-xs text-fg-subtle'>
                {newMembersCount > 0 ? `本月 +${newMembersCount} 新顧客` : '無待審核'}
              </span>
            )}
          </div>
          <div className='flex items-center gap-1 mt-3'>
            <span className='font-mono text-[10px] text-fg-subtle'>
              {newMembersCount > 0 ? `本月新加入 ${newMembersCount} 位` : '本月無新顧客'}
            </span>
          </div>
        </div>
      </section>

      {/* ── Orders + Todos ──────────────────────────────────────────────────────── */}
      <section className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Orders table (2/3) — 真實訂單資料 */}
        <DashboardOrdersTable orders={recentOrders} />

        {/* Today todos (1/3) — 基於真實數字 */}
        <div className='bg-surface border border-line rounded-xl p-5'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='font-display font-bold text-lg'>今日待辦</h2>
            <span className='font-mono text-xs text-fg-subtle'>{todayLabel}</span>
          </div>
          <div className='space-y-3'>
            {/* 待採買訂單 */}
            {orderCounts.pendingPurchase > 0 ? (
              <Link
                href='/admin/orders'
                className='flex gap-3 p-3 rounded-md hover:bg-sunken transition-colors'
                style={{ background: 'rgba(251,235,210,0.45)' }}
              >
                <div className='w-1 self-stretch rounded-pill bg-warning shrink-0' />
                <div className='flex-1'>
                  <div className='font-display font-bold text-sm'>
                    {orderCounts.pendingPurchase} 筆訂單待採買
                  </div>
                  <p className='text-xs text-fg-muted mt-1'>前往訂單管理向廠商下單</p>
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
            ) : (
              <div
                className='flex gap-3 p-3 rounded-md'
                style={{ background: 'rgba(225,244,230,0.45)' }}
              >
                <div className='w-1 self-stretch rounded-pill bg-success shrink-0' />
                <div className='flex-1'>
                  <div className='font-display font-bold text-sm'>採買清單清空 ✓</div>
                  <p className='text-xs text-fg-muted mt-1'>目前無待採買訂單</p>
                </div>
              </div>
            )}

            {/* 顧客審核 */}
            {pendingMembersCount > 0 ? (
              <Link
                href='/admin/customers'
                className='flex gap-3 p-3 rounded-md hover:bg-sunken cursor-pointer transition-colors'
              >
                <div className='w-1 self-stretch rounded-pill bg-primary shrink-0' />
                <div className='flex-1'>
                  <div className='font-display font-bold text-sm'>
                    {pendingMembersCount} 位顧客等待審核
                  </div>
                  <p className='text-xs text-fg-muted mt-1'>
                    {pendingMemberNames.length > 0
                      ? pendingMemberNames.join('、')
                      : '點此查看審核名單'}
                  </p>
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
            ) : null}

            {/* 已訂購待配單 */}
            {orderCounts.ordered > 0 && (
              <Link
                href='/admin/orders'
                className='flex gap-3 p-3 rounded-md hover:bg-sunken cursor-pointer transition-colors'
              >
                <div className='w-1 self-stretch rounded-pill bg-info shrink-0' />
                <div className='flex-1'>
                  <div className='font-display font-bold text-sm'>
                    {orderCounts.ordered} 筆已訂購，待配單給顧客
                  </div>
                  <p className='text-xs text-fg-muted mt-1'>商品到貨後點擊配單</p>
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
            )}

            {/* 全部清空狀態 */}
            {totalNeedAttention === 0 && pendingMembersCount === 0 && (
              <div className='py-6 text-center'>
                <div className='font-display font-semibold text-sm text-fg-muted'>
                  今日待辦全清！
                </div>
                <p className='text-xs text-fg-subtle mt-1'>🎉</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Top products + Suppliers ─────────────────────────────────────────────── */}
      <section className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Top products (2/3) — 本月熱銷需聚合查詢，目前為示範資料 */}
        <div className='lg:col-span-2 relative'>
          <DashboardTopProducts products={MOCK_PRODUCTS} />
          <div className='absolute top-4 right-20 inline-flex items-center h-5 px-2 rounded-pill bg-ink-100 text-fg-subtle font-mono text-[9px] tracking-wider'>
            DEMO
          </div>
        </div>

        {/* Supplier breakdown (1/3) — 真實廠商資料 */}
        <div className='bg-surface border border-line rounded-xl p-5'>
          <h2 className='font-display font-bold text-lg'>廠商清單</h2>
          <p className='text-xs text-fg-muted mt-0.5 mb-4'>商品數量</p>

          {suppliers.length === 0 ? (
            <div className='py-8 text-center'>
              <p className='text-sm text-fg-muted'>尚未新增廠商</p>
              <Link
                href='/admin/suppliers'
                className='inline-flex items-center gap-1 mt-3 text-xs font-semibold text-primary hover:underline'
              >
                前往新增 →
              </Link>
            </div>
          ) : (
            <div className='space-y-4'>
              {suppliers.map((s) => (
                <div key={s.id}>
                  <div className='flex justify-between text-sm mb-1.5'>
                    <span className='font-semibold truncate mr-2'>{s.name}</span>
                    <span className='font-mono text-fg-muted shrink-0'>
                      {s.productCount} 件商品
                    </span>
                  </div>
                  <div className='h-2 rounded-pill bg-sunken overflow-hidden'>
                    <div
                      className='h-full rounded-pill bg-secondary transition-all'
                      style={{
                        width: `${Math.max((s.productCount / maxProductCount) * 100, s.productCount > 0 ? 5 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            href='/admin/suppliers'
            className='flex items-center justify-center w-full mt-5 h-9 rounded-pill border border-secondary text-secondary font-display font-semibold text-sm hover:bg-secondary-bg transition'
          >
            管理廠商
          </Link>
        </div>
      </section>
    </div>
  )
}

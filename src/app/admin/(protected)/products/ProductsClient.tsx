'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Product, ProductVariant, ProductImage, Supplier, ProductCategory } from '@/types'
import CategoriesManager from '@/components/products/CategoriesManager'

// ── 型別 ──────────────────────────────────────────────────────────────────────

interface ProductRow extends Omit<Product, 'supplier'> {
  variants: ProductVariant[]
  product_images: ProductImage[]
  supplier: Pick<Supplier, 'id' | 'name'> | null
}

interface Props {
  initialProducts: ProductRow[]
  suppliers: Supplier[]
  initialCategories: ProductCategory[]
  initialSupplierId: string
}

type FilterStatus = 'all' | 'active' | 'inactive' | 'soldout'

// ── 輔助常數/函式 ─────────────────────────────────────────────────────────────

const CUR_SYM: Record<string, string> = {
  TWD: 'NT$',
  JPY: '¥',
  KRW: '₩',
  USD: '$',
  HKD: 'HK$',
  GBP: '£',
}

const EARTH_SHADES = [
  'var(--earth-300)',
  'var(--earth-400)',
  'var(--earth-500)',
  'var(--earth-200)',
  'var(--forest-300)',
  'var(--forest-400)',
]
function supplierBg(idx: number) {
  return EARTH_SHADES[idx % EARTH_SHADES.length]
}

function getPriceRange(variants: ProductVariant[]): string {
  if (!variants?.length) return '—'
  const prices = variants.map((v) => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `NT$ ${min.toLocaleString()}`
  return `NT$ ${min.toLocaleString()} – ${max.toLocaleString()}`
}

interface CostInfo {
  twd: string | null
  foreign: string | null
}
function getCostInfo(variants: ProductVariant[]): CostInfo {
  if (!variants?.length) return { twd: null, foreign: null }
  const v = variants[0]
  if (!v.cost) return { twd: null, foreign: null }
  if (v.cost_currency === 'TWD') return { twd: `NT$ ${v.cost.toLocaleString()}`, foreign: null }
  return {
    twd: null,
    foreign: `${CUR_SYM[v.cost_currency] ?? v.cost_currency} ${v.cost.toLocaleString()}`,
  }
}

function getMargin(variants: ProductVariant[]): number | null {
  if (!variants?.length) return null
  const v = variants[0]
  if (!v.cost || v.cost_currency !== 'TWD' || v.price <= 0) return null
  return Math.round(((v.price - v.cost) / v.price) * 100)
}
function marginClass(m: number) {
  if (m >= 45) return 'text-success'
  if (m >= 30) return 'text-fg'
  return 'text-warning'
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active')
    return (
      <span className='inline-flex items-center gap-1 h-6 px-2.5 rounded-pill bg-success-bg text-success font-display font-semibold text-xs'>
        <span className='w-1.5 h-1.5 rounded-pill bg-current' />
        上架中
      </span>
    )
  if (status === 'soldout')
    return (
      <span className='inline-flex items-center gap-1 h-6 px-2.5 rounded-pill bg-danger-bg text-danger font-display font-semibold text-xs'>
        <span className='w-1.5 h-1.5 rounded-pill bg-current' />
        缺貨
      </span>
    )
  return (
    <span className='inline-flex items-center h-6 px-2.5 rounded-pill bg-sunken text-fg-muted font-display font-semibold text-xs'>
      已下架
    </span>
  )
}

function formatEndsAt(endsAt: string): string {
  const d = new Date(endsAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export default function ProductsClient({
  initialProducts,
  suppliers,
  initialCategories,
  initialSupplierId,
}: Props) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')
  const [products, setProducts] = useState<ProductRow[]>(initialProducts)
  const [filterSupplierId, setFilterSupplierId] = useState(initialSupplierId)
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(new Set<string>())
  const [menuProductId, setMenuProductId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [confirmDeactivate, setConfirmDeactivate] = useState<ProductRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ProductRow | null>(null)
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [isPending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  function showToast(msg: string, type: 'success' | 'error') {
    setToastMsg({ msg, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  // 點選 menu 外部時關閉
  useEffect(() => {
    if (!menuProductId) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuProductId(null)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuProductId])

  // 狀態統計（依全部商品，不受 filter 影響）
  const counts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.status === 'active').length,
      inactive: products.filter((p) => p.status === 'inactive').length,
      soldout: products.filter((p) => p.status === 'soldout').length,
    }),
    [products]
  )

  // 篩選後的商品
  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (filterStatus !== 'all' && p.status !== filterStatus) return false
        if (filterSupplierId && p.supplier_id !== filterSupplierId) return false
        if (filterCategoryId && p.category_id !== filterCategoryId) return false
        if (search) {
          const q = search.toLowerCase()
          if (!p.name.toLowerCase().includes(q)) return false
        }
        return true
      }),
    [products, filterStatus, filterSupplierId, filterCategoryId, search]
  )

  // 依廠商分組
  interface Group {
    supplier: Supplier | null
    supIdx: number
    products: ProductRow[]
  }
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const p of filtered) {
      const key = p.supplier_id ?? 'none'
      if (!map.has(key)) {
        const supIdx = p.supplier_id ? suppliers.findIndex((s) => s.id === p.supplier_id) : -1
        const sup = supIdx >= 0 ? suppliers[supIdx] : null
        map.set(key, { supplier: sup, supIdx, products: [] })
      }
      map.get(key)!.products.push(p)
    }
    return Array.from(map.values()).sort((a, b) => {
      if (!a.supplier && b.supplier) return 1
      if (a.supplier && !b.supplier) return -1
      return (a.supplier?.name ?? '').localeCompare(b.supplier?.name ?? '')
    })
  }, [filtered, suppliers])

  const activeSupplier = filterSupplierId ? suppliers.find((s) => s.id === filterSupplierId) : null

  // ── 操作 ─────────────────────────────────────────────────────────────────

  function handleTogglePublic(product: ProductRow) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_public: !product.is_public }),
        })
        const body = (await res.json()) as { error?: string }
        if (!res.ok) {
          showToast(body.error ?? '更新失敗', 'error')
          return
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, is_public: !product.is_public } : p))
        )
      } catch {
        showToast('更新失敗，請稍後再試', 'error')
      }
    })
  }

  function handleToggleStatus(product: ProductRow) {
    if (product.status === 'soldout') return
    if (product.status === 'active') {
      setConfirmDeactivate(product)
    } else {
      doActivate(product)
    }
  }

  function doActivate(product: ProductRow) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        })
        const body = (await res.json()) as { error?: string }
        if (!res.ok) {
          showToast(body.error ?? '更新失敗', 'error')
          return
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, status: 'active' } : p))
        )
        showToast('商品已上架', 'success')
      } catch {
        showToast('更新失敗，請稍後再試', 'error')
      }
    })
  }

  function doDeactivate(product: ProductRow) {
    setConfirmDeactivate(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'inactive' }),
        })
        const body = (await res.json()) as { error?: string }
        if (!res.ok) {
          showToast(body.error ?? '下架失敗', 'error')
          return
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, status: 'inactive' } : p))
        )
        showToast('商品已下架', 'success')
      } catch {
        showToast('下架失敗，請稍後再試', 'error')
      }
    })
  }

  function doDelete(product: ProductRow) {
    setConfirmDelete(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
        const body = (await res.json()) as { error?: string }
        if (!res.ok) {
          showToast(body.error ?? '刪除失敗', 'error')
          return
        }
        setProducts((prev) => prev.filter((p) => p.id !== product.id))
        showToast('商品已刪除', 'success')
      } catch {
        showToast('刪除失敗，請稍後再試', 'error')
      }
    })
  }

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    setMenuProductId(id === menuProductId ? null : id)
  }

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ── 渲染 ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Tab 切換 ─────────────────────────────────────────────────── */}
      <div className='flex items-center gap-1 border-b border-line mb-6'>
        {(['products', 'categories'] as const).map((tab) => (
          <button
            key={tab}
            type='button'
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2.5 font-display font-semibold text-sm border-b-2 -mb-px transition',
              activeTab === tab
                ? 'border-primary text-primary-hv'
                : 'border-transparent text-fg-muted hover:text-fg',
            ].join(' ')}
          >
            {tab === 'products' ? '商品列表' : '分類管理'}
            {tab === 'categories' && initialCategories.length > 0 && (
              <span className='ml-1.5 font-mono text-[11px] px-1.5 py-0.5 rounded-pill bg-sunken text-fg-subtle'>
                {initialCategories.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'categories' && <CategoriesManager initialCategories={initialCategories} />}

      {activeTab === 'products' && (
        <>
          {/* ── Filter toolbar ────────────────────────────────────────── */}
          <section className='bg-surface border border-line rounded-xl p-4 space-y-3 mb-5'>
            {/* 狀態 tabs */}
            <div className='flex items-center gap-1.5 flex-wrap'>
              {[
                { key: 'all' as FilterStatus, label: '全部', dot: false },
                { key: 'active' as FilterStatus, label: '上架中', dot: true },
                { key: 'inactive' as FilterStatus, label: '已下架', dot: false },
                { key: 'soldout' as FilterStatus, label: '缺貨', dot: true },
              ].map(({ key, label, dot }) => {
                const isActive = filterStatus === key
                const styles: Record<FilterStatus, { on: string; off: string }> = {
                  all: {
                    on: 'bg-primary text-white',
                    off: 'bg-sunken text-fg-muted hover:bg-ink-200',
                  },
                  active: {
                    on: 'bg-success-bg text-success',
                    off: 'bg-sunken text-fg-muted hover:bg-ink-200',
                  },
                  inactive: {
                    on: 'bg-sunken text-fg-muted',
                    off: 'bg-sunken text-fg-subtle hover:bg-ink-200',
                  },
                  soldout: {
                    on: 'bg-danger-bg text-danger',
                    off: 'bg-sunken text-fg-muted hover:bg-ink-200',
                  },
                }
                return (
                  <button
                    key={key}
                    type='button'
                    onClick={() => setFilterStatus(key)}
                    className={[
                      'inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill font-display font-semibold text-xs transition',
                      isActive ? styles[key].on : styles[key].off,
                    ].join(' ')}
                  >
                    {dot && isActive && <span className='w-1.5 h-1.5 rounded-pill bg-current' />}
                    {label} <span className='font-mono opacity-80'>{counts[key]}</span>
                  </button>
                )
              })}
              {/* 搜尋 */}
              <div className='flex-1 flex justify-end'>
                <div className='relative'>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='搜尋商品名稱…'
                    className='w-52 h-8 pl-8 pr-3 rounded-pill border border-line bg-surface text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition placeholder:text-fg-subtle'
                  />
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    className='absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none'
                  >
                    <circle cx='11' cy='11' r='6' />
                    <path d='M20 20l-4-4' strokeLinecap='round' />
                  </svg>
                </div>
              </div>
            </div>
            <hr className='border-line' />
            {/* 類別 pills + 廠商 select */}
            <div className='flex items-center gap-3 flex-wrap'>
              <div className='flex items-center gap-1.5 flex-wrap flex-1 min-w-0'>
                <span className='font-mono text-[10px] text-fg-subtle uppercase tracking-wider mr-1 shrink-0'>
                  類別
                </span>
                <button
                  type='button'
                  onClick={() => setFilterCategoryId('')}
                  className={[
                    'h-7 px-3 rounded-pill font-display font-semibold text-xs transition',
                    filterCategoryId === ''
                      ? 'bg-secondary text-white'
                      : 'border border-line text-fg-muted hover:bg-sunken',
                  ].join(' ')}
                >
                  全部
                </button>
                {initialCategories.map((c) => (
                  <button
                    key={c.id}
                    type='button'
                    onClick={() => setFilterCategoryId(c.id === filterCategoryId ? '' : c.id)}
                    className={[
                      'h-7 px-3 rounded-pill font-display font-semibold text-xs transition',
                      filterCategoryId === c.id
                        ? 'bg-secondary text-white'
                        : 'border border-line text-fg-muted hover:bg-sunken',
                    ].join(' ')}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <span className='font-mono text-[10px] text-fg-subtle uppercase tracking-wider'>
                  廠商
                </span>
                <select
                  value={filterSupplierId}
                  onChange={(e) => setFilterSupplierId(e.target.value)}
                  className='h-8 pl-3 pr-8 rounded-pill border border-line bg-surface text-fg font-display font-semibold text-xs outline-none focus:border-primary cursor-pointer'
                  aria-label='廠商篩選'
                >
                  <option value=''>全部廠商</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── 廠商篩選提示橫幅 ──────────────────────────────────────── */}
          {activeSupplier && (
            <div className='flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-secondary-bg border border-line mb-5'>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='var(--c-secondary)'
                strokeWidth='1.9'
                strokeLinecap='round'
              >
                <path d='M3 9l9-5 9 5-9 5-9-5z' />
                <path d='M3 9v7l9 5 9-5V9' />
              </svg>
              <span className='text-sm text-fg'>
                正在檢視供應商 <b className='font-display font-bold'>{activeSupplier.name}</b>{' '}
                的商品
              </span>
              <div className='flex-1' />
              <button
                type='button'
                onClick={() => setFilterSupplierId('')}
                className='inline-flex items-center gap-1 h-7 px-3 rounded-pill bg-surface border border-line text-fg-muted font-display font-semibold text-xs hover:bg-sunken transition'
              >
                <svg
                  width='12'
                  height='12'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2.2'
                  strokeLinecap='round'
                >
                  <path d='M6 6l12 12M6 18L18 6' />
                </svg>
                顯示全部廠商
              </button>
            </div>
          )}

          {/* ── 商品分組 ──────────────────────────────────────────────── */}
          {groups.length === 0 ? (
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
                  <path d='M4 8l8-4 8 4-8 4-8-4z' />
                  <path d='M4 8v8l8 4 8-4V8' />
                </svg>
              </div>
              <div className='font-display font-bold text-base'>找不到符合的商品</div>
              <p className='text-sm text-fg-muted mt-1'>試試調整篩選條件或搜尋關鍵字</p>
            </div>
          ) : (
            <div className='space-y-5'>
              {groups.map(({ supplier, supIdx, products: gProducts }) => {
                const key = supplier?.id ?? 'none'
                const isCollapsed = collapsed.has(key)
                const liveCount = gProducts.filter((p) => p.status === 'active').length
                const bg = supplierBg(supIdx >= 0 ? supIdx : suppliers.length)
                const initial = supplier?.name.charAt(0) ?? '?'

                return (
                  <div
                    key={key}
                    className='bg-surface border border-line rounded-xl overflow-hidden'
                  >
                    {/* Group header */}
                    <div
                      className={[
                        'flex items-center gap-3 px-5 py-3.5 bg-ink-50 cursor-pointer hover:bg-ink-100 transition select-none',
                        isCollapsed ? '' : 'border-b border-line',
                      ].join(' ')}
                      onClick={() => toggleCollapse(key)}
                    >
                      <div
                        className='w-9 h-9 rounded-md flex items-center justify-center text-white font-display font-bold text-sm shrink-0'
                        style={{ background: bg }}
                      >
                        {initial}
                      </div>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span className='font-display font-bold text-base'>
                            {supplier?.name ?? '未指定廠商'}
                          </span>
                          {supplier?.tag && (
                            <span className='inline-flex items-center h-5 px-2 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[10px]'>
                              {supplier.tag}
                            </span>
                          )}
                        </div>
                        <div className='font-mono text-[10px] text-fg-subtle mt-0.5'>
                          {gProducts.length} 件商品 · {liveCount} 上架中
                          {supplier?.currency &&
                            ` · 預設 ${CUR_SYM[supplier.currency] ?? ''} ${supplier.currency}`}
                        </div>
                      </div>
                      <div className='flex-1' />
                      {supplier && (
                        <Link
                          href={`/admin/products/new?supplier=${supplier.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className='hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-pill border border-line text-fg-muted font-display font-semibold text-xs hover:bg-surface transition'
                        >
                          <svg
                            width='13'
                            height='13'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2.2'
                            strokeLinecap='round'
                          >
                            <path d='M12 5v14M5 12h14' />
                          </svg>
                          新增到此廠商
                        </Link>
                      )}
                      <svg
                        width='18'
                        height='18'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2.2'
                        strokeLinecap='round'
                        className={[
                          'text-fg-subtle transition-transform',
                          isCollapsed ? '' : 'rotate-180',
                        ].join(' ')}
                      >
                        <path d='M6 9l6 6 6-6' />
                      </svg>
                    </div>

                    {/* Products table */}
                    {!isCollapsed && (
                      <table className='w-full text-sm table-fixed'>
                        {/* 固定欄寬：防止「無類別」群組的類別欄縮為 0，造成欄位偏移 */}
                        <colgroup>
                          <col />
                          <col className='hidden sm:table-column' style={{ width: '9%' }} />
                          <col className='hidden md:table-column' style={{ width: '13%' }} />
                          <col className='hidden lg:table-column' style={{ width: '10%' }} />
                          <col className='hidden lg:table-column' style={{ width: '8%' }} />
                          <col className='hidden xl:table-column' style={{ width: '7%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '8%' }} />
                          <col className='hidden sm:table-column' style={{ width: '8%' }} />
                          <col style={{ width: '40px' }} />
                        </colgroup>
                        <thead>
                          <tr className='bg-surface'>
                            <th className='text-left pl-5 pr-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted'>
                              商品
                            </th>
                            <th className='text-left px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted hidden sm:table-cell'>
                              類別
                            </th>
                            <th className='text-right px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted hidden md:table-cell'>
                              售價
                            </th>
                            <th className='text-right px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted hidden lg:table-cell'>
                              成本
                            </th>
                            <th className='text-right px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted hidden lg:table-cell'>
                              毛利
                            </th>
                            <th className='text-right px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted hidden xl:table-cell'>
                              瀏覽
                            </th>
                            <th className='px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted'>
                              狀態
                            </th>
                            <th className='px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted'>
                              上架
                            </th>
                            <th className='px-3 py-2.5 font-display font-bold text-[10px] uppercase tracking-wider text-fg-muted hidden sm:table-cell'>
                              公開
                            </th>
                            <th className='w-10' />
                          </tr>
                        </thead>
                        <tbody>
                          {gProducts.map((product) => {
                            const thumb =
                              product.product_images?.[0]?.url ?? product.images?.[0] ?? null
                            const catName = product.category_id
                              ? initialCategories.find((c) => c.id === product.category_id)?.name
                              : null
                            const margin = getMargin(product.variants ?? [])
                            const cost = getCostInfo(product.variants ?? [])
                            const isOff = product.status !== 'active'

                            return (
                              <tr
                                key={product.id}
                                className={[
                                  'border-t border-line hover:bg-ink-50 transition',
                                  isOff ? 'opacity-60' : '',
                                ].join(' ')}
                              >
                                {/* 商品 */}
                                <td className='pl-5 pr-3 py-3'>
                                  <div className='flex items-center gap-3'>
                                    <div className='w-11 h-11 rounded-md border border-line overflow-hidden shrink-0 flex items-center justify-center bg-ink-50'>
                                      {thumb ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={thumb}
                                          alt={product.name}
                                          className='w-full h-full object-cover'
                                        />
                                      ) : (
                                        <div
                                          className='w-full h-full'
                                          style={{
                                            background:
                                              'repeating-linear-gradient(135deg,var(--ink-100),var(--ink-100) 7px,var(--ink-50) 7px,var(--ink-50) 14px)',
                                          }}
                                        />
                                      )}
                                    </div>
                                    <div className='min-w-0'>
                                      <div className='font-semibold truncate'>{product.name}</div>
                                      {product.ends_at && (
                                        <p
                                          className={`text-[10px] font-mono mt-0.5 ${new Date(product.ends_at) <= new Date() ? 'text-danger' : 'text-fg-subtle'}`}
                                        >
                                          截單 {formatEndsAt(product.ends_at)}
                                          {new Date(product.ends_at) <= new Date() && ' · 已截止'}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                {/* 類別 */}
                                <td className='px-3 py-3 hidden sm:table-cell'>
                                  {catName && (
                                    <span className='inline-flex items-center h-5 px-2 rounded-pill bg-sunken text-fg-muted font-display font-semibold text-[10px]'>
                                      {catName}
                                    </span>
                                  )}
                                </td>
                                {/* 售價 */}
                                <td className='px-3 py-3 text-right hidden md:table-cell'>
                                  <div className='font-mono font-semibold text-primary-hv'>
                                    {getPriceRange(product.variants ?? [])}
                                  </div>
                                </td>
                                {/* 成本 */}
                                <td className='px-3 py-3 text-right hidden lg:table-cell'>
                                  {cost.twd && (
                                    <div className='font-mono text-xs text-fg-muted'>
                                      {cost.twd}
                                    </div>
                                  )}
                                  {cost.foreign && (
                                    <div className='font-mono text-[10px] text-fg-subtle'>
                                      {cost.foreign}
                                    </div>
                                  )}
                                  {!cost.twd && !cost.foreign && (
                                    <span className='text-fg-subtle text-xs'>—</span>
                                  )}
                                </td>
                                {/* 毛利 */}
                                <td className='px-3 py-3 text-right hidden lg:table-cell'>
                                  {margin !== null ? (
                                    <span
                                      className={`font-mono font-semibold text-sm ${marginClass(margin)}`}
                                    >
                                      {margin}%
                                    </span>
                                  ) : (
                                    <span className='text-fg-subtle text-xs'>—</span>
                                  )}
                                </td>
                                {/* 瀏覽 */}
                                <td className='px-3 py-3 text-right hidden xl:table-cell'>
                                  <span className='font-mono text-xs text-fg-muted'>
                                    {product.view_count ?? 0}
                                  </span>
                                </td>
                                {/* 狀態 */}
                                <td className='px-3 py-3'>
                                  <StatusBadge status={product.status} />
                                </td>
                                {/* Toggle */}
                                <td className='px-3 py-3'>
                                  <button
                                    type='button'
                                    role='switch'
                                    aria-checked={product.status === 'active'}
                                    onClick={() => handleToggleStatus(product)}
                                    disabled={product.status === 'soldout' || isPending}
                                    title={
                                      product.status === 'soldout'
                                        ? '缺貨中，補貨後可上架'
                                        : '上架 / 下架'
                                    }
                                    className={[
                                      'relative w-10 h-6 rounded-pill transition-colors duration-200',
                                      product.status === 'active' ? 'bg-success' : 'bg-ink-300',
                                      product.status === 'soldout' || isPending
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer',
                                    ].join(' ')}
                                  >
                                    <span
                                      className={[
                                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-pill shadow transition-transform duration-200',
                                        product.status === 'active'
                                          ? 'translate-x-4'
                                          : 'translate-x-0',
                                      ].join(' ')}
                                    />
                                  </button>
                                </td>
                                {/* 公開 */}
                                <td className='px-3 py-3 hidden sm:table-cell'>
                                  <button
                                    type='button'
                                    role='switch'
                                    aria-checked={product.is_public}
                                    onClick={() => handleTogglePublic(product)}
                                    disabled={isPending}
                                    title={product.is_public ? '公開：可被搜尋引擎索引' : '不公開'}
                                    className={[
                                      'relative w-10 h-6 rounded-pill transition-colors duration-200',
                                      product.is_public ? 'bg-secondary' : 'bg-ink-300',
                                      isPending
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'cursor-pointer',
                                    ].join(' ')}
                                  >
                                    <span
                                      className={[
                                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-pill shadow transition-transform duration-200',
                                        product.is_public ? 'translate-x-4' : 'translate-x-0',
                                      ].join(' ')}
                                    />
                                  </button>
                                </td>
                                {/* Kebab */}
                                <td className='pr-4 pl-1 py-3 text-right'>
                                  <button
                                    type='button'
                                    onClick={(e) => openMenu(e, product.id)}
                                    className='w-8 h-8 rounded-pill hover:bg-sunken flex items-center justify-center text-fg-subtle'
                                  >
                                    <svg
                                      width='16'
                                      height='16'
                                      viewBox='0 0 24 24'
                                      fill='currentColor'
                                    >
                                      <circle cx='5' cy='12' r='1.6' />
                                      <circle cx='12' cy='12' r='1.6' />
                                      <circle cx='19' cy='12' r='1.6' />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── 浮動 Kebab 選單 ────────────────────────────────────────── */}
      {menuProductId && (
        <div
          ref={menuRef}
          className='fixed z-40 w-44 bg-surface border border-line rounded-lg py-1.5 shadow-lg'
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            type='button'
            onClick={() => {
              router.push(`/admin/products/${menuProductId}/edit`)
              setMenuProductId(null)
            }}
            className='w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-sunken text-left text-fg'
          >
            <svg
              width='15'
              height='15'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              className='text-fg-subtle'
            >
              <path d='M4 20h4l10-10-4-4L4 16v4z' />
              <path d='M13.5 6.5l4 4' />
            </svg>
            編輯商品
          </button>
          <div className='h-px bg-line my-1.5' />
          <button
            type='button'
            onClick={() => {
              const p = products.find((x) => x.id === menuProductId)
              if (p) setConfirmDelete(p)
              setMenuProductId(null)
            }}
            className='w-full flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-danger-bg text-danger text-left'
          >
            <svg
              width='15'
              height='15'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
            >
              <path d='M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13' />
            </svg>
            刪除商品
          </button>
        </div>
      )}

      {/* ── 下架確認 Modal ────────────────────────────────────────── */}
      {confirmDeactivate && (
        <div
          role='dialog'
          aria-modal='true'
          className='fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px]'
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDeactivate(null)
          }}
        >
          <div className='bg-surface rounded-2xl p-6 w-[360px] shadow-xl'>
            <div className='w-12 h-12 rounded-pill bg-warning-bg flex items-center justify-center mb-4'>
              <svg
                width='22'
                height='22'
                viewBox='0 0 24 24'
                fill='none'
                stroke='var(--c-warning)'
                strokeWidth='1.9'
                strokeLinecap='round'
              >
                <path d='M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z' />
              </svg>
            </div>
            <h3 className='font-display font-bold text-lg'>確定下架商品？</h3>
            <p className='text-sm text-fg-muted mt-2 leading-relaxed'>
              「{confirmDeactivate.name}」下架後將不顯示於顧客端及公開頁面。
            </p>
            <div className='flex items-center gap-2 mt-6'>
              <button
                type='button'
                onClick={() => setConfirmDeactivate(null)}
                className='flex-1 h-11 rounded-pill border border-line text-fg font-display font-semibold text-sm hover:bg-sunken transition'
              >
                取消
              </button>
              <button
                type='button'
                onClick={() => doDeactivate(confirmDeactivate)}
                className='flex-1 h-11 rounded-pill bg-warning text-white font-display font-semibold text-sm hover:brightness-95 active:scale-[.97] transition'
              >
                確定下架
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 刪除確認 Modal ────────────────────────────────────────── */}
      {confirmDelete && (
        <div
          role='dialog'
          aria-modal='true'
          className='fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px]'
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(null)
          }}
        >
          <div className='bg-surface rounded-2xl p-6 w-[360px] shadow-xl'>
            <div className='w-12 h-12 rounded-pill bg-danger-bg flex items-center justify-center mb-4'>
              <svg
                width='22'
                height='22'
                viewBox='0 0 24 24'
                fill='none'
                stroke='var(--c-danger)'
                strokeWidth='1.9'
                strokeLinecap='round'
              >
                <path d='M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13M10 11v6M14 11v6' />
              </svg>
            </div>
            <h3 className='font-display font-bold text-lg'>刪除商品「{confirmDelete.name}」？</h3>
            <p className='text-sm text-fg-muted mt-2 leading-relaxed'>
              刪除後此商品連結將失效，顧客前台不再顯示。歷史訂單紀錄不受影響。此動作無法復原。
            </p>
            <div className='flex items-center gap-2 mt-6'>
              <button
                type='button'
                onClick={() => setConfirmDelete(null)}
                className='flex-1 h-11 rounded-pill border border-line text-fg font-display font-semibold text-sm hover:bg-sunken transition'
              >
                取消
              </button>
              <button
                type='button'
                onClick={() => doDelete(confirmDelete)}
                className='flex-1 h-11 rounded-pill bg-danger text-white font-display font-semibold text-sm hover:brightness-95 active:scale-[.97] transition'
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toastMsg && (
        <div
          role='status'
          aria-live='polite'
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-xl shadow-lg text-sm font-display font-semibold text-white transition-all ${toastMsg.type === 'success' ? 'bg-success' : 'bg-danger'}`}
        >
          {toastMsg.msg}
        </div>
      )}
    </>
  )
}

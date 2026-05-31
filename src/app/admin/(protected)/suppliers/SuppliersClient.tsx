'use client'

import Link from 'next/link'
import { useTransition, useState } from 'react'
import type { Supplier } from '@/types'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/Modal'

// ── 型別 ──────────────────────────────────────────────────────────────────────

interface SupplierWithCount extends Supplier {
  productCount: number
}

interface Props {
  initialSuppliers: SupplierWithCount[]
  totalProducts: number
}

type Currency = 'TWD' | 'JPY' | 'USD' | 'HKD'

interface DrawerForm {
  name: string
  tag: string
  line_group: string
  phone: string
  currency: Currency
  avg_arrival_days: string
  note: string
}

const CURRENCIES: Currency[] = ['TWD', 'JPY', 'USD', 'HKD']
const CUR_SYM: Record<Currency, string> = { TWD: 'NT$', JPY: '¥', USD: '$', HKD: 'HK$' }
const EARTH_SHADES = [
  'var(--earth-300)',
  'var(--earth-400)',
  'var(--earth-500)',
  'var(--earth-200)',
  'var(--forest-300)',
  'var(--forest-400)',
]

function avatarBg(index: number) {
  return EARTH_SHADES[index % EARTH_SHADES.length]
}

const FLD =
  'w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition placeholder:text-fg-subtle'

function emptyForm(): DrawerForm {
  return {
    name: '',
    tag: '',
    line_group: '',
    phone: '',
    currency: 'TWD',
    avg_arrival_days: '',
    note: '',
  }
}

function supplierToForm(s: Supplier): DrawerForm {
  return {
    name: s.name,
    tag: s.tag ?? '',
    line_group: s.line_group ?? '',
    phone: s.phone ?? '',
    currency: s.currency ?? 'TWD',
    avg_arrival_days: s.avg_arrival_days != null ? String(s.avg_arrival_days) : '',
    note: s.note ?? '',
  }
}

// ── 主元件 ────────────────────────────────────────────────────────────────────

export default function SuppliersClient({ initialSuppliers, totalProducts }: Props) {
  const [suppliers, setSuppliers] = useState<SupplierWithCount[]>(initialSuppliers)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<DrawerForm>(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<SupplierWithCount | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toasts, toast, dismiss } = useToast()

  const setField = <K extends keyof DrawerForm>(k: K, v: DrawerForm[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setDrawerOpen(true)
  }

  function openEdit(s: SupplierWithCount) {
    setEditingId(s.id)
    setForm(supplierToForm(s))
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast('廠商名稱為必填', 'error')
      return
    }
    startTransition(async () => {
      try {
        const payload = {
          name: form.name.trim(),
          tag: form.tag.trim() || null,
          line_group: form.line_group.trim() || null,
          phone: form.phone.trim() || null,
          currency: form.currency,
          avg_arrival_days: form.avg_arrival_days ? Number(form.avg_arrival_days) : null,
          note: form.note.trim() || null,
        }
        const url = editingId ? `/api/suppliers/${editingId}` : '/api/suppliers'
        const method = editingId ? 'PATCH' : 'POST'
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = (await res.json()) as { success?: boolean; data?: Supplier; error?: string }
        if (!res.ok || !json.success) {
          toast(json.error ?? '儲存失敗', 'error')
          return
        }
        const updated = json.data!
        if (editingId) {
          setSuppliers((prev) =>
            prev.map((s) => (s.id === editingId ? { ...updated, productCount: s.productCount } : s))
          )
          toast('廠商已更新', 'success')
        } else {
          setSuppliers((prev) => [{ ...updated, productCount: 0 }, ...prev])
          toast('已新增廠商', 'success')
        }
        closeDrawer()
      } catch {
        toast('儲存失敗，請稍後再試', 'error')
      }
    })
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/suppliers/${deleteTarget.id}`, { method: 'DELETE' })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          toast(json.error ?? '刪除失敗', 'error')
          setDeleteTarget(null)
          return
        }
        setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id))
        toast(`已刪除「${deleteTarget.name}」`, 'success')
        setDeleteTarget(null)
        if (editingId === deleteTarget.id) closeDrawer()
      } catch {
        toast('刪除失敗，請稍後再試', 'error')
        setDeleteTarget(null)
      }
    })
  }

  const totalSuppliers = suppliers.length
  const realTotalProducts = suppliers.reduce((s, sup) => s + sup.productCount, 0) || totalProducts

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Page-level sticky topbar ──────────────────────────────────────── */}
      <div className='sticky top-0 md:top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md px-8 py-5'>
        <div className='font-mono text-[11px] text-fg-subtle mb-2 flex items-center gap-1.5'>
          <Link href='/admin' className='hover:text-fg'>
            後台
          </Link>
          <span>›</span>
          <span className='text-fg'>供應商</span>
        </div>
        <div className='flex items-center justify-between gap-4 flex-wrap'>
          <div>
            <h1 className='font-display font-bold text-2xl'>供應商</h1>
            <p className='text-sm text-fg-muted mt-0.5'>
              共 <b className='text-fg'>{totalSuppliers}</b> 家供應商 · 串接{' '}
              <b className='text-fg'>{realTotalProducts}</b> 件商品
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <div className='relative hidden lg:block'>
              <input
                className='w-64 h-10 pl-10 pr-4 rounded-pill border border-line bg-surface outline-none focus:border-primary focus:shadow-[0_0_0_4px_var(--c-primary-bg)] transition text-sm placeholder:text-fg-subtle'
                placeholder='搜尋供應商名稱…'
              />
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
                className='absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none'
              >
                <circle cx='11' cy='11' r='6' />
                <path d='M20 20l-4-4' />
              </svg>
            </div>
            <button
              type='button'
              onClick={openAdd}
              className='inline-flex items-center gap-2 h-10 rounded-pill bg-primary text-white px-5 font-display font-semibold text-sm shadow-pink hover:bg-primary-hv active:scale-[.97] transition'
            >
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.2'
                strokeLinecap='round'
              >
                <path d='M12 5v14M5 12h14' />
              </svg>
              新增供應商
            </button>
          </div>
        </div>
      </div>

      {/* ── Mini stats ──────────────────────────────────────────────────────── */}
      <div className='px-8 pt-6 pb-0'>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-[1180px]'>
          <div className='bg-surface border border-line rounded-xl p-4'>
            <div className='font-mono text-[10px] text-fg-subtle tracking-[0.12em] uppercase'>
              供應商總數
            </div>
            <div className='flex items-baseline gap-1.5 mt-1'>
              <span className='font-display font-bold text-2xl'>{totalSuppliers}</span>
              <span className='text-xs text-fg-muted'>家</span>
            </div>
          </div>
          <div className='bg-surface border border-line rounded-xl p-4'>
            <div className='font-mono text-[10px] text-fg-subtle tracking-[0.12em] uppercase'>
              串接商品
            </div>
            <div className='flex items-baseline gap-1.5 mt-1'>
              <span className='font-display font-bold text-2xl'>{realTotalProducts}</span>
              <span className='text-xs text-fg-muted'>件</span>
            </div>
          </div>
          <div className='bg-surface border border-line rounded-xl p-4'>
            <div className='font-mono text-[10px] text-fg-subtle tracking-[0.12em] uppercase'>
              本月採購額
            </div>
            <div className='flex items-baseline gap-1.5 mt-1'>
              <span className='font-mono text-fg-subtle text-sm'>NT$</span>
              <span className='font-display font-bold text-2xl text-fg-subtle'>—</span>
            </div>
          </div>
          <div className='bg-surface border border-line rounded-xl p-4'>
            <div className='font-mono text-[10px] text-fg-subtle tracking-[0.12em] uppercase'>
              平均到貨
            </div>
            <div className='flex items-baseline gap-1.5 mt-1'>
              {(() => {
                const withDays = suppliers.filter((s) => s.avg_arrival_days != null)
                const avg =
                  withDays.length > 0
                    ? (
                        withDays.reduce((sum, s) => sum + (s.avg_arrival_days ?? 0), 0) /
                        withDays.length
                      ).toFixed(1)
                    : null
                return avg ? (
                  <>
                    <span className='font-display font-bold text-2xl'>{avg}</span>
                    <span className='text-xs text-fg-muted'>天</span>
                  </>
                ) : (
                  <span className='font-display font-bold text-2xl text-fg-subtle'>—</span>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Supplier card grid ───────────────────────────────────────────────── */}
      <div className='px-8 py-6 max-w-[1180px]'>
        <div className='flex items-center gap-2 mb-5'>
          <span className='font-display font-bold'>所有供應商</span>
          <span className='font-mono text-xs px-2 py-0.5 rounded-pill bg-sunken text-fg-muted'>
            {totalSuppliers}
          </span>
        </div>

        {suppliers.length === 0 ? (
          <div className='text-center py-20 bg-surface border border-line rounded-xl'>
            <div className='w-14 h-14 mx-auto rounded-2xl bg-sunken flex items-center justify-center mb-4'>
              <svg
                width='26'
                height='26'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
              >
                <path d='M3 9l9-5 9 5-9 5-9-5z' />
                <path d='M3 9v7l9 5 9-5V9' />
              </svg>
            </div>
            <p className='font-display font-semibold text-fg-muted'>尚未新增廠商</p>
            <button
              type='button'
              onClick={openAdd}
              className='mt-4 inline-flex items-center gap-1.5 h-9 px-5 rounded-pill bg-primary text-white text-sm font-display font-semibold shadow-pink hover:bg-primary-hv transition'
            >
              新增第一家廠商
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5'>
            {suppliers.map((s, idx) => (
              <SupplierCard
                key={s.id}
                supplier={s}
                avatarBg={avatarBg(idx)}
                onEdit={() => openEdit(s)}
                onDelete={() => setDeleteTarget(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Slide-over drawer ────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className='fixed inset-0 z-40 flex'>
          <div
            className='absolute inset-0'
            style={{ background: 'rgba(28,54,16,0.35)' }}
            onClick={closeDrawer}
          />
          <div className='absolute top-0 right-0 h-full w-full max-w-[460px] bg-surface shadow-lg flex flex-col'>
            {/* header */}
            <div className='px-6 py-5 border-b border-line flex items-start justify-between shrink-0'>
              <div>
                <div className='font-mono text-[11px] text-fg-subtle tracking-[0.12em] uppercase'>
                  {editingId ? '編輯供應商' : '新增供應商'}
                </div>
                <h2 className='font-display font-bold text-xl mt-1'>
                  {editingId ? form.name || '編輯供應商' : '新增供應商'}
                </h2>
              </div>
              <button
                type='button'
                onClick={closeDrawer}
                className='w-9 h-9 rounded-pill hover:bg-sunken flex items-center justify-center text-fg-subtle'
              >
                <svg
                  width='18'
                  height='18'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                >
                  <path d='M6 6l12 12M6 18L18 6' />
                </svg>
              </button>
            </div>

            {/* body */}
            <div className='flex-1 overflow-y-auto px-6 py-5 space-y-5'>
              {/* name */}
              <div>
                <label className='block text-sm font-semibold mb-2'>
                  廠商名稱 <span className='text-danger'>*</span>
                </label>
                <input
                  className={FLD}
                  placeholder='例：MIKI 日系選品'
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  maxLength={30}
                />
              </div>

              {/* tag */}
              <div>
                <label className='block text-sm font-semibold mb-2'>廠商標記（簡稱）</label>
                <div className='flex items-center gap-3'>
                  <input
                    className={`${FLD} font-mono`}
                    style={{ maxWidth: 160 }}
                    placeholder='MIKI'
                    maxLength={8}
                    value={form.tag}
                    onChange={(e) => setField('tag', e.target.value)}
                  />
                  <span className='text-xs text-fg-subtle'>預覽</span>
                  <span className='inline-flex items-center h-6 px-2.5 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[11px]'>
                    {form.tag || '標記'}
                  </span>
                </div>
                <p className='text-xs text-fg-subtle mt-1.5'>顯示於訂單與商品列表的廠商標記。</p>
              </div>

              <hr className='border-line' />

              {/* line_group */}
              <div>
                <label className='block text-sm font-semibold mb-2'>LINE 群組 / 聯絡名稱</label>
                <div className='relative'>
                  <input
                    className={`${FLD} pl-10`}
                    placeholder='例：MIKI 批發團 2024'
                    value={form.line_group}
                    onChange={(e) => setField('line_group', e.target.value)}
                  />
                  <svg
                    width='17'
                    height='17'
                    viewBox='0 0 24 24'
                    className='absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle'
                    fill='currentColor'
                  >
                    <path d='M12 3C6.5 3 2 6.6 2 11c0 2.5 1.5 4.8 3.8 6.3-.1.6-.6 2.2-.7 2.6 0 0 0 .2.1.3.1 0 .2 0 .3 0 .4-.3 3-2 3.5-2.4.9.1 1.8.2 2.7.2 5.5 0 10-3.6 10-8S17.5 3 12 3z' />
                  </svg>
                </div>
              </div>

              {/* phone */}
              <div>
                <label className='block text-sm font-semibold mb-2'>
                  聯絡電話 <span className='font-normal text-fg-subtle'>（選填）</span>
                </label>
                <input
                  className={`${FLD} font-mono`}
                  placeholder='0912-345-678'
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </div>

              <hr className='border-line' />

              {/* currency */}
              <div>
                <label className='block text-sm font-semibold mb-2'>預設批發幣別</label>
                <div className='flex items-center gap-1 bg-sunken p-1 rounded-pill w-fit'>
                  {CURRENCIES.map((c) => (
                    <button
                      key={c}
                      type='button'
                      onClick={() => setField('currency', c)}
                      className={[
                        'h-8 px-4 rounded-pill font-display font-semibold text-xs transition',
                        form.currency === c
                          ? 'bg-surface text-primary-hv shadow-sm'
                          : 'text-fg-muted hover:text-fg',
                      ].join(' ')}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className='text-xs text-fg-subtle mt-1.5'>新增商品時，批發價預設帶入此幣別。</p>
              </div>

              {/* avg_arrival_days */}
              <div>
                <label className='block text-sm font-semibold mb-2'>
                  平均到貨天數 <span className='font-normal text-fg-subtle'>（選填）</span>
                </label>
                <div className='flex items-center gap-2'>
                  <input
                    type='number'
                    min='0'
                    className={`${FLD} font-mono`}
                    style={{ maxWidth: 120 }}
                    placeholder='5'
                    value={form.avg_arrival_days}
                    onChange={(e) => setField('avg_arrival_days', e.target.value)}
                  />
                  <span className='text-sm text-fg-muted'>天</span>
                </div>
              </div>

              {/* note */}
              <div>
                <label className='block text-sm font-semibold mb-2'>
                  備註 <span className='font-normal text-fg-subtle'>（選填）</span>
                </label>
                <textarea
                  className={`${FLD} resize-y`}
                  style={{ minHeight: 84 }}
                  placeholder='出貨習慣、最低訂購量、匯款資訊…'
                  value={form.note}
                  onChange={(e) => setField('note', e.target.value)}
                />
              </div>
            </div>

            {/* footer */}
            <div className='px-6 py-4 border-t border-line flex items-center gap-2 bg-surface shrink-0'>
              {editingId && (
                <button
                  type='button'
                  onClick={() => {
                    const target = suppliers.find((s) => s.id === editingId)
                    if (target) {
                      closeDrawer()
                      setTimeout(() => setDeleteTarget(target), 50)
                    }
                  }}
                  className='inline-flex items-center gap-1.5 h-10 px-4 rounded-pill text-danger font-display font-semibold text-sm hover:bg-danger-bg transition'
                >
                  <svg
                    width='15'
                    height='15'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.9'
                    strokeLinecap='round'
                  >
                    <path d='M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13' />
                  </svg>
                  刪除
                </button>
              )}
              <div className='flex-1' />
              <button
                type='button'
                onClick={closeDrawer}
                className='h-10 px-5 rounded-pill border border-line text-fg font-display font-semibold text-sm hover:bg-sunken transition'
              >
                取消
              </button>
              <button
                type='button'
                onClick={handleSave}
                disabled={isPending}
                className='h-10 px-6 rounded-pill bg-primary text-white font-display font-semibold text-sm shadow-pink hover:bg-primary-hv active:scale-[.97] transition disabled:opacity-60'
              >
                {isPending ? '儲存中…' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmModal
          title={`刪除廠商「${deleteTarget.name}」？`}
          message={
            deleteTarget.productCount > 0
              ? `此廠商目前串接 ${deleteTarget.productCount} 件商品。刪除後這些商品的廠商標記會被清空，歷史訂單紀錄不受影響。此動作無法復原。`
              : '此動作無法復原。'
          }
          confirmLabel='確定刪除'
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isLoading={isPending}
          danger
        />
      )}
    </>
  )
}

// ── Supplier Card ─────────────────────────────────────────────────────────────

function SupplierCard({
  supplier: s,
  avatarBg: bg,
  onEdit,
  onDelete,
}: {
  supplier: SupplierWithCount
  avatarBg: string
  onEdit: () => void
  onDelete: () => void
}) {
  const initial = s.name.charAt(0)
  const inactive = s.productCount === 0

  return (
    <div className='bg-surface border border-line rounded-xl p-5 flex flex-col hover:shadow-md hover:border-transparent transition group'>
      {/* head */}
      <div className='flex items-start gap-3'>
        <div
          className='w-12 h-12 rounded-lg flex items-center justify-center text-white font-display font-bold text-lg shrink-0'
          style={{ background: bg }}
        >
          {initial}
        </div>
        <div className='min-w-0 flex-1'>
          <h3 className='font-display font-bold text-base truncate'>{s.name}</h3>
          <div className='flex items-center gap-1.5 mt-1 flex-wrap'>
            {s.tag && (
              <span className='inline-flex items-center h-5 px-2 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[10px]'>
                {s.tag}
              </span>
            )}
            <span className='inline-flex items-center gap-1 h-5 px-2 rounded-pill bg-sunken text-fg-muted font-mono text-[10px]'>
              {CUR_SYM[s.currency]} {s.currency}
            </span>
          </div>
        </div>
        <button
          type='button'
          onClick={onEdit}
          className='w-8 h-8 rounded-pill hover:bg-sunken flex items-center justify-center text-fg-subtle opacity-0 group-hover:opacity-100 transition shrink-0'
          aria-label='編輯'
        >
          <svg
            width='15'
            height='15'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.9'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M4 20h4l10-10-4-4L4 16v4z' />
            <path d='M13.5 6.5l4 4' />
          </svg>
        </button>
      </div>

      {/* contact */}
      <div className='mt-4 space-y-1.5 text-sm'>
        <div className='flex items-center gap-2 text-fg-muted'>
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='currentColor'
            className='shrink-0 text-fg-subtle'
          >
            <path d='M12 3C6.5 3 2 6.6 2 11c0 2.5 1.5 4.8 3.8 6.3-.1.6-.6 2.2-.7 2.6 0 0 0 .2.1.3.1 0 .2 0 .3 0 .4-.3 3-2 3.5-2.4.9.1 1.8.2 2.7.2 5.5 0 10-3.6 10-8S17.5 3 12 3z' />
          </svg>
          <span className='truncate text-sm'>{s.line_group || '—'}</span>
        </div>
        <div className='flex items-center gap-2 text-fg-muted'>
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.7'
            className='shrink-0 text-fg-subtle'
            strokeLinecap='round'
          >
            <path d='M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5V18a2 2 0 01-2 2A14 14 0 015 6a2 2 0 010-2z' />
          </svg>
          <span className='font-mono text-xs'>{s.phone || '未填'}</span>
        </div>
      </div>

      {/* stats */}
      <div className='mt-4 grid grid-cols-3 gap-2 rounded-lg bg-ink-50 p-3'>
        <div className='text-center'>
          <div
            className={`font-display font-bold text-lg leading-none ${inactive ? 'text-fg-subtle' : ''}`}
          >
            {s.productCount}
          </div>
          <div className='font-mono text-[9px] text-fg-subtle uppercase tracking-wider mt-1'>
            商品
          </div>
        </div>
        <div className='text-center border-x border-line'>
          <div className='font-display font-bold text-lg leading-none text-fg-subtle'>—</div>
          <div className='font-mono text-[9px] text-fg-subtle uppercase tracking-wider mt-1'>
            進行中
          </div>
        </div>
        <div className='text-center'>
          <div className='font-display font-bold text-lg leading-none'>
            {s.avg_arrival_days != null ? (
              <>
                {s.avg_arrival_days}
                <span className='text-xs font-normal text-fg-subtle'>天</span>
              </>
            ) : (
              <span className='text-fg-subtle'>—</span>
            )}
          </div>
          <div className='font-mono text-[9px] text-fg-subtle uppercase tracking-wider mt-1'>
            平均到貨
          </div>
        </div>
      </div>

      {/* note */}
      {s.note && (
        <p className='mt-3 text-xs text-fg-muted leading-relaxed line-clamp-2'>{s.note}</p>
      )}

      {/* footer actions */}
      <div className='mt-4 pt-3.5 border-t border-line flex items-center gap-2'>
        <button
          type='button'
          onClick={onEdit}
          className='flex-1 h-9 rounded-pill border border-line text-fg font-display font-semibold text-xs hover:bg-sunken transition'
        >
          編輯
        </button>
        <Link
          href={`/admin/products?supplier=${s.id}`}
          className='flex-1 h-9 rounded-pill bg-secondary-bg text-secondary font-display font-semibold text-xs hover:bg-secondary hover:text-white transition flex items-center justify-center gap-1'
        >
          查看商品
          <svg
            width='12'
            height='12'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.2'
            strokeLinecap='round'
          >
            <path d='M9 6l6 6-6 6' />
          </svg>
        </Link>
        <button
          type='button'
          onClick={onDelete}
          className='w-9 h-9 rounded-pill text-fg-subtle hover:bg-danger-bg hover:text-danger flex items-center justify-center transition'
          aria-label='刪除'
        >
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.9'
            strokeLinecap='round'
          >
            <path d='M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13' />
          </svg>
        </button>
      </div>
    </div>
  )
}

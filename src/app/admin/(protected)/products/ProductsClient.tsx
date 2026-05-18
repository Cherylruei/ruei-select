'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Product, ProductVariant, Supplier, ProductCategory } from '@/types'
import CategoriesManager from '@/components/products/CategoriesManager'

interface ProductRow extends Product {
  variants: ProductVariant[]
  supplier: Supplier | null
}

interface Props {
  initialProducts: ProductRow[]
  suppliers: Supplier[]
  initialCategories: ProductCategory[]
}

interface ToastState {
  message: string
  type: 'success' | 'error'
}

function getPriceRange(variants: ProductVariant[]): string {
  if (!variants || variants.length === 0) return '未設定'
  const prices = variants.map((v) => v.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `NT$ ${min.toLocaleString()}`
  return `NT$ ${min.toLocaleString()} ~ ${max.toLocaleString()}`
}

function formatEndsAt(endsAt: string): string {
  const d = new Date(endsAt)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function ProductsClient({ initialProducts, suppliers, initialCategories }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')
  const [products, setProducts] = useState<ProductRow[]>(initialProducts)
  const [filterSupplierId, setFilterSupplierId] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()
  const [confirmDeactivate, setConfirmDeactivate] = useState<ProductRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ProductRow | null>(null)

  function showToast(message: string, type: ToastState['type']) {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = products.filter((p) => {
    if (filterSupplierId && p.supplier_id !== filterSupplierId) return false
    if (filterCategoryId && p.category_id !== filterCategoryId) return false
    return true
  })

  async function handleTogglePublic(product: ProductRow) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_public: !product.is_public }),
        })
        const body = await res.json()
        if (!res.ok) {
          showToast(body.error || '更新失敗', 'error')
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

  async function handleDeactivate(product: ProductRow) {
    setConfirmDeactivate(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'inactive' }),
        })
        const body = await res.json()
        if (!res.ok) {
          showToast(body.error || '下架失敗', 'error')
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

  async function handleActivate(product: ProductRow) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        })
        const body = await res.json()
        if (!res.ok) {
          showToast(body.error || '上架失敗', 'error')
          return
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, status: 'active' } : p))
        )
        showToast('商品已上架', 'success')
      } catch {
        showToast('上架失敗，請稍後再試', 'error')
      }
    })
  }

  async function handleDelete(product: ProductRow) {
    setConfirmDelete(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
        const body = await res.json()
        if (!res.ok) {
          showToast(body.error || '刪除失敗', 'error')
          return
        }
        setProducts((prev) => prev.filter((p) => p.id !== product.id))
        showToast('商品已刪除', 'success')
      } catch {
        showToast('刪除失敗，請稍後再試', 'error')
      }
    })
  }

  return (
    <>
      {/* Tab 切換 */}
      <div className='flex items-center gap-1 mb-5 border-b border-[var(--neutral-200)]'>
        <button
          type='button'
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'products'
              ? 'border-[var(--forest-base)] text-[var(--forest-base)]'
              : 'border-transparent text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
          }`}
        >
          商品列表
        </button>
        <button
          type='button'
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'categories'
              ? 'border-[var(--forest-base)] text-[var(--forest-base)]'
              : 'border-transparent text-[var(--neutral-500)] hover:text-[var(--neutral-700)]'
          }`}
        >
          分類管理
          {initialCategories.length > 0 && (
            <span className='ml-1.5 text-[11px] bg-[var(--neutral-100)] text-[var(--neutral-500)] px-1.5 py-0.5 rounded-full'>
              {initialCategories.length}
            </span>
          )}
        </button>
      </div>

      {/* 分類管理 tab */}
      {activeTab === 'categories' && <CategoriesManager initialCategories={initialCategories} />}

      {/* 商品列表 tab */}
      {activeTab === 'products' && (
        <>
          {/* 工具列 */}
          <div className='flex items-center justify-between gap-3 mb-5'>
            <div className='flex items-center gap-3 flex-wrap'>
              <select
                value={filterSupplierId}
                onChange={(e) => setFilterSupplierId(e.target.value)}
                className='border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-[13px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)]'
                aria-label='廠商篩選'
              >
                <option value=''>全部廠商</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {initialCategories.length > 0 && (
                <select
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className='border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-[13px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)]'
                  aria-label='分類篩選'
                >
                  <option value=''>全部分類</option>
                  {initialCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              <span className='text-[12.5px] text-[var(--neutral-400)]'>
                {filtered.length} 個商品
              </span>
            </div>
            <Link
              href='/admin/products/new'
              className='flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--forest-base)] text-white text-[12.5px] font-medium hover:bg-[var(--forest-deep)] transition-colors'
            >
              <svg
                viewBox='0 0 24 24'
                width='14'
                height='14'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
                aria-hidden='true'
              >
                <line x1='12' y1='5' x2='12' y2='19' />
                <line x1='5' y1='12' x2='19' y2='12' />
              </svg>
              新增商品
            </Link>
          </div>

          {/* 空狀態 */}
          {filtered.length === 0 && (
            <div className='bg-white border border-[var(--neutral-200)] rounded-xl px-6 py-14 text-center'>
              <svg
                viewBox='0 0 24 24'
                width='32'
                height='32'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.4'
                className='mx-auto mb-3 text-[var(--neutral-300)]'
                aria-hidden='true'
              >
                <rect x='2' y='3' width='20' height='14' rx='2' />
                <line x1='8' y1='21' x2='16' y2='21' />
                <line x1='12' y1='17' x2='12' y2='21' />
              </svg>
              <p className='text-[14px] font-medium text-[var(--neutral-600)] mb-1'>
                {filterSupplierId || filterCategoryId ? '此條件下無商品' : '尚未新增商品'}
              </p>
              <p className='text-[12.5px] text-[var(--neutral-400)]'>點擊「新增商品」開始上架</p>
            </div>
          )}

          {/* 商品列表 */}
          {filtered.length > 0 && (
            <div className='bg-white border border-[var(--neutral-200)] rounded-xl overflow-hidden'>
              <table className='w-full text-[13px]'>
                <thead>
                  <tr className='border-b border-[var(--neutral-100)]'>
                    <th className='text-left px-4 py-3 text-[12px] font-medium text-[var(--neutral-500)] w-[60px]'>
                      圖
                    </th>
                    <th className='text-left px-4 py-3 text-[12px] font-medium text-[var(--neutral-500)]'>
                      商品名稱
                    </th>
                    <th className='text-left px-4 py-3 text-[12px] font-medium text-[var(--neutral-500)] hidden sm:table-cell'>
                      廠商
                    </th>
                    <th className='text-left px-4 py-3 text-[12px] font-medium text-[var(--neutral-500)] hidden md:table-cell'>
                      售價
                    </th>
                    <th className='text-center px-4 py-3 text-[12px] font-medium text-[var(--neutral-500)]'>
                      狀態
                    </th>
                    <th className='text-center px-4 py-3 text-[12px] font-medium text-[var(--neutral-500)] hidden sm:table-cell'>
                      公開
                    </th>
                    <th className='text-right px-4 py-3 text-[12px] font-medium text-[var(--neutral-500)]'>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const thumb = product.product_images?.[0]?.url || (product.images?.[0] ?? null)
                    const categoryName = product.category_id
                      ? initialCategories.find((c) => c.id === product.category_id)?.name
                      : null
                    return (
                      <tr
                        key={product.id}
                        className='border-b border-[var(--neutral-100)] last:border-0 hover:bg-[var(--neutral-50)] transition-colors'
                      >
                        <td className='px-4 py-3'>
                          <div className='w-10 h-10 rounded-lg overflow-hidden border border-[var(--neutral-200)] bg-[var(--neutral-100)] flex items-center justify-center'>
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt={product.name}
                                className='w-full h-full object-cover'
                              />
                            ) : (
                              <svg
                                viewBox='0 0 24 24'
                                width='16'
                                height='16'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='1.5'
                                className='text-[var(--neutral-300)]'
                                aria-hidden='true'
                              >
                                <rect x='3' y='3' width='18' height='18' rx='2' />
                                <circle cx='8.5' cy='8.5' r='1.5' />
                                <polyline points='21 15 16 10 5 21' />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          <p className='font-medium text-[var(--neutral-800)] line-clamp-1'>
                            {product.name}
                          </p>
                          <div className='flex items-center gap-2 mt-0.5'>
                            {categoryName && (
                              <span className='text-[10.5px] px-1.5 py-0.5 rounded bg-[var(--forest-50)] text-[var(--forest-base)] border border-[var(--forest-100)]'>
                                {categoryName}
                              </span>
                            )}
                            {product.ends_at && (
                              <p
                                className={`text-[11px] ${new Date(product.ends_at) <= new Date() ? 'text-[var(--color-error)]' : 'text-[var(--neutral-400)]'}`}
                              >
                                截單：{formatEndsAt(product.ends_at)}
                                {new Date(product.ends_at) <= new Date() && ' · 已截止'}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className='px-4 py-3 hidden sm:table-cell text-[var(--neutral-500)]'>
                          {product.supplier?.name ?? '—'}
                        </td>
                        <td className='px-4 py-3 hidden md:table-cell text-[var(--sakura-base)] font-medium'>
                          {getPriceRange(product.variants ?? [])}
                        </td>
                        <td className='px-4 py-3 text-center'>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${product.status === 'active' ? 'bg-[var(--forest-50)] text-[var(--forest-deep)]' : 'bg-[var(--neutral-100)] text-[var(--neutral-500)]'}`}
                          >
                            {product.status === 'active' ? '上架' : '下架'}
                          </span>
                        </td>
                        <td className='px-4 py-3 text-center hidden sm:table-cell'>
                          <button
                            type='button'
                            role='switch'
                            aria-checked={product.is_public}
                            onClick={() => void handleTogglePublic(product)}
                            disabled={isPending}
                            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${product.is_public ? 'bg-[var(--forest-base)]' : 'bg-[var(--neutral-300)]'} disabled:opacity-60 cursor-pointer`}
                            aria-label={`${product.name} 公開切換`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${product.is_public ? 'translate-x-4' : 'translate-x-0'}`}
                            />
                          </button>
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            <button
                              type='button'
                              onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                              className='px-2.5 py-1.5 rounded-lg text-[11.5px] border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors'
                            >
                              編輯
                            </button>
                            {product.status === 'active' ? (
                              <button
                                type='button'
                                onClick={() => setConfirmDeactivate(product)}
                                disabled={isPending}
                                className='px-2.5 py-1.5 rounded-lg text-[11.5px] border border-[var(--neutral-200)] text-[var(--neutral-500)] hover:bg-[var(--neutral-100)] transition-colors disabled:opacity-60'
                              >
                                下架
                              </button>
                            ) : (
                              <button
                                type='button'
                                onClick={() => void handleActivate(product)}
                                disabled={isPending}
                                className='px-2.5 py-1.5 rounded-lg text-[11.5px] border border-[var(--forest-200)] text-[var(--forest-deep)] hover:bg-[var(--forest-50)] transition-colors disabled:opacity-60'
                              >
                                上架
                              </button>
                            )}
                            <button
                              type='button'
                              onClick={() => setConfirmDelete(product)}
                              disabled={isPending}
                              className='px-2.5 py-1.5 rounded-lg text-[11.5px] border border-[var(--neutral-200)] text-[var(--color-error)] hover:bg-red-50 transition-colors disabled:opacity-60'
                            >
                              刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 下架確認 */}
          {confirmDeactivate && (
            <div
              role='dialog'
              aria-modal='true'
              aria-labelledby='deactivate-modal-title'
              className='fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px]'
              onClick={(e) => {
                if (e.target === e.currentTarget) setConfirmDeactivate(null)
              }}
            >
              <div className='bg-white rounded-2xl p-6 w-[340px] shadow-xl'>
                <h3
                  id='deactivate-modal-title'
                  className='text-[15px] font-semibold text-[var(--neutral-800)] mb-2'
                >
                  確定下架商品？
                </h3>
                <p className='text-[13px] text-[var(--neutral-500)] mb-5'>
                  「{confirmDeactivate.name}」下架後將不顯示於顧客端及公開頁面。
                </p>
                <div className='flex gap-2 justify-end'>
                  <button
                    type='button'
                    onClick={() => setConfirmDeactivate(null)}
                    className='px-4 py-2 rounded-lg border border-[var(--neutral-200)] text-[13px] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors'
                  >
                    取消
                  </button>
                  <button
                    type='button'
                    onClick={() => void handleDeactivate(confirmDeactivate)}
                    className='px-4 py-2 rounded-lg bg-[var(--color-error)] text-white text-[13px] font-medium hover:opacity-90 transition-colors'
                  >
                    確定下架
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 刪除確認 */}
          {confirmDelete && (
            <div
              role='dialog'
              aria-modal='true'
              aria-labelledby='delete-modal-title'
              className='fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px]'
              onClick={(e) => {
                if (e.target === e.currentTarget) setConfirmDelete(null)
              }}
            >
              <div className='bg-white rounded-2xl p-6 w-[340px] shadow-xl'>
                <h3
                  id='delete-modal-title'
                  className='text-[15px] font-semibold text-[var(--neutral-800)] mb-2'
                >
                  確定刪除商品？
                </h3>
                <p className='text-[13px] text-[var(--neutral-500)] mb-5'>
                  「{confirmDelete.name}」刪除後無法復原，相關訂單資料將保留。
                </p>
                <div className='flex gap-2 justify-end'>
                  <button
                    type='button'
                    onClick={() => setConfirmDelete(null)}
                    className='px-4 py-2 rounded-lg border border-[var(--neutral-200)] text-[13px] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors'
                  >
                    取消
                  </button>
                  <button
                    type='button'
                    onClick={() => void handleDelete(confirmDelete)}
                    className='px-4 py-2 rounded-lg bg-[var(--color-error)] text-white text-[13px] font-medium hover:opacity-90 transition-colors'
                  >
                    確定刪除
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {toast && (
        <div
          role='status'
          aria-live='polite'
          className={`fixed bottom-6 right-6 z-[300] px-5 py-3 rounded-xl shadow-lg text-[13px] font-medium text-white ${toast.type === 'success' ? 'bg-[var(--forest-base)]' : 'bg-[var(--color-error)]'}`}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductCategory } from '@/types'

const FLD =
  'w-full bg-surface border border-line rounded-md px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition placeholder:text-fg-subtle disabled:opacity-60'

interface Props {
  initialCategories: ProductCategory[]
}

export default function CategoriesManager({ initialCategories }: Props) {
  const router = useRouter()
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function showError(msg: string) {
    setError(msg)
    setTimeout(() => setError(null), 3500)
  }

  function startEdit(cat: ProductCategory) {
    setEditingId(cat.id)
    setEditingName(cat.name)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingName('')
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const body = await res.json()
        if (!res.ok) {
          showError(body.error || '新增失敗')
          return
        }
        setCategories((prev) => [...prev, body.data as ProductCategory])
        setNewName('')
        router.refresh()
      } catch {
        showError('新增失敗，請稍後再試')
      }
    })
  }

  async function handleSaveEdit() {
    const name = editingName.trim()
    if (!name || !editingId) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/categories/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const body = await res.json()
        if (!res.ok) {
          showError(body.error || '更新失敗')
          return
        }
        setCategories((prev) => prev.map((c) => (c.id === editingId ? { ...c, name } : c)))
        cancelEdit()
        router.refresh()
      } catch {
        showError('更新失敗，請稍後再試')
      }
    })
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
        const body = await res.json()
        if (!res.ok) {
          showError(body.error || '刪除失敗')
          return
        }
        setCategories((prev) => prev.filter((c) => c.id !== id))
        router.refresh()
      } catch {
        showError('刪除失敗，請稍後再試')
      }
    })
  }

  const confirmDeleteTarget = confirmDeleteId
    ? categories.find((c) => c.id === confirmDeleteId)
    : null

  return (
    <div className='flex flex-col gap-4 max-w-[720px]'>
      {/* 新增分類 */}
      <div className='bg-surface border border-line rounded-xl p-5'>
        <p className='text-sm font-semibold mb-3'>新增分類</p>
        <div className='flex gap-2'>
          <input
            type='text'
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd()
            }}
            placeholder='輸入分類名稱，例：夏季新品、日本直送'
            maxLength={30}
            disabled={isPending}
            className={FLD}
          />
          <button
            type='button'
            onClick={() => void handleAdd()}
            disabled={isPending || !newName.trim()}
            className='h-10 px-5 rounded-pill bg-secondary text-white font-display font-semibold text-sm hover:bg-secondary-hv transition disabled:opacity-40 shrink-0'
          >
            新增
          </button>
        </div>
        {error && <p className='text-xs text-danger mt-2'>{error}</p>}
      </div>

      {/* 分類列表 */}
      {categories.length === 0 ? (
        <div className='bg-surface border border-line rounded-xl px-6 py-12 text-center'>
          <p className='font-display font-semibold text-fg-muted mb-1'>尚未建立分類</p>
          <p className='text-sm text-fg-subtle'>
            建立分類後可在商品表單中指定，顧客可在公開頁面快速篩選
          </p>
        </div>
      ) : (
        <div className='bg-surface border border-line rounded-xl overflow-hidden'>
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={[
                'flex items-center gap-3 px-5 py-3.5',
                idx < categories.length - 1 ? 'border-b border-line' : '',
              ].join(' ')}
            >
              {editingId === cat.id ? (
                <>
                  <input
                    type='text'
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSaveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    maxLength={30}
                    autoFocus
                    disabled={isPending}
                    className={`${FLD} flex-1`}
                  />
                  <button
                    type='button'
                    onClick={() => void handleSaveEdit()}
                    disabled={isPending || !editingName.trim()}
                    className='h-9 px-4 rounded-pill bg-primary text-white font-display font-semibold text-xs hover:bg-primary-hv transition disabled:opacity-40 shrink-0'
                  >
                    儲存
                  </button>
                  <button
                    type='button'
                    onClick={cancelEdit}
                    disabled={isPending}
                    className='h-9 px-4 rounded-pill border border-line text-fg-muted font-display font-semibold text-xs hover:bg-sunken transition shrink-0'
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <span className='flex-1 font-semibold text-sm'>{cat.name}</span>
                  <button
                    type='button'
                    onClick={() => startEdit(cat)}
                    disabled={isPending}
                    className='h-8 px-3.5 rounded-pill border border-line text-fg-muted font-display font-semibold text-xs hover:bg-sunken transition disabled:opacity-60'
                  >
                    改名
                  </button>
                  <button
                    type='button'
                    onClick={() => setConfirmDeleteId(cat.id)}
                    disabled={isPending}
                    className='h-8 px-3.5 rounded-pill border border-line text-danger font-display font-semibold text-xs hover:bg-danger-bg transition disabled:opacity-60'
                  >
                    刪除
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 刪除確認 Modal */}
      {confirmDeleteTarget && (
        <div
          role='dialog'
          aria-modal='true'
          className='fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px]'
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDeleteId(null)
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
            <h3 className='font-display font-bold text-lg'>確定刪除分類？</h3>
            <p className='text-sm text-fg-muted mt-2 leading-relaxed'>
              刪除「{confirmDeleteTarget.name}」後，已指定此分類的商品將變為未分類，不影響商品本身。
            </p>
            <div className='flex items-center gap-2 mt-6'>
              <button
                type='button'
                onClick={() => setConfirmDeleteId(null)}
                className='flex-1 h-11 rounded-pill border border-line text-fg font-display font-semibold text-sm hover:bg-sunken transition'
              >
                取消
              </button>
              <button
                type='button'
                onClick={() => void handleDelete(confirmDeleteTarget.id)}
                className='flex-1 h-11 rounded-pill bg-danger text-white font-display font-semibold text-sm hover:brightness-95 active:scale-[.97] transition'
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

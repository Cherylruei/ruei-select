'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductCategory } from '@/types'

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

  function handleAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleAdd()
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleSaveEdit()
    if (e.key === 'Escape') cancelEdit()
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
    <div className='flex flex-col gap-4'>
      {/* 新增分類 */}
      <div className='bg-white border border-[var(--neutral-200)] rounded-xl p-4 flex flex-col gap-3'>
        <p className='text-[13px] font-medium text-[var(--neutral-700)]'>新增分類</p>
        <div className='flex gap-2'>
          <input
            type='text'
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleAddKeyDown}
            placeholder='輸入分類名稱，例：夏季新品、日本直送'
            maxLength={30}
            disabled={isPending}
            className='flex-1 border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-[13px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
          />
          <button
            type='button'
            onClick={() => void handleAdd()}
            disabled={isPending || !newName.trim()}
            className='px-4 py-2 rounded-lg bg-[var(--forest-base)] text-white text-[12.5px] font-medium hover:bg-[var(--forest-deep)] transition-colors disabled:opacity-40'
          >
            新增
          </button>
        </div>
        {error && <p className='text-[12px] text-[var(--color-error)]'>{error}</p>}
      </div>

      {/* 分類列表 */}
      {categories.length === 0 ? (
        <div className='bg-white border border-[var(--neutral-200)] rounded-xl px-6 py-12 text-center'>
          <p className='text-[14px] font-medium text-[var(--neutral-600)] mb-1'>尚未建立分類</p>
          <p className='text-[12.5px] text-[var(--neutral-400)]'>
            建立分類後，商家可在商品表單中指定分類，顧客可在公開頁面快速篩選
          </p>
        </div>
      ) : (
        <div className='bg-white border border-[var(--neutral-200)] rounded-xl overflow-hidden'>
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`flex items-center gap-3 px-4 py-3.5 ${
                idx < categories.length - 1 ? 'border-b border-[var(--neutral-100)]' : ''
              }`}
            >
              {editingId === cat.id ? (
                <>
                  <input
                    type='text'
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    maxLength={30}
                    autoFocus
                    disabled={isPending}
                    className='flex-1 border border-[var(--forest-base)] rounded-lg px-3 py-1.5 text-[13px] bg-white focus:outline-none disabled:opacity-60'
                  />
                  <button
                    type='button'
                    onClick={() => void handleSaveEdit()}
                    disabled={isPending || !editingName.trim()}
                    className='px-3 py-1.5 rounded-lg bg-[var(--forest-base)] text-white text-[12px] font-medium hover:bg-[var(--forest-deep)] transition-colors disabled:opacity-40'
                  >
                    儲存
                  </button>
                  <button
                    type='button'
                    onClick={cancelEdit}
                    disabled={isPending}
                    className='px-3 py-1.5 rounded-lg border border-[var(--neutral-200)] text-[12px] text-[var(--neutral-500)] hover:bg-[var(--neutral-100)] transition-colors'
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <span className='flex-1 text-[13px] font-medium text-[var(--neutral-800)]'>
                    {cat.name}
                  </span>
                  <button
                    type='button'
                    onClick={() => startEdit(cat)}
                    disabled={isPending}
                    className='px-2.5 py-1.5 rounded-lg text-[11.5px] border border-[var(--neutral-200)] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors disabled:opacity-60'
                  >
                    改名
                  </button>
                  <button
                    type='button'
                    onClick={() => setConfirmDeleteId(cat.id)}
                    disabled={isPending}
                    className='px-2.5 py-1.5 rounded-lg text-[11.5px] border border-[var(--neutral-200)] text-[var(--color-error)] hover:bg-red-50 transition-colors disabled:opacity-60'
                  >
                    刪除
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 刪除確認 */}
      {confirmDeleteTarget && (
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='cat-delete-title'
          className='fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px]'
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDeleteId(null)
          }}
        >
          <div className='bg-white rounded-2xl p-6 w-[340px] shadow-xl'>
            <h3
              id='cat-delete-title'
              className='text-[15px] font-semibold text-[var(--neutral-800)] mb-2'
            >
              確定刪除分類？
            </h3>
            <p className='text-[13px] text-[var(--neutral-500)] mb-5'>
              刪除「{confirmDeleteTarget.name}」後，已指定此分類的商品將變為未分類，不影響商品本身。
            </p>
            <div className='flex gap-2 justify-end'>
              <button
                type='button'
                onClick={() => setConfirmDeleteId(null)}
                className='px-4 py-2 rounded-lg border border-[var(--neutral-200)] text-[13px] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors'
              >
                取消
              </button>
              <button
                type='button'
                onClick={() => void handleDelete(confirmDeleteTarget.id)}
                className='px-4 py-2 rounded-lg bg-[var(--color-error)] text-white text-[13px] font-medium hover:opacity-90 transition-colors'
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

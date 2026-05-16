'use client'

import { useState, useTransition } from 'react'
import type { Supplier } from '@/types'
import styles from './suppliers.module.css'

interface Props {
  initialSuppliers: Supplier[]
}

interface ToastState {
  message: string
  type: 'success' | 'error'
}

interface EditState {
  id: string
  name: string
  note: string
  website_url: string
}

export default function SuppliersClient({ initialSuppliers }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('')
  const [editState, setEditState] = useState<EditState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [isPending, startTransition] = useTransition()

  function showToast(message: string, type: ToastState['type']) {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) {
      showToast('廠商名稱為必填', 'error')
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            note: newNote.trim() || null,
            website_url: newWebsiteUrl.trim() || null,
          }),
        })
        const body = await res.json()
        if (!res.ok) {
          showToast(body.error || '新增失敗', 'error')
          return
        }
        setSuppliers((prev) => [body.data as Supplier, ...prev])
        setNewName('')
        setNewNote('')
        setNewWebsiteUrl('')
        showToast('廠商已新增', 'success')
      } catch {
        showToast('新增失敗，請稍後再試', 'error')
      }
    })
  }

  function startEdit(supplier: Supplier) {
    setEditState({
      id: supplier.id,
      name: supplier.name,
      note: supplier.note ?? '',
      website_url: supplier.website_url ?? '',
    })
  }

  function cancelEdit() {
    setEditState(null)
  }

  async function handleSaveEdit() {
    if (!editState) return
    const name = editState.name.trim()
    if (!name) {
      showToast('廠商名稱為必填', 'error')
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/suppliers/${editState.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            note: editState.note.trim() || null,
            website_url: editState.website_url.trim() || null,
          }),
        })
        const body = await res.json()
        if (!res.ok) {
          showToast(body.error || '更新失敗', 'error')
          return
        }
        setSuppliers((prev) =>
          prev.map((s) => (s.id === editState.id ? (body.data as Supplier) : s))
        )
        setEditState(null)
        showToast('廠商已更新', 'success')
      } catch {
        showToast('更新失敗，請稍後再試', 'error')
      }
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/suppliers/${deleteTarget.id}`, { method: 'DELETE' })
        const body = await res.json()
        if (!res.ok) {
          setDeleteTarget(null)
          showToast(body.error || '刪除失敗', 'error')
          return
        }
        setSuppliers((prev) => prev.filter((s) => s.id !== deleteTarget.id))
        setDeleteTarget(null)
        showToast('廠商已刪除', 'success')
      } catch {
        setDeleteTarget(null)
        showToast('刪除失敗，請稍後再試', 'error')
      }
    })
  }

  return (
    <>
      {/* ── 新增廠商表單 ─────────────────────────────────────────────────── */}
      <section className={styles.supCard}>
        <div className={styles.supCardHead}>
          <h2 className={styles.supCardTitle}>新增廠商</h2>
        </div>
        <div className={styles.supAddForm}>
          <div className={styles.supFormRow}>
            <label htmlFor='newSupName' className={styles.supFormLabel}>
              廠商名稱<span className={styles.supFormReq}>*</span>
            </label>
            <input
              id='newSupName'
              type='text'
              className={styles.supInput}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={30}
              placeholder='請輸入廠商名稱'
              disabled={isPending}
            />
            <div className={styles.supFormMeta}>
              <span className={newName.length > 30 ? styles.supCountError : styles.supCount}>
                {newName.length} / 30
              </span>
            </div>
          </div>
          <div className={styles.supFormRow}>
            <label htmlFor='newSupNote' className={styles.supFormLabel}>
              備註
            </label>
            <input
              id='newSupNote'
              type='text'
              className={styles.supInput}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              maxLength={100}
              placeholder='例：日本品牌，出貨週期 2 週'
              disabled={isPending}
            />
            <div className={styles.supFormMeta}>
              <span className={newNote.length > 100 ? styles.supCountError : styles.supCount}>
                {newNote.length} / 100
              </span>
            </div>
          </div>
          <div className={styles.supFormRow}>
            <label htmlFor='newSupWebsite' className={styles.supFormLabel}>
              賣場連結
            </label>
            <input
              id='newSupWebsite'
              type='url'
              className={styles.supInput}
              value={newWebsiteUrl}
              onChange={(e) => setNewWebsiteUrl(e.target.value)}
              placeholder='https://example.com/store'
              disabled={isPending}
            />
            <div className={styles.supFormMeta}>
              <span className={styles.supCount}>廠商的官網或賣場頁面 URL</span>
            </div>
          </div>
          <div className={styles.supFormActions}>
            <button
              type='button'
              className={`${styles.supBtn} ${styles.supBtnPrimary}`}
              onClick={handleAdd}
              disabled={isPending}
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
              {isPending ? '處理中…' : '新增廠商'}
            </button>
          </div>
        </div>
      </section>

      {/* ── 廠商列表 ─────────────────────────────────────────────────────── */}
      <section className={styles.supCard}>
        <div className={styles.supCardHead}>
          <h2 className={styles.supCardTitle}>廠商列表</h2>
          <span className={styles.supCardHint}>{suppliers.length} 個廠商</span>
        </div>

        {suppliers.length === 0 ? (
          <div className={styles.supEmpty}>
            <div className={styles.supEmptyIcon} aria-hidden='true'>
              <svg
                viewBox='0 0 24 24'
                width='28'
                height='28'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.5'
              >
                <path d='M3 7l9-4 9 4-9 4-9-4z' />
                <path d='M3 12l9 4 9-4' />
                <path d='M3 17l9 4 9-4' />
              </svg>
            </div>
            <p className={styles.supEmptyText}>尚未新增廠商，點擊上方按鈕新增</p>
          </div>
        ) : (
          <ul className={styles.supList} role='list'>
            {suppliers.map((supplier) => (
              <li key={supplier.id} className={styles.supItem}>
                {editState?.id === supplier.id ? (
                  /* ── 內嵌編輯模式 ── */
                  <div className={styles.supEditForm}>
                    <div className={styles.supFormRow}>
                      <label htmlFor={`edit-name-${supplier.id}`} className={styles.supFormLabel}>
                        廠商名稱<span className={styles.supFormReq}>*</span>
                      </label>
                      <input
                        id={`edit-name-${supplier.id}`}
                        type='text'
                        className={styles.supInput}
                        value={editState.name}
                        onChange={(e) =>
                          setEditState((prev) => prev && { ...prev, name: e.target.value })
                        }
                        maxLength={30}
                        disabled={isPending}
                        autoFocus
                      />
                    </div>
                    <div className={styles.supFormRow}>
                      <label htmlFor={`edit-note-${supplier.id}`} className={styles.supFormLabel}>
                        備註
                      </label>
                      <input
                        id={`edit-note-${supplier.id}`}
                        type='text'
                        className={styles.supInput}
                        value={editState.note}
                        onChange={(e) =>
                          setEditState((prev) => prev && { ...prev, note: e.target.value })
                        }
                        maxLength={100}
                        disabled={isPending}
                      />
                    </div>
                    <div className={styles.supFormRow}>
                      <label
                        htmlFor={`edit-website-${supplier.id}`}
                        className={styles.supFormLabel}
                      >
                        賣場連結
                      </label>
                      <input
                        id={`edit-website-${supplier.id}`}
                        type='url'
                        className={styles.supInput}
                        value={editState.website_url}
                        onChange={(e) =>
                          setEditState((prev) => prev && { ...prev, website_url: e.target.value })
                        }
                        placeholder='https://example.com/store'
                        disabled={isPending}
                      />
                    </div>
                    <div className={styles.supEditActions}>
                      <button
                        type='button'
                        className={`${styles.supBtn} ${styles.supBtnGhost}`}
                        onClick={cancelEdit}
                        disabled={isPending}
                      >
                        取消
                      </button>
                      <button
                        type='button'
                        className={`${styles.supBtn} ${styles.supBtnPrimary}`}
                        onClick={handleSaveEdit}
                        disabled={isPending}
                      >
                        {isPending ? '儲存中…' : '儲存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── 顯示模式 ── */
                  <div className={styles.supItemInner}>
                    <div className={styles.supItemInfo}>
                      <span className={styles.supItemName}>{supplier.name}</span>
                      <div className={styles.supItemMeta}>
                        {supplier.note && (
                          <span className={styles.supItemNote}>{supplier.note}</span>
                        )}
                        {supplier.website_url && (
                          <a
                            href={supplier.website_url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className={styles.supItemLink}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg
                              viewBox='0 0 24 24'
                              width='12'
                              height='12'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              aria-hidden='true'
                            >
                              <path d='M10 13a5 5 0 007.07 0l3-3a5 5 0 10-7.07-7.07l-1 1' />
                              <path d='M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 107.07 7.07l1-1' />
                            </svg>
                            賣場連結
                          </a>
                        )}
                      </div>
                    </div>
                    <div className={styles.supItemActions}>
                      <button
                        type='button'
                        className={styles.supIconBtn}
                        onClick={() => startEdit(supplier)}
                        disabled={isPending}
                        aria-label={`編輯 ${supplier.name}`}
                        title='編輯'
                      >
                        <svg
                          viewBox='0 0 24 24'
                          width='15'
                          height='15'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='1.8'
                          aria-hidden='true'
                        >
                          <path d='M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7' />
                          <path d='M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' />
                        </svg>
                      </button>
                      <button
                        type='button'
                        className={`${styles.supIconBtn} ${styles.supIconBtnDanger}`}
                        onClick={() => setDeleteTarget(supplier)}
                        disabled={isPending}
                        aria-label={`刪除 ${supplier.name}`}
                        title='刪除'
                      >
                        <svg
                          viewBox='0 0 24 24'
                          width='15'
                          height='15'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='1.8'
                          aria-hidden='true'
                        >
                          <polyline points='3 6 5 6 21 6' />
                          <path d='M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6' />
                          <path d='M10 11v6M14 11v6' />
                          <path d='M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2' />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 刪除確認 Modal ──────────────────────────────────────────────── */}
      {deleteTarget && (
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='del-modal-title'
          className='fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px]'
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null)
          }}
        >
          <div className={styles.supModal}>
            <h3 id='del-modal-title' className={styles.supModalTitle}>
              刪除廠商
            </h3>
            <p className={styles.supModalBody}>
              確定刪除廠商「<strong>{deleteTarget.name}</strong>」？此動作無法復原。
            </p>
            <div className={styles.supModalActions}>
              <button
                type='button'
                className={`${styles.supBtn} ${styles.supBtnGhost}`}
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
              >
                取消
              </button>
              <button
                type='button'
                className={`${styles.supBtn} ${styles.supBtnDanger}`}
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? '刪除中…' : '確定刪除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div
          role='status'
          aria-live='polite'
          className={`${styles.supToast} ${toast.type === 'success' ? styles.supToastSuccess : styles.supToastError}`}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}

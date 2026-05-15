'use client'

import { useState, useTransition } from 'react'
import type { Supplier } from '@/types'

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
}

export default function SuppliersClient({ initialSuppliers }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [newName, setNewName] = useState('')
  const [newNote, setNewNote] = useState('')
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
          body: JSON.stringify({ name, note: newNote.trim() || null }),
        })
        const body = await res.json()
        if (!res.ok) {
          showToast(body.error || '新增失敗', 'error')
          return
        }
        setSuppliers((prev) => [body.data as Supplier, ...prev])
        setNewName('')
        setNewNote('')
        showToast('廠商已新增', 'success')
      } catch {
        showToast('新增失敗，請稍後再試', 'error')
      }
    })
  }

  function startEdit(supplier: Supplier) {
    setEditState({ id: supplier.id, name: supplier.name, note: supplier.note ?? '' })
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
          body: JSON.stringify({ name, note: editState.note.trim() || null }),
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
      <section className='sup-card'>
        <div className='sup-card-head'>
          <h2 className='sup-card-title'>新增廠商</h2>
        </div>
        <div className='sup-add-form'>
          <div className='sup-form-row'>
            <label htmlFor='newSupName' className='sup-form-label'>
              廠商名稱<span className='sup-form-req'>*</span>
            </label>
            <input
              id='newSupName'
              type='text'
              className='sup-input'
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={30}
              placeholder='請輸入廠商名稱'
              disabled={isPending}
            />
            <div className='sup-form-meta'>
              <span className={newName.length > 30 ? 'sup-count-error' : 'sup-count'}>
                {newName.length} / 30
              </span>
            </div>
          </div>
          <div className='sup-form-row'>
            <label htmlFor='newSupNote' className='sup-form-label'>
              備註
            </label>
            <input
              id='newSupNote'
              type='text'
              className='sup-input'
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              maxLength={100}
              placeholder='例：日本品牌，出貨週期 2 週'
              disabled={isPending}
            />
            <div className='sup-form-meta'>
              <span className={newNote.length > 100 ? 'sup-count-error' : 'sup-count'}>
                {newNote.length} / 100
              </span>
            </div>
          </div>
          <div className='sup-form-actions'>
            <button
              type='button'
              className='sup-btn sup-btn-primary'
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
      <section className='sup-card'>
        <div className='sup-card-head'>
          <h2 className='sup-card-title'>廠商列表</h2>
          <span className='sup-card-hint'>{suppliers.length} 個廠商</span>
        </div>

        {suppliers.length === 0 ? (
          <div className='sup-empty'>
            <div className='sup-empty-icon' aria-hidden='true'>
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
            <p className='sup-empty-text'>尚未新增廠商，點擊上方按鈕新增</p>
          </div>
        ) : (
          <ul className='sup-list' role='list'>
            {suppliers.map((supplier) => (
              <li key={supplier.id} className='sup-item'>
                {editState?.id === supplier.id ? (
                  /* ── 內嵌編輯模式 ── */
                  <div className='sup-edit-form'>
                    <div className='sup-form-row'>
                      <label htmlFor={`edit-name-${supplier.id}`} className='sup-form-label'>
                        廠商名稱<span className='sup-form-req'>*</span>
                      </label>
                      <input
                        id={`edit-name-${supplier.id}`}
                        type='text'
                        className='sup-input'
                        value={editState.name}
                        onChange={(e) =>
                          setEditState((prev) => prev && { ...prev, name: e.target.value })
                        }
                        maxLength={30}
                        disabled={isPending}
                        autoFocus
                      />
                    </div>
                    <div className='sup-form-row'>
                      <label htmlFor={`edit-note-${supplier.id}`} className='sup-form-label'>
                        備註
                      </label>
                      <input
                        id={`edit-note-${supplier.id}`}
                        type='text'
                        className='sup-input'
                        value={editState.note}
                        onChange={(e) =>
                          setEditState((prev) => prev && { ...prev, note: e.target.value })
                        }
                        maxLength={100}
                        disabled={isPending}
                      />
                    </div>
                    <div className='sup-edit-actions'>
                      <button
                        type='button'
                        className='sup-btn sup-btn-ghost'
                        onClick={cancelEdit}
                        disabled={isPending}
                      >
                        取消
                      </button>
                      <button
                        type='button'
                        className='sup-btn sup-btn-primary'
                        onClick={handleSaveEdit}
                        disabled={isPending}
                      >
                        {isPending ? '儲存中…' : '儲存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── 顯示模式 ── */
                  <div className='sup-item-inner'>
                    <div className='sup-item-info'>
                      <span className='sup-item-name'>{supplier.name}</span>
                      {supplier.note && <span className='sup-item-note'>{supplier.note}</span>}
                    </div>
                    <div className='sup-item-actions'>
                      <button
                        type='button'
                        className='sup-icon-btn'
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
                        className='sup-icon-btn sup-icon-btn-danger'
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
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(28,54,16,.4)',
            backdropFilter: 'blur(3px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null)
          }}
        >
          <div className='sup-modal'>
            <h3 id='del-modal-title' className='sup-modal-title'>
              刪除廠商
            </h3>
            <p className='sup-modal-body'>
              確定刪除廠商「<strong>{deleteTarget.name}</strong>」？此動作無法復原。
            </p>
            <div className='sup-modal-actions'>
              <button
                type='button'
                className='sup-btn sup-btn-ghost'
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
              >
                取消
              </button>
              <button
                type='button'
                className='sup-btn sup-btn-danger'
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
          className={`sup-toast ${toast.type === 'success' ? 'sup-toast-success' : 'sup-toast-error'}`}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        .sup-card {
          background: #fff;
          border: 1px solid var(--neutral-200);
          border-radius: var(--r-lg);
          padding: 26px 28px;
          margin-bottom: 22px;
          box-shadow: var(--sh-xs);
        }
        .sup-card-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 18px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sup-card-title {
          font-family: var(--font-zen-maru-gothic), 'Zen Maru Gothic', sans-serif;
          font-size: 17px;
          font-weight: 500;
          color: var(--neutral-800);
          letter-spacing: .04em;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sup-card-title::before {
          content: '';
          width: 4px; height: 16px;
          background: var(--sage-500, #508a2c);
          border-radius: 4px;
          display: inline-block;
        }
        .sup-card-hint {
          font-size: 12.5px;
          color: var(--neutral-500);
        }
        .sup-add-form { display: flex; flex-direction: column; }
        .sup-form-row { margin-bottom: 14px; }
        .sup-form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--neutral-700);
          margin-bottom: 6px;
          letter-spacing: .03em;
        }
        .sup-form-req { color: var(--sakura, #e8749d); margin-left: 2px; }
        .sup-input {
          width: 100%;
          padding: 10px 14px;
          font-family: inherit;
          font-size: 14px;
          color: var(--neutral-800);
          background: #fff;
          border: 1px solid var(--neutral-200);
          border-radius: var(--r-md);
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          box-sizing: border-box;
        }
        .sup-input:hover:not(:disabled) { border-color: var(--neutral-300); }
        .sup-input:focus {
          border-color: var(--sage-400, #6dab3d);
          box-shadow: 0 0 0 3px rgba(109,171,61,.15);
        }
        .sup-input:disabled { background: var(--neutral-50); opacity: .7; }
        .sup-form-meta {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;
          font-size: 11.5px;
        }
        .sup-count { color: var(--neutral-400); }
        .sup-count-error { color: var(--sakura, #e8749d); }
        .sup-form-actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 4px;
        }
        .sup-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          border-radius: var(--r-md);
          cursor: pointer;
          border: 1px solid transparent;
          transition: background .15s, color .15s, transform .15s;
          text-decoration: none;
        }
        .sup-btn:disabled { opacity: .55; cursor: not-allowed; }
        .sup-btn-primary { background: var(--sage-600, #3d7020); color: #fff; box-shadow: 0 2px 8px rgba(61,112,32,.22); }
        .sup-btn-primary:hover:not(:disabled) { background: var(--sage-700, #2c5218); transform: translateY(-1px); }
        .sup-btn-ghost { background: transparent; color: var(--neutral-600); border-color: var(--neutral-200); }
        .sup-btn-ghost:hover:not(:disabled) { background: var(--neutral-100); color: var(--neutral-800); }
        .sup-btn-danger { background: #c0392b; color: #fff; }
        .sup-btn-danger:hover:not(:disabled) { background: #a93226; transform: translateY(-1px); }

        .sup-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 36px 24px;
          gap: 12px;
        }
        .sup-empty-icon {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: var(--neutral-100);
          display: grid;
          place-items: center;
          color: var(--neutral-400);
        }
        .sup-empty-text {
          font-size: 13.5px;
          color: var(--neutral-500);
          text-align: center;
        }
        .sup-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .sup-item {
          border-bottom: 1px solid var(--neutral-100);
        }
        .sup-item:last-child { border-bottom: none; }
        .sup-item-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 4px;
        }
        .sup-item-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .sup-item-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--neutral-800);
        }
        .sup-item-note {
          font-size: 12.5px;
          color: var(--neutral-500);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sup-item-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .sup-icon-btn {
          display: grid;
          place-items: center;
          width: 32px; height: 32px;
          border-radius: var(--r-md);
          border: 1px solid var(--neutral-200);
          background: transparent;
          color: var(--neutral-500);
          cursor: pointer;
          transition: background .15s, color .15s, border-color .15s;
        }
        .sup-icon-btn:hover:not(:disabled) { background: var(--neutral-100); color: var(--neutral-700); border-color: var(--neutral-300); }
        .sup-icon-btn-danger:hover:not(:disabled) { background: #fdf0ee; color: #c0392b; border-color: #f5c6c0; }
        .sup-icon-btn:disabled { opacity: .4; cursor: not-allowed; }
        .sup-edit-form {
          padding: 14px 4px;
          display: flex;
          flex-direction: column;
        }
        .sup-edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }
        .sup-modal {
          background: #fff;
          border-radius: var(--r-lg);
          padding: 28px 28px 22px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 8px 40px rgba(28,54,16,.18);
        }
        .sup-modal-title {
          font-family: var(--font-zen-maru-gothic), 'Zen Maru Gothic', sans-serif;
          font-size: 17px;
          font-weight: 500;
          color: var(--neutral-800);
          margin-bottom: 12px;
        }
        .sup-modal-body {
          font-size: 14px;
          color: var(--neutral-600);
          line-height: 1.65;
          margin-bottom: 22px;
        }
        .sup-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .sup-toast {
          position: fixed;
          bottom: 30px; left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: var(--r-full);
          font-size: 13px;
          font-weight: 500;
          z-index: 300;
          box-shadow: var(--sh-md, 0 4px 16px rgba(28,54,16,.11));
          animation: supToastIn .25s ease-out;
          white-space: nowrap;
        }
        .sup-toast-success { background: var(--sage-700, #2c5218); color: #fff; }
        .sup-toast-error { background: #c0392b; color: #fff; }
        @keyframes supToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (max-width: 768px) {
          .sup-card { padding: 20px 18px; }
        }
      `}</style>
    </>
  )
}

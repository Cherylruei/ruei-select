'use client'

import { useCallback, useEffect, useState } from 'react'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import type { AdminAnnouncement, AnnouncementType } from '@/types'

const TYPE_META: Record<AnnouncementType, { label: string; emoji: string; chip: string }> = {
  info: { label: '一般通知', emoji: '📢', chip: 'bg-sunken text-fg-muted' },
  promo: { label: '促銷活動', emoji: '🎉', chip: 'bg-primary-bg text-primary-hv' },
  warning: { label: '重要公告', emoji: '⚠️', chip: 'bg-warning-bg text-warning' },
}

const FLD =
  'w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition placeholder:text-fg-subtle'

interface FormState {
  title: string
  content: string
  type: AnnouncementType
  is_active: boolean
  expires_at: string // yyyy-MM-dd 或 ''
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  type: 'info',
  is_active: true,
  expires_at: '',
}

function isPublished(a: AdminAnnouncement): boolean {
  return a.is_active && (a.expires_at === null || new Date(a.expires_at) > new Date())
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}/${mm}/${dd}`
}

export default function AnnouncementsClient() {
  const [items, setItems] = useState<AdminAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [formModal, setFormModal] = useState<{ mode: 'create' | 'edit'; id?: string } | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toasts, toast, dismiss } = useToast()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/announcements')
      const json = await res.json()
      if (json.success) setItems(json.data)
      else toast(json.error ?? '載入失敗', 'error')
    } catch {
      toast('載入公告失敗，請重新整理', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll()
  }, [fetchAll])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setFormModal({ mode: 'create' })
  }

  const openEdit = (a: AdminAnnouncement) => {
    setForm({
      title: a.title,
      content: a.content,
      type: a.type,
      is_active: a.is_active,
      expires_at: a.expires_at ? a.expires_at.slice(0, 10) : '',
    })
    setFormModal({ mode: 'edit', id: a.id })
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast('請填寫標題', 'error')
    if (form.title.trim().length > 60) return toast('標題不能超過 60 個字', 'error')
    if (!form.content.trim()) return toast('請填寫內容', 'error')
    if (form.content.trim().length > 300) return toast('內容不能超過 300 個字', 'error')

    setSaving(true)
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      is_active: form.is_active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    }
    try {
      const isEdit = formModal?.mode === 'edit'
      const res = await fetch(
        isEdit ? `/api/admin/announcements/${formModal!.id}` : '/api/admin/announcements',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const json = await res.json()
      if (!res.ok) {
        toast(json.error ?? '儲存失敗', 'error')
        return
      }
      toast(isEdit ? '公告已更新' : '公告已建立', 'success')
      setFormModal(null)
      fetchAll()
    } catch {
      toast('儲存失敗，請重試', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (a: AdminAnnouncement) => {
    const next = !a.is_active
    // 樂觀更新
    setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: next } : x)))
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: next }),
      })
      if (!res.ok) throw new Error()
      toast(next ? '公告已上架' : '公告已下架', 'success')
    } catch {
      setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, is_active: a.is_active } : x)))
      toast('更新失敗，請重試', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/announcements/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      toast('公告已刪除', 'info')
      setDeleteTarget(null)
    } catch {
      toast('刪除失敗，請重試', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const activeCount = items.filter(isPublished).length

  return (
    <>
      {/* ── Sticky page header ── */}
      <div className='px-8 py-5 border-b border-line bg-surface/70 backdrop-blur sticky top-0 z-20'>
        <div className='font-mono text-[11px] text-fg-subtle mb-2 flex items-center gap-1.5'>
          <span>後台</span>
          <span>›</span>
          <span className='text-fg'>公告管理</span>
        </div>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h1 className='font-display font-bold text-2xl text-fg'>公告管理</h1>
            <p className='text-sm text-fg-muted mt-0.5'>
              目前 <b className='text-fg'>{activeCount}</b> 則發布中公告，顯示在顧客前台通知鈴鐺
            </p>
          </div>
          <button
            onClick={openCreate}
            className='inline-flex items-center gap-1.5 h-10 px-4 rounded-pill bg-secondary text-white font-display font-semibold text-sm shadow-green hover:bg-secondary-hv active:scale-[.97] transition cursor-pointer'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.4'
              strokeLinecap='round'
            >
              <path d='M12 5v14M5 12h14' />
            </svg>
            新增公告
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className='p-8 max-w-[960px]'>
        {loading ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState onCreate={openCreate} />
        ) : (
          <div className='space-y-3'>
            {items.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                onToggle={() => toggleActive(a)}
                onEdit={() => openEdit(a)}
                onDelete={() => setDeleteTarget({ id: a.id, title: a.title })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit modal ── */}
      {formModal && (
        <Modal
          title={formModal.mode === 'edit' ? '編輯公告' : '新增公告'}
          onClose={() => setFormModal(null)}
          maxWidth='md'
          footer={
            <>
              <button
                onClick={() => setFormModal(null)}
                className='flex-1 h-11 rounded-pill border border-line text-fg font-display font-semibold text-sm hover:bg-sunken transition'
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className='flex-1 h-11 rounded-pill bg-secondary text-white font-display font-semibold text-sm shadow-green hover:bg-secondary-hv active:scale-[.97] transition disabled:opacity-50'
              >
                {saving ? '儲存中…' : formModal.mode === 'edit' ? '儲存變更' : '建立公告'}
              </button>
            </>
          }
        >
          <div className='space-y-4'>
            <div>
              <label className='block font-display font-semibold text-sm mb-1.5'>
                標題 <span className='text-danger'>*</span>
              </label>
              <input
                className={FLD}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={60}
                placeholder='例：本週六公休一天'
              />
              <div className='flex justify-end mt-1'>
                <span className='font-mono text-[11px] text-fg-subtle'>
                  {form.title.length} / 60
                </span>
              </div>
            </div>

            <div>
              <label className='block font-display font-semibold text-sm mb-1.5'>
                內容 <span className='text-danger'>*</span>
              </label>
              <textarea
                className={`${FLD} resize-y min-h-[88px] leading-relaxed`}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                maxLength={300}
                rows={4}
                placeholder='公告內容（純文字，上限 300 字）'
              />
              <div className='flex justify-end mt-1'>
                <span className='font-mono text-[11px] text-fg-subtle'>
                  {form.content.length} / 300
                </span>
              </div>
            </div>

            <div>
              <label className='block font-display font-semibold text-sm mb-1.5'>類型</label>
              <div className='flex gap-2'>
                {(Object.keys(TYPE_META) as AnnouncementType[]).map((t) => {
                  const meta = TYPE_META[t]
                  const selected = form.type === t
                  return (
                    <button
                      key={t}
                      type='button'
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={[
                        'flex-1 h-10 rounded-lg border font-display font-semibold text-xs transition cursor-pointer',
                        selected
                          ? 'border-secondary bg-secondary-bg text-secondary'
                          : 'border-line text-fg-muted hover:bg-sunken',
                      ].join(' ')}
                    >
                      {meta.emoji} {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className='flex items-center justify-between pt-1'>
              <div>
                <div className='font-display font-semibold text-sm'>立即發布</div>
                <div className='text-xs text-fg-subtle mt-0.5'>關閉則先存為未發布，可日後上架</div>
              </div>
              <button
                type='button'
                role='switch'
                aria-checked={form.is_active}
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={[
                  'relative shrink-0 w-11 h-6 rounded-pill transition-colors',
                  form.is_active ? 'bg-secondary' : 'bg-ink-300',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-pill shadow transition-transform',
                    form.is_active ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
            </div>

            <div>
              <label className='block font-display font-semibold text-sm mb-1.5'>
                到期日 <span className='text-fg-subtle font-normal'>（選填，到期後自動隱藏）</span>
              </label>
              <input
                type='date'
                className={FLD}
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <ConfirmModal
          title='刪除此公告'
          message={`確定刪除「${deleteTarget.title}」？此動作無法復原。`}
          confirmLabel='確定刪除'
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleting}
          danger
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}

// ── Announcement card ──────────────────────────────────────────────────────────

function AnnouncementCard({
  announcement: a,
  onToggle,
  onEdit,
  onDelete,
}: {
  announcement: AdminAnnouncement
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = TYPE_META[a.type]
  const published = isPublished(a)
  const expired = a.is_active && a.expires_at !== null && new Date(a.expires_at) <= new Date()

  return (
    <article className='bg-surface border border-line rounded-xl p-5'>
      <div className='flex items-start gap-3'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span
              className={`inline-flex items-center h-6 px-2.5 rounded-pill font-display font-bold text-[11px] ${meta.chip}`}
            >
              {meta.emoji} {meta.label}
            </span>
            <StatusBadge published={published} expired={expired} />
          </div>
          <h3 className='font-display font-bold text-md mt-2'>{a.title}</h3>
          <p className='text-sm text-fg-muted mt-1 leading-relaxed whitespace-pre-wrap'>
            {a.content}
          </p>
          <div className='flex items-center gap-3 mt-2.5 font-mono text-[11px] text-fg-subtle'>
            <span>建立 {formatDate(a.created_at)}</span>
            {a.expires_at && <span>· 到期 {formatDate(a.expires_at)}</span>}
          </div>
        </div>
      </div>

      <div className='mt-4 pt-3 border-t border-line flex items-center justify-end gap-2'>
        <button
          onClick={onToggle}
          className='inline-flex items-center gap-1.5 h-8 px-3 rounded-pill border border-line text-fg-muted font-display font-semibold text-xs hover:bg-sunken transition cursor-pointer'
        >
          {a.is_active ? '下架' : '上架'}
        </button>
        <button
          onClick={onEdit}
          className='inline-flex items-center gap-1.5 h-8 px-3 rounded-pill border border-line text-fg font-display font-semibold text-xs hover:bg-sunken transition cursor-pointer'
        >
          編輯
        </button>
        <button
          onClick={onDelete}
          className='inline-flex items-center gap-1.5 h-8 px-3 rounded-pill border border-line text-fg-muted font-display font-semibold text-xs hover:bg-danger-bg hover:text-danger hover:border-danger transition cursor-pointer'
        >
          刪除
        </button>
      </div>
    </article>
  )
}

function StatusBadge({ published, expired }: { published: boolean; expired: boolean }) {
  if (published)
    return (
      <span className='inline-flex items-center gap-1 h-6 px-2.5 rounded-pill font-display font-bold text-[10px] text-success bg-success-bg'>
        <span className='w-1.5 h-1.5 rounded-pill bg-success' />
        發布中
      </span>
    )
  if (expired)
    return (
      <span className='inline-flex items-center h-6 px-2.5 rounded-pill font-display font-bold text-[10px] text-fg-subtle bg-sunken'>
        已到期
      </span>
    )
  return (
    <span className='inline-flex items-center h-6 px-2.5 rounded-pill font-display font-bold text-[10px] text-fg-muted bg-sunken'>
      未發布
    </span>
  )
}

// ── Empty / Loading ─────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className='bg-surface border border-dashed border-line rounded-2xl py-16 px-8 flex flex-col items-center text-center'>
      <div className='w-20 h-20 rounded-pill flex items-center justify-center bg-sunken'>
        <svg
          width='32'
          height='32'
          viewBox='0 0 24 24'
          fill='none'
          stroke='var(--fg-subtle)'
          strokeWidth='1.6'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M6 16V11a6 6 0 1112 0v5l2 2H4l2-2z' />
          <path d='M10 20a2 2 0 004 0' />
        </svg>
      </div>
      <h3 className='font-display font-bold text-lg mt-5'>還沒有任何公告</h3>
      <p className='text-sm text-fg-muted mt-2 leading-relaxed max-w-sm'>
        建立第一則公告，向所有顧客廣播到貨通知、促銷活動或賣場規則。
      </p>
      <button
        onClick={onCreate}
        className='mt-5 inline-flex items-center gap-1.5 h-10 px-5 rounded-pill bg-secondary text-white font-display font-semibold text-sm shadow-green hover:bg-secondary-hv transition cursor-pointer'
      >
        新增公告
      </button>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className='flex flex-col gap-3'>
      {[1, 2, 3].map((i) => (
        <div key={i} className='bg-surface rounded-xl border border-line p-5 animate-pulse'>
          <div className='h-5 w-24 bg-ink-100 rounded-pill mb-3' />
          <div className='h-4 w-1/3 bg-ink-100 rounded mb-2' />
          <div className='h-3 w-2/3 bg-ink-50 rounded' />
        </div>
      ))}
    </div>
  )
}

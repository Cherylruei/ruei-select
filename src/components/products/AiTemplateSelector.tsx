'use client'

import { useState } from 'react'
import type { AiTemplate } from '@/hooks/useAiTemplates'

interface Props {
  selectedId: string | null
  onSelect: (templateId: string | null) => void
  disabled?: boolean
  templates: AiTemplate[]
  onAdd: (name: string, instruction: string) => void
  onUpdate: (id: string, name: string, instruction: string) => void
  onDelete: (id: string) => void
  onSetDefault: (id: string) => void
}

interface FormState {
  name: string
  instruction: string
}
const EMPTY_FORM: FormState = { name: '', instruction: '' }

const FLD =
  'w-full border border-line rounded-md px-3.5 py-2.5 text-sm bg-surface outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition placeholder:text-fg-subtle'

export default function AiTemplateSelector({
  selectedId,
  onSelect,
  disabled,
  templates,
  onAdd,
  onUpdate,
  onDelete,
  onSetDefault,
}: Props) {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  function openAddModal() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }
  function openEditModal(t: AiTemplate) {
    setEditingId(t.id)
    setForm({ name: t.name, instruction: t.instruction })
    setFormError(null)
    setShowModal(true)
  }
  function closeModal() {
    setShowModal(false)
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditingId(null)
  }

  function handleSaveForm() {
    if (!form.name.trim()) {
      setFormError('請輸入模板名稱')
      return
    }
    if (!form.instruction.trim()) {
      setFormError('請輸入模板指令')
      return
    }
    if (editingId) {
      onUpdate(editingId, form.name, form.instruction)
    } else {
      onAdd(form.name, form.instruction)
    }
    closeModal()
  }

  function handleDelete(id: string) {
    onDelete(id)
    if (selectedId === id) onSelect(null)
  }

  const selectedLabel =
    selectedId === null ? '無模板' : (templates.find((t) => t.id === selectedId)?.name ?? '無模板')

  return (
    <div className='flex items-center gap-2 flex-wrap'>
      <span className='text-xs text-fg-subtle shrink-0'>AI 模板：</span>

      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        disabled={disabled}
        className='border border-line rounded-md px-2.5 py-1.5 text-xs bg-surface outline-none focus:border-primary disabled:opacity-60 max-w-[200px]'
        aria-label='選擇 AI 模板'
      >
        <option value=''>無模板（AI 自由生成）</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.isDefault ? ' ★' : ''}
          </option>
        ))}
      </select>

      <button
        type='button'
        onClick={openAddModal}
        disabled={disabled}
        className='text-sm text-secondary font-semibold hover:underline disabled:opacity-40'
      >
        管理模板
      </button>

      {showModal && (
        <div
          role='dialog'
          aria-modal='true'
          aria-label='管理 AI 模板'
          className='fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px]'
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className='bg-surface rounded-2xl shadow-lg w-full max-w-md mx-4 flex flex-col max-h-[88vh] border border-line'>
            {/* Header */}
            <div className='flex items-center justify-between px-5 py-4 border-b border-line shrink-0'>
              <h2 className='font-display font-bold text-base'>管理 AI 模板</h2>
              <button
                type='button'
                onClick={closeModal}
                className='w-8 h-8 rounded-pill hover:bg-sunken flex items-center justify-center text-fg-subtle transition'
                aria-label='關閉'
              >
                <svg
                  width='16'
                  height='16'
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

            {/* Body */}
            <div className='overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5'>
              {/* Add / Edit form */}
              <div className='border border-line rounded-xl p-4 bg-sunken flex flex-col gap-3'>
                <p className='text-xs font-semibold text-fg-muted'>
                  {editingId ? '編輯模板' : '新增模板'}
                </p>
                <input
                  type='text'
                  placeholder='模板名稱，例：日系文案風格'
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={30}
                  className={FLD}
                />
                <textarea
                  placeholder='輸入額外的 AI 指令，例：文案偏日系可愛，多使用表情符號，強調限量感。'
                  value={form.instruction}
                  onChange={(e) => setForm((f) => ({ ...f, instruction: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className={`${FLD} resize-y`}
                />
                {formError && <p className='text-xs text-danger'>{formError}</p>}
                <div className='flex gap-2'>
                  {editingId && (
                    <button
                      type='button'
                      onClick={() => {
                        setEditingId(null)
                        setForm(EMPTY_FORM)
                        setFormError(null)
                      }}
                      className='h-8 px-3.5 rounded-pill border border-line text-xs text-fg-muted font-display font-semibold hover:bg-surface transition'
                    >
                      取消編輯
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={handleSaveForm}
                    className='h-8 px-4 rounded-pill bg-primary text-white text-xs font-display font-semibold hover:bg-primary-hv active:scale-[.97] transition'
                  >
                    {editingId ? '儲存變更' : '新增模板'}
                  </button>
                </div>
              </div>

              {/* Template list */}
              {templates.length > 0 && (
                <div className='flex flex-col gap-2'>
                  <p className='text-xs font-semibold text-fg-muted'>已儲存的模板</p>
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className='border border-line rounded-xl p-3.5 bg-surface flex flex-col gap-1.5'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <span className='text-sm font-semibold truncate'>{t.name}</span>
                          {t.isDefault && (
                            <span className='shrink-0 inline-flex items-center h-5 px-2 rounded-pill bg-secondary-bg text-secondary font-display font-semibold text-[10px]'>
                              預設
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          {!t.isDefault && (
                            <button
                              type='button'
                              onClick={() => onSetDefault(t.id)}
                              className='text-xs text-fg-subtle hover:text-secondary font-semibold transition'
                            >
                              設預設
                            </button>
                          )}
                          <button
                            type='button'
                            onClick={() => openEditModal(t)}
                            className='text-xs text-fg-subtle hover:text-fg font-semibold transition'
                          >
                            編輯
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDelete(t.id)}
                            className='text-xs text-fg-subtle hover:text-danger font-semibold transition'
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                      <p className='text-xs text-fg-muted line-clamp-2'>{t.instruction}</p>
                    </div>
                  ))}
                </div>
              )}

              {templates.length === 0 && (
                <p className='text-xs text-fg-subtle text-center py-4'>尚未建立任何模板</p>
              )}
            </div>

            {/* Footer */}
            <div className='px-5 py-3 border-t border-line shrink-0'>
              <p className='text-xs text-fg-subtle'>
                目前選擇：{selectedLabel} · 模板儲存於此裝置的瀏覽器
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

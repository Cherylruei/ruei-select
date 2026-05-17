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
      <span className='text-[12px] text-[var(--neutral-500)] shrink-0'>AI 模板：</span>

      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value || null)}
        disabled={disabled}
        className='border border-[var(--neutral-200)] rounded-lg px-2.5 py-1.5 text-[12.5px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60 max-w-[200px]'
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
        className='text-[11.5px] text-[var(--forest-base)] hover:underline disabled:opacity-40'
      >
        管理模板
      </button>

      {showModal && (
        <div
          role='dialog'
          aria-modal='true'
          aria-label='管理 AI 模板'
          className='fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-[2px]'
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal()
          }}
        >
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-[var(--neutral-100)]'>
              <h2 className='text-[15px] font-semibold text-[var(--neutral-800)]'>管理 AI 模板</h2>
              <button
                type='button'
                onClick={closeModal}
                className='w-7 h-7 grid place-items-center rounded-lg text-[var(--neutral-400)] hover:bg-[var(--neutral-100)] transition-colors'
                aria-label='關閉'
              >
                ×
              </button>
            </div>

            <div className='overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5'>
              {/* Add / Edit form */}
              <div className='border border-[var(--neutral-200)] rounded-xl p-4 bg-[var(--neutral-50)] flex flex-col gap-3'>
                <p className='text-[12.5px] font-medium text-[var(--neutral-600)]'>
                  {editingId ? '編輯模板' : '新增模板'}
                </p>
                <input
                  type='text'
                  placeholder='模板名稱，例：日系文案風格'
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={30}
                  className='border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[var(--forest-base)]'
                />
                <textarea
                  placeholder='輸入額外的 AI 指令，例：文案偏日系可愛，多使用表情符號，強調限量感。'
                  value={form.instruction}
                  onChange={(e) => setForm((f) => ({ ...f, instruction: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className='border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-[13px] bg-white resize-y focus:outline-none focus:border-[var(--forest-base)]'
                />
                {formError && <p className='text-[12px] text-[var(--color-error)]'>{formError}</p>}
                <div className='flex gap-2'>
                  {editingId && (
                    <button
                      type='button'
                      onClick={() => {
                        setEditingId(null)
                        setForm(EMPTY_FORM)
                        setFormError(null)
                      }}
                      className='px-3 py-1.5 rounded-lg border border-[var(--neutral-200)] text-[12.5px] text-[var(--neutral-500)] hover:bg-[var(--neutral-100)] transition-colors'
                    >
                      取消編輯
                    </button>
                  )}
                  <button
                    type='button'
                    onClick={handleSaveForm}
                    className='px-4 py-1.5 rounded-lg bg-[var(--forest-base)] text-white text-[12.5px] font-medium hover:bg-[var(--forest-deep)] transition-colors'
                  >
                    {editingId ? '儲存變更' : '新增模板'}
                  </button>
                </div>
              </div>

              {/* List */}
              {templates.length > 0 && (
                <div className='flex flex-col gap-2'>
                  <p className='text-[12.5px] font-medium text-[var(--neutral-600)]'>
                    已儲存的模板
                  </p>
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className='border border-[var(--neutral-200)] rounded-xl p-3.5 bg-white flex flex-col gap-1.5'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <span className='text-[13px] font-medium text-[var(--neutral-700)] truncate'>
                            {t.name}
                          </span>
                          {t.isDefault && (
                            <span className='shrink-0 text-[10.5px] px-1.5 py-0.5 rounded bg-[var(--forest-50)] text-[var(--forest-base)] border border-[var(--forest-100)]'>
                              預設
                            </span>
                          )}
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          {!t.isDefault && (
                            <button
                              type='button'
                              onClick={() => onSetDefault(t.id)}
                              className='text-[11px] text-[var(--neutral-400)] hover:text-[var(--forest-base)] transition-colors'
                            >
                              設預設
                            </button>
                          )}
                          <button
                            type='button'
                            onClick={() => openEditModal(t)}
                            className='text-[11px] text-[var(--neutral-400)] hover:text-[var(--forest-base)] transition-colors'
                          >
                            編輯
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDelete(t.id)}
                            className='text-[11px] text-[var(--neutral-400)] hover:text-[var(--color-error)] transition-colors'
                          >
                            刪除
                          </button>
                        </div>
                      </div>
                      <p className='text-[12px] text-[var(--neutral-500)] line-clamp-2'>
                        {t.instruction}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {templates.length === 0 && (
                <p className='text-[12.5px] text-[var(--neutral-400)] text-center py-4'>
                  尚未建立任何模板
                </p>
              )}
            </div>

            <div className='px-5 py-3 border-t border-[var(--neutral-100)]'>
              <p className='text-[11.5px] text-[var(--neutral-400)]'>
                目前選擇：{selectedLabel} · 模板儲存於此裝置的瀏覽器
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  /** 對話框標題 */
  title?: string
  /** 關閉（按 backdrop 或 ×） */
  onClose: () => void
  children: React.ReactNode
  /** 底部操作按鈕 */
  footer?: React.ReactNode
  /** 最大寬度 */
  maxWidth?: 'sm' | 'md'
}

export function Modal({ title, onClose, children, footer, maxWidth = 'sm' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  const maxWidthClass = maxWidth === 'md' ? 'max-w-md' : 'max-w-sm'

  return (
    <div
      ref={overlayRef}
      className='fixed inset-0 bg-ink-800/45 z-50 flex items-center justify-center p-4'
      onClick={handleOverlayClick}
      role='dialog'
      aria-modal='true'
      aria-label={title}
    >
      <div className={['bg-surface rounded-2xl p-6 shadow-lg w-full', maxWidthClass].join(' ')}>
        {title && (
          <div className='flex items-start justify-between mb-4'>
            <h3 className='font-display font-bold text-xl text-fg'>{title}</h3>
            <button
              onClick={onClose}
              className='w-8 h-8 rounded-pill hover:bg-sunken flex items-center justify-center text-fg-muted transition'
              aria-label='關閉'
            >
              <svg
                viewBox='0 0 24 24'
                width='18'
                height='18'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                aria-hidden='true'
              >
                <path d='M18 6L6 18M6 6l12 12' strokeLinecap='round' />
              </svg>
            </button>
          </div>
        )}

        {children}

        {footer && <div className='flex gap-2 mt-4'>{footer}</div>}
      </div>
    </div>
  )
}

/* ── ConfirmModal — 簡版確認對話框 ──────────────────────── */
interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  danger?: boolean
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = '確認',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
  isLoading,
  danger,
}: ConfirmModalProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className='flex-1 h-10 rounded-pill text-fg font-display font-semibold hover:bg-sunken transition disabled:opacity-40'
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={[
              'flex-1 h-10 rounded-pill font-display font-semibold transition active:scale-[.97]',
              'disabled:opacity-45 disabled:cursor-not-allowed',
              danger
                ? 'bg-danger text-white hover:opacity-90'
                : 'bg-primary text-white shadow-pink hover:bg-primary-hv',
            ].join(' ')}
          >
            {isLoading ? '處理中…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className='text-sm text-fg-muted leading-relaxed'>{message}</p>
    </Modal>
  )
}

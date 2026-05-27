'use client'

import { useEffect, useState } from 'react'

type ToastTone = 'success' | 'info' | 'error'

interface ToastProps {
  message: string
  tone?: ToastTone
  duration?: number
  onDismiss?: () => void
}

const TONE_CONFIG: Record<ToastTone, { icon: string; bg: string }> = {
  success: { icon: '✓', bg: 'bg-success' },
  info: { icon: 'i', bg: 'bg-info' },
  error: { icon: '!', bg: 'bg-danger' },
}

export function Toast({ message, tone = 'success', duration = 3000, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true)
  const config = TONE_CONFIG[tone]

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  if (!visible) return null

  return (
    <div
      role='status'
      aria-live='polite'
      className='inline-flex items-center gap-3 px-[18px] py-3 rounded-pill bg-ink-800 text-white shadow-lg text-sm font-medium animate-in slide-in-from-bottom-4 fade-in duration-200'
    >
      <span
        className={[
          'w-6 h-6 rounded-pill flex items-center justify-center text-xs font-bold text-white',
          config.bg,
        ].join(' ')}
        aria-hidden='true'
      >
        {config.icon}
      </span>
      {message}
    </div>
  )
}

/* ── ToastContainer — 固定底部中央 ──────────────────────── */
interface ToastItem {
  id: string
  message: string
  tone?: ToastTone
}

interface ToastContainerProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2'>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} tone={t.tone} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

/* ── useToast hook ───────────────────────────────────────── */
import { useCallback } from 'react'

interface ToastState {
  toasts: ToastItem[]
  toast: (message: string, tone?: ToastTone) => void
  dismiss: (id: string) => void
}

export function useToast(): ToastState {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, tone }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}

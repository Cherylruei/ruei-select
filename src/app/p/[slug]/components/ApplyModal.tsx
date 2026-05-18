'use client'

import { useEffect, useRef, useState } from 'react'
import { initLiff } from '@/lib/line/liff'

type ModalStep =
  | 'intro'
  | 'form'
  | 'submitting'
  | 'success'
  | 'already_pending'
  | 'already_approved'
  | 'error'

interface FormData {
  name: string
  line_id: string
  phone: string
  bio: string
}

interface FormErrors {
  name?: string
  line_id?: string
  phone?: string
}

interface Props {
  storeSlug: string
  storeName: string
  productId?: string
  onClose: () => void
}

const PHONE_REGEX = /^09\d{8}$/

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim() || data.name.trim().length < 2) errors.name = '姓名至少 2 個字'
  if (data.name.trim().length > 20) errors.name = '姓名最多 20 個字'
  if (!data.line_id.trim()) errors.line_id = 'LINE ID 為必填'
  if (data.phone && !PHONE_REGEX.test(data.phone)) errors.phone = '請輸入 09 開頭 10 碼號碼'
  return errors
}

export default function ApplyModal({ storeSlug, storeName, productId, onClose }: Props) {
  const [step, setStep] = useState<ModalStep>('intro')
  const [liffToken, setLiffToken] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [form, setForm] = useState<FormData>({ name: '', line_id: '', phone: '', bio: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const liffInitialized = useRef(false)

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleLineLogin() {
    if (liffInitialized.current) return
    liffInitialized.current = true

    // dev mock
    if (process.env.NODE_ENV === 'development') {
      setLiffToken('dev-mock-token')
      setDisplayName('測試用戶')
      setForm((prev) => ({ ...prev, name: '測試用戶' }))
      setStep('form')
      return
    }

    try {
      const liff = await initLiff()
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href })
        return
      }
      const token = liff.getAccessToken()
      const profile = await liff.getProfile()
      setLiffToken(token)
      setDisplayName(profile.displayName)
      setForm((prev) => ({ ...prev, name: profile.displayName }))
      setStep('form')
    } catch {
      setStep('error')
    }
  }

  function handleChange(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setStep('submitting')
    try {
      const res = await fetch('/api/customers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liffToken,
          slug: storeSlug,
          name: form.name.trim(),
          line_id: form.line_id.trim(),
          phone: form.phone.trim() || undefined,
          bio: form.bio.trim() || undefined,
          source: 'public_page',
          referring_product_id: productId ?? undefined,
        }),
      })
      const json = await res.json()

      if (res.status === 201) {
        setStep('success')
      } else if (res.status === 409) {
        setStep(json.code === 'already_approved' ? 'already_approved' : 'already_pending')
      } else {
        setStep('error')
      }
    } catch {
      setStep('error')
    }
  }

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label='申請加入賣場'
      className='fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-[rgba(0,0,0,0.45)] backdrop-blur-[2px]'
      onClick={handleBackdrop}
    >
      <div className='bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto'>
        {/* 頂部 handle + 關閉 */}
        <div className='flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--neutral-100)]'>
          <h2 className='text-[15px] font-semibold text-[var(--neutral-800)] [font-family:var(--font-zen-maru-gothic)]'>
            申請加入 {storeName}
          </h2>
          <button
            type='button'
            onClick={onClose}
            className='w-7 h-7 flex items-center justify-center rounded-full text-[var(--neutral-400)] hover:bg-[var(--neutral-100)] transition-colors'
            aria-label='關閉'
          >
            <svg
              viewBox='0 0 24 24'
              width='16'
              height='16'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.2'
            >
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        <div className='px-5 py-5'>
          {step === 'intro' && <IntroStep onLogin={handleLineLogin} />}
          {step === 'form' && (
            <FormStep
              form={form}
              errors={errors}
              displayName={displayName}
              onChange={handleChange}
              onSubmit={handleSubmit}
            />
          )}
          {step === 'submitting' && <LoadingStep />}
          {(step === 'success' ||
            step === 'already_pending' ||
            step === 'already_approved' ||
            step === 'error') && <ResultStep step={step} storeName={storeName} onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}

// ── 步驟元件 ──────────────────────────────────────────────────────────────────

function IntroStep({ onLogin }: { onLogin: () => void }) {
  return (
    <div className='flex flex-col items-center text-center gap-5 py-2'>
      <div className='w-14 h-14 rounded-full bg-gradient-to-br from-[var(--forest-400)] to-[var(--forest-deep)] flex items-center justify-center shadow-md'>
        <svg
          viewBox='0 0 24 24'
          width='26'
          height='26'
          fill='none'
          stroke='white'
          strokeWidth='1.8'
        >
          <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
          <circle cx='9' cy='7' r='4' />
          <path d='M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' />
        </svg>
      </div>
      <div>
        <p className='text-[14px] text-[var(--neutral-600)] leading-relaxed'>
          以 LINE 帳號驗證身份後，填寫申請資料，商家審核通過即可成為會員。
        </p>
      </div>
      <button
        type='button'
        onClick={onLogin}
        className='w-full py-3 rounded-xl bg-[#06C755] hover:bg-[#05b54d] text-white text-[13.5px] font-semibold flex items-center justify-center gap-2.5 transition-colors'
      >
        <svg viewBox='0 0 24 24' width='18' height='18' fill='white'>
          <path d='M19.365 9.89c.50 0 .91.41.91.91s-.41.91-.91.91h-2.77v1.62h2.77c.50 0 .91.41.91.91s-.41.91-.91.91h-3.68a.91.91 0 0 1-.91-.91V7.71c0-.50.41-.91.91-.91h3.68c.50 0 .91.41.91.91s-.41.91-.91.91h-2.77v1.18h2.77zM13.16 13.3a.91.91 0 0 1-.73.36.90.90 0 0 1-.56-.19l-3.47-2.60v1.88c0 .50-.41.91-.91.91s-.91-.41-.91-.91V7.71c0-.50.41-.91.91-.91.20 0 .40.07.56.19l3.47 2.60V7.71c0-.50.41-.91.91-.91s.91.41.91.91v5.04c0 .21-.07.41-.18.55zM6.49 14.57a.91.91 0 0 1-.91-.91V7.71c0-.50.41-.91.91-.91s.91.41.91.91v5.95c0 .50-.41.91-.91.91z' />
        </svg>
        以 LINE 登入並申請
      </button>
      <p className='text-[11.5px] text-[var(--neutral-400)]'>
        點擊後將開啟 LINE 授權，我們僅讀取您的基本個人資料。
      </p>
    </div>
  )
}

function FormStep({
  form,
  errors,
  displayName,
  onChange,
  onSubmit,
}: {
  form: FormData
  errors: FormErrors
  displayName: string
  onChange: (
    field: keyof FormData
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className='flex flex-col gap-4'>
      {displayName && (
        <p className='text-[12.5px] text-[var(--neutral-500)] bg-[var(--neutral-50)] rounded-lg px-3 py-2'>
          已以 LINE 帳號{' '}
          <span className='font-medium text-[var(--neutral-700)]'>{displayName}</span> 登入
        </p>
      )}

      <Field label='姓名' required error={errors.name}>
        <input
          type='text'
          value={form.name}
          onChange={onChange('name')}
          placeholder='請輸入您的姓名'
          maxLength={20}
          className={fieldInputClass(!!errors.name)}
        />
      </Field>

      <Field label='LINE ID' required error={errors.line_id}>
        <input
          type='text'
          value={form.line_id}
          onChange={onChange('line_id')}
          placeholder='請輸入您的 LINE ID'
          className={fieldInputClass(!!errors.line_id)}
        />
      </Field>

      <Field label='手機號碼' hint='選填' error={errors.phone}>
        <input
          type='tel'
          value={form.phone}
          onChange={onChange('phone')}
          placeholder='09xxxxxxxx'
          maxLength={10}
          className={fieldInputClass(!!errors.phone)}
        />
      </Field>

      <Field label='自我介紹' hint={`選填・${form.bio.length}/100 字`}>
        <textarea
          value={form.bio}
          onChange={onChange('bio')}
          placeholder='簡單介紹自己（選填）'
          maxLength={100}
          rows={3}
          className={`${fieldInputClass(false)} resize-none`}
        />
      </Field>

      <button
        type='submit'
        className='w-full py-3 rounded-xl bg-[var(--sakura-base)] hover:bg-[var(--sakura-deep)] text-white text-[13.5px] font-semibold transition-colors mt-1'
      >
        送出申請
      </button>
    </form>
  )
}

function LoadingStep() {
  return (
    <div className='flex flex-col items-center gap-4 py-6'>
      <div className='w-10 h-10 rounded-full border-4 border-[var(--forest-200)] border-t-[var(--forest-base)] animate-spin' />
      <p className='text-[13px] text-[var(--neutral-500)]'>送出中…</p>
    </div>
  )
}

function ResultStep({
  step,
  storeName,
  onClose,
}: {
  step: 'success' | 'already_pending' | 'already_approved' | 'error'
  storeName: string
  onClose: () => void
}) {
  const configs = {
    success: {
      icon: (
        <svg
          viewBox='0 0 24 24'
          width='28'
          height='28'
          fill='none'
          stroke='white'
          strokeWidth='2.2'
        >
          <path d='M20 6L9 17l-5-5' />
        </svg>
      ),
      bg: 'from-[var(--forest-400)] to-[var(--forest-deep)]',
      title: '申請已送出！',
      message: `商家收到後會盡快審核，通過後即可進入 ${storeName} 選購。`,
    },
    already_pending: {
      icon: (
        <svg viewBox='0 0 24 24' width='28' height='28' fill='none' stroke='white' strokeWidth='2'>
          <circle cx='12' cy='12' r='10' />
          <path d='M12 6v6l4 2' />
        </svg>
      ),
      bg: 'from-amber-400 to-amber-600',
      title: '申請審核中',
      message: '您的申請正在審核中，請耐心等候商家通知。',
    },
    already_approved: {
      icon: (
        <svg viewBox='0 0 24 24' width='28' height='28' fill='none' stroke='white' strokeWidth='2'>
          <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3' />
        </svg>
      ),
      bg: 'from-[var(--forest-500)] to-[var(--forest-deep)]',
      title: '您已是會員',
      message: `您已是 ${storeName} 的會員，請透過商家提供的連結進入賣場。`,
    },
    error: {
      icon: (
        <svg viewBox='0 0 24 24' width='28' height='28' fill='none' stroke='white' strokeWidth='2'>
          <circle cx='12' cy='12' r='10' />
          <path d='M15 9l-6 6M9 9l6 6' />
        </svg>
      ),
      bg: 'from-red-400 to-red-600',
      title: '發生錯誤',
      message: '申請失敗，請稍後再試或聯繫商家。',
    },
  }

  const c = configs[step]

  return (
    <div className='flex flex-col items-center text-center gap-4 py-4'>
      <div
        className={`w-16 h-16 rounded-full bg-gradient-to-br ${c.bg} flex items-center justify-center shadow-lg`}
      >
        {c.icon}
      </div>
      <div>
        <h3 className='text-[15px] font-bold text-[var(--neutral-800)] [font-family:var(--font-zen-maru-gothic)] mb-1.5'>
          {c.title}
        </h3>
        <p className='text-[13px] text-[var(--neutral-600)] leading-relaxed'>{c.message}</p>
      </div>
      <button
        type='button'
        onClick={onClose}
        className='px-6 py-2.5 rounded-xl border border-[var(--neutral-200)] text-[13px] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors'
      >
        關閉
      </button>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-1'>
      <div className='flex items-center justify-between'>
        <label className='text-[12.5px] font-medium text-[var(--neutral-700)]'>
          {label}
          {required && <span className='text-red-500 ml-0.5'>*</span>}
        </label>
        {hint && <span className='text-[11px] text-[var(--neutral-400)]'>{hint}</span>}
      </div>
      {children}
      {error && <p className='text-[11.5px] text-red-500'>{error}</p>}
    </div>
  )
}

function fieldInputClass(hasError: boolean) {
  return [
    'w-full px-3.5 py-2.5 rounded-xl border text-[13px] text-[var(--neutral-800)] bg-white',
    'placeholder:text-[var(--neutral-400)]',
    'focus:outline-none focus:ring-2 transition-all',
    hasError
      ? 'border-red-400 focus:ring-[rgba(239,68,68,0.2)]'
      : 'border-[var(--neutral-200)] focus:border-[var(--forest-400)] focus:ring-[rgba(85,164,74,0.2)]',
  ].join(' ')
}

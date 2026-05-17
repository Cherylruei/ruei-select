'use client'

import { useEffect, useRef, useState } from 'react'
import { initLiff } from '@/lib/line/liff'

type PageState = 'loading' | 'form' | 'success' | 'already_pending' | 'already_approved' | 'error'

interface JoinClientProps {
  slug: string
  storeName: string
}

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
  bio?: string
}

const PHONE_REGEX = /^09\d{8}$/

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.name.trim() || data.name.trim().length < 2) {
    errors.name = '姓名至少需要 2 個字'
  }
  if (data.name.trim().length > 20) {
    errors.name = '姓名最多 20 個字'
  }
  if (!data.line_id.trim()) {
    errors.line_id = 'LINE ID 為必填'
  }
  if (data.phone && !PHONE_REGEX.test(data.phone)) {
    errors.phone = '請輸入 09 開頭的 10 碼號碼'
  }
  if (data.bio.length > 100) {
    errors.bio = '自我介紹最多 100 字'
  }
  return errors
}

export default function JoinClient({ slug, storeName }: JoinClientProps) {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [liffToken, setLiffToken] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [form, setForm] = useState<FormData>({ name: '', line_id: '', phone: '', bio: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const liffInitialized = useRef(false)

  useEffect(() => {
    if (liffInitialized.current) return
    liffInitialized.current = true

    // dev mock：開發環境跳過 LIFF，直接顯示表單
    if (process.env.NODE_ENV === 'development') {
      /* eslint-disable react-hooks/set-state-in-effect */
      setDisplayName('測試用戶')
      setForm((prev) => ({ ...prev, name: '測試用戶' }))
      setPageState('form')
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }

    async function initAndLogin() {
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
        setPageState('form')
      } catch {
        setPageState('error')
      }
    }

    initAndLogin()
  }, [])

  const handleChange =
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/customers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liffToken,
          slug,
          name: form.name.trim(),
          line_id: form.line_id.trim(),
          phone: form.phone.trim() || undefined,
          bio: form.bio.trim() || undefined,
          source: 'invite_link',
        }),
      })
      const json = await res.json()

      if (res.status === 201) {
        setPageState('success')
      } else if (res.status === 409) {
        if (json.code === 'already_approved') {
          setPageState('already_approved')
        } else {
          setPageState('already_pending')
        }
      } else {
        setPageState('error')
      }
    } catch {
      setPageState('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (pageState === 'loading') {
    return (
      <div className='min-h-screen bg-[var(--neutral-50)] flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-12 h-12 rounded-full border-4 border-[var(--sage-200)] border-t-[var(--sage-500)] animate-spin mx-auto mb-4' />
          <p className='text-sm text-[var(--neutral-500)]'>LINE 登入中...</p>
        </div>
      </div>
    )
  }

  if (pageState === 'success') {
    return <ResultPage type='success' storeName={storeName} />
  }

  if (pageState === 'already_pending') {
    return <ResultPage type='already_pending' storeName={storeName} />
  }

  if (pageState === 'already_approved') {
    return <ResultPage type='already_approved' storeName={storeName} />
  }

  if (pageState === 'error') {
    return <ResultPage type='error' storeName={storeName} />
  }

  return (
    <div className='min-h-screen bg-[var(--neutral-50)] flex flex-col items-center justify-center px-4 py-10'>
      <div className='w-full max-w-md'>
        {/* Header */}
        <div className='text-center mb-8'>
          <div className='w-16 h-16 rounded-full bg-gradient-to-br from-[var(--sage-400)] to-[var(--sage-600)] flex items-center justify-center mx-auto mb-4 shadow-md'>
            <svg
              viewBox='0 0 24 24'
              width='28'
              height='28'
              fill='none'
              stroke='white'
              strokeWidth='1.8'
            >
              <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
              <circle cx='9' cy='7' r='4' />
              <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
              <path d='M16 3.13a4 4 0 0 1 0 7.75' />
            </svg>
          </div>
          <h1 className='text-xl font-bold text-[var(--neutral-800)] [font-family:var(--font-zen-maru-gothic)] mb-1'>
            申請加入 {storeName}
          </h1>
          <p className='text-sm text-[var(--neutral-500)]'>
            以 LINE 帳號{' '}
            <span className='font-medium text-[var(--neutral-700)]'>{displayName}</span> 申請加入
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className='bg-white rounded-2xl border border-[var(--neutral-200)] shadow-sm p-6 flex flex-col gap-5'
        >
          {/* 姓名 */}
          <FormField label='姓名' required error={errors.name}>
            <input
              type='text'
              value={form.name}
              onChange={handleChange('name')}
              placeholder='請輸入您的姓名'
              maxLength={20}
              className={inputClass(!!errors.name)}
            />
          </FormField>

          {/* LINE ID */}
          <FormField label='LINE ID' required error={errors.line_id}>
            <input
              type='text'
              value={form.line_id}
              onChange={handleChange('line_id')}
              placeholder='請輸入您的 LINE ID（供商家聯繫）'
              className={inputClass(!!errors.line_id)}
            />
          </FormField>

          {/* 手機號碼 */}
          <FormField label='手機號碼' error={errors.phone} hint='選填'>
            <input
              type='tel'
              value={form.phone}
              onChange={handleChange('phone')}
              placeholder='09xxxxxxxx'
              maxLength={10}
              className={inputClass(!!errors.phone)}
            />
          </FormField>

          {/* 自我介紹 */}
          <FormField label='自我介紹' error={errors.bio} hint={`選填・${form.bio.length}/100 字`}>
            <textarea
              value={form.bio}
              onChange={handleChange('bio')}
              placeholder='簡單介紹自己，讓商家更了解您（上限 100 字）'
              maxLength={100}
              rows={3}
              className={`${inputClass(!!errors.bio)} resize-none`}
            />
          </FormField>

          <button
            type='submit'
            disabled={submitting}
            className='w-full py-3 bg-[var(--sage-500)] hover:bg-[var(--sage-600)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {submitting && (
              <svg
                className='animate-spin'
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M21 12a9 9 0 1 1-6.219-8.56' />
              </svg>
            )}
            送出申請
          </button>
        </form>
      </div>
    </div>
  )
}

// ── 結果頁面 ──────────────────────────────────────────────────────────────────

function ResultPage({
  type,
  storeName,
}: {
  type: 'success' | 'already_pending' | 'already_approved' | 'error'
  storeName: string
}) {
  const configs = {
    success: {
      icon: (
        <svg viewBox='0 0 24 24' width='32' height='32' fill='none' stroke='white' strokeWidth='2'>
          <path d='M20 6L9 17l-5-5' />
        </svg>
      ),
      bgClass: 'from-[var(--sage-400)] to-[var(--sage-600)]',
      title: '申請已送出！',
      message: `商家收到您的申請後會盡快審核。審核通過後即可進入 ${storeName} 選購。`,
    },
    already_pending: {
      icon: (
        <svg viewBox='0 0 24 24' width='32' height='32' fill='none' stroke='white' strokeWidth='2'>
          <circle cx='12' cy='12' r='10' />
          <path d='M12 6v6l4 2' />
        </svg>
      ),
      bgClass: 'from-[var(--color-warning,#c4a828)] to-[#9a8020]',
      title: '申請審核中',
      message: '您的申請正在審核中，請耐心等候。商家審核通過後會通知您。',
    },
    already_approved: {
      icon: (
        <svg viewBox='0 0 24 24' width='32' height='32' fill='none' stroke='white' strokeWidth='2'>
          <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
          <path d='M22 4L12 14.01l-3-3' />
        </svg>
      ),
      bgClass: 'from-[var(--sage-500)] to-[var(--sage-700)]',
      title: '您已是會員',
      message: `您已是 ${storeName} 的會員，請透過商家分享的連結進入賣場。`,
    },
    error: {
      icon: (
        <svg viewBox='0 0 24 24' width='32' height='32' fill='none' stroke='white' strokeWidth='2'>
          <circle cx='12' cy='12' r='10' />
          <path d='M15 9l-6 6M9 9l6 6' />
        </svg>
      ),
      bgClass: 'from-[var(--color-danger,#c4453d)] to-[#9a3028]',
      title: '發生錯誤',
      message: '申請失敗，請稍後再試或聯繫商家。',
    },
  }

  const config = configs[type]

  return (
    <div className='min-h-screen bg-[var(--neutral-50)] flex items-center justify-center px-4'>
      <div className='text-center max-w-sm'>
        <div
          className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.bgClass} flex items-center justify-center mx-auto mb-6 shadow-lg`}
        >
          {config.icon}
        </div>
        <h2 className='text-xl font-bold text-[var(--neutral-800)] [font-family:var(--font-zen-maru-gothic)] mb-3'>
          {config.title}
        </h2>
        <p className='text-sm text-[var(--neutral-600)] leading-relaxed'>{config.message}</p>
      </div>
    </div>
  )
}

// ── 表單工具 ──────────────────────────────────────────────────────────────────

function FormField({
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
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium text-[var(--neutral-700)]'>
          {label}
          {required && <span className='text-[var(--color-danger,#c4453d)] ml-0.5'>*</span>}
        </label>
        {hint && <span className='text-xs text-[var(--neutral-400)]'>{hint}</span>}
      </div>
      {children}
      {error && <p className='text-xs text-[var(--color-danger,#c4453d)]'>{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full px-4 py-2.5 rounded-xl border text-sm text-[var(--neutral-800)] bg-white',
    'placeholder:text-[var(--neutral-400)]',
    'focus:outline-none focus:ring-2 transition-all',
    hasError
      ? 'border-[var(--color-danger,#c4453d)] focus:ring-[rgba(196,69,61,0.2)]'
      : 'border-[var(--neutral-200)] focus:border-[var(--sage-400)] focus:ring-[rgba(109,171,61,0.2)]',
  ].join(' ')
}

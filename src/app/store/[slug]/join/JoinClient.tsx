'use client'

import { useEffect, useRef, useState } from 'react'
import { initLiff } from '@/lib/line/liff'

type PageState = 'loading' | 'form' | 'success' | 'already_pending' | 'already_approved' | 'error'

interface JoinClientProps {
  slug: string
  storeName: string
  storeAvatarUrl?: string | null
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

export default function JoinClient({ slug, storeName, storeAvatarUrl }: JoinClientProps) {
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

    if (process.env.NODE_ENV === 'development') {
      /* eslint-disable react-hooks/set-state-in-effect */
      setLiffToken('dev-mock-token')
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

        // 已是審核通過的會員 → 直接進入賣場，不顯示申請表單
        const authRes = await fetch(`/api/store-auth?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token ?? ''}` },
        })
        if (authRes.ok) {
          const authData = await authRes.json()
          if (authData.status === 'approved') {
            window.location.replace(`/store/${slug}`)
            return
          }
        }

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
      <div className='h-screen bg-[var(--neutral-50)] flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-10 h-10 rounded-full border-4 border-[var(--forest-200)] border-t-[var(--forest-base)] animate-spin mx-auto mb-3' />
          <p className='text-sm text-[var(--neutral-500)]'>LINE 登入中...</p>
        </div>
      </div>
    )
  }

  if (pageState !== 'form') {
    return <ResultPage type={pageState} storeName={storeName} />
  }

  return (
    <div className='h-screen bg-[var(--neutral-50)] flex flex-col lg:flex-row overflow-hidden'>
      {/* ── 左側品牌區（桌機） ─────────────────────────────── */}
      <div className='hidden lg:flex lg:w-2/5 xl:w-1/3 bg-gradient-to-br from-[var(--forest-base)] to-[var(--forest-deep)] flex-col items-center justify-center px-10 shrink-0'>
        {storeAvatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={storeAvatarUrl}
            alt={storeName}
            className='w-24 h-24 rounded-full object-cover ring-4 ring-white/20 shadow-lg mb-6'
          />
        ) : (
          <div className='w-24 h-24 rounded-full bg-white/10 ring-4 ring-white/20 flex items-center justify-center mb-6 shadow-lg'>
            <svg
              viewBox='0 0 24 24'
              width='40'
              height='40'
              fill='none'
              stroke='white'
              strokeWidth='1.5'
              aria-hidden='true'
            >
              <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
              <line x1='3' y1='6' x2='21' y2='6' />
              <path d='M16 10a4 4 0 01-8 0' />
            </svg>
          </div>
        )}
        <h1
          className='text-2xl font-bold text-white mb-2 text-center'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {storeName}
        </h1>
        <p className='text-sm text-white/60 text-center leading-relaxed'>
          填寫資料後，商家審核通過即可進入賣場選購
        </p>
      </div>

      {/* ── 右側表單區 ─────────────────────────────────────── */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        {/* 手機版 header（只在手機顯示） */}
        <div className='lg:hidden flex flex-col items-center pt-6 pb-4 px-4'>
          {storeAvatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={storeAvatarUrl}
              alt={storeName}
              className='w-14 h-14 rounded-full object-cover ring-2 ring-[var(--neutral-200)] shadow mb-3'
            />
          ) : (
            <div className='w-14 h-14 rounded-full bg-gradient-to-br from-[var(--forest-400)] to-[var(--forest-base)] flex items-center justify-center mb-3 shadow'>
              <svg
                viewBox='0 0 24 24'
                width='24'
                height='24'
                fill='none'
                stroke='white'
                strokeWidth='2'
                aria-hidden='true'
              >
                <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
                <line x1='3' y1='6' x2='21' y2='6' />
                <path d='M16 10a4 4 0 01-8 0' />
              </svg>
            </div>
          )}
          <h1
            className='text-lg font-bold text-[var(--neutral-800)] mb-0.5'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            申請加入 {storeName}
          </h1>
          <p className='text-xs text-[var(--neutral-500)]'>
            以 LINE 帳號{' '}
            <span className='font-medium text-[var(--neutral-700)]'>{displayName}</span> 申請加入
          </p>
        </div>

        {/* 表單捲動區 */}
        <div className='flex-1 overflow-y-auto'>
          <form
            onSubmit={handleSubmit}
            className='h-full lg:flex lg:flex-col lg:justify-between px-4 lg:px-10 xl:px-16 pb-4 lg:py-10'
          >
            {/* 桌機版標題 */}
            <div className='hidden lg:block mb-6'>
              <h2
                className='text-xl font-bold text-[var(--neutral-800)] mb-1'
                style={{ fontFamily: 'var(--font-display)' }}
              >
                申請加入賣場
              </h2>
              <p className='text-sm text-[var(--neutral-500)]'>
                以 LINE 帳號{' '}
                <span className='font-medium text-[var(--neutral-700)]'>{displayName}</span>{' '}
                申請加入
              </p>
            </div>

            {/* 表單欄位 */}
            <div className='flex flex-col gap-3 lg:gap-4'>
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

              <FormField label='LINE ID' required error={errors.line_id}>
                <input
                  type='text'
                  value={form.line_id}
                  onChange={handleChange('line_id')}
                  placeholder='請輸入您的 LINE ID（供商家聯繫）'
                  className={inputClass(!!errors.line_id)}
                />
              </FormField>

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

              <FormField
                label='自我介紹'
                error={errors.bio}
                hint={`選填・${form.bio.length}/100 字`}
              >
                <textarea
                  value={form.bio}
                  onChange={handleChange('bio')}
                  placeholder='簡單介紹自己，讓商家更了解您（上限 100 字）'
                  maxLength={100}
                  rows={2}
                  className={`${inputClass(!!errors.bio)} resize-none`}
                />
              </FormField>
            </div>

            {/* 送出按鈕 */}
            <div className='mt-4 lg:mt-6'>
              <button
                type='submit'
                disabled={submitting}
                className='w-full py-3 bg-[var(--forest-base)] hover:bg-[var(--forest-deep)] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[var(--sh-sm)]'
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
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── 結果頁面 ──────────────────────────────────────────────────────────────────

function ResultPage({
  type,
  storeName,
}: {
  type: Exclude<PageState, 'loading' | 'form'>
  storeName: string
}) {
  const configs = {
    success: {
      icon: (
        <svg viewBox='0 0 24 24' width='32' height='32' fill='none' stroke='white' strokeWidth='2'>
          <path d='M20 6L9 17l-5-5' />
        </svg>
      ),
      bgClass: 'from-[var(--forest-400)] to-[var(--forest-base)]',
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
      bgClass: 'from-[var(--forest-400)] to-[var(--forest-deep)]',
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
      bgClass: 'from-[var(--sakura-400)] to-[var(--sakura-base)]',
      title: '發生錯誤',
      message: '申請失敗，請稍後再試或聯繫商家。',
    },
  }

  const config = configs[type]

  return (
    <div className='h-screen bg-[var(--neutral-50)] flex items-center justify-center px-4'>
      <div className='text-center max-w-sm'>
        <div
          className={`w-20 h-20 rounded-full bg-gradient-to-br ${config.bgClass} flex items-center justify-center mx-auto mb-6 shadow-[var(--sh-lg)]`}
        >
          {config.icon}
        </div>
        <h2
          className='text-xl font-bold text-[var(--neutral-800)] mb-3'
          style={{ fontFamily: 'var(--font-display)' }}
        >
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
    <div className='flex flex-col gap-1'>
      <div className='flex items-center justify-between'>
        <label className='text-sm font-medium text-[var(--neutral-700)]'>
          {label}
          {required && <span className='text-[var(--color-danger)] ml-0.5'>*</span>}
        </label>
        {hint && <span className='text-xs text-[var(--neutral-400)]'>{hint}</span>}
      </div>
      {children}
      {error && <p className='text-xs text-[var(--color-danger)]'>{error}</p>}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full px-3 py-2 rounded-xl border text-sm text-[var(--neutral-800)] bg-white',
    'placeholder:text-[var(--neutral-400)]',
    'focus:outline-none focus:ring-2 transition-all',
    hasError
      ? 'border-[var(--color-danger)] focus:ring-[rgba(232,58,106,0.15)]'
      : 'border-[var(--neutral-200)] focus:border-[var(--forest-400)] focus:ring-[rgba(58,136,56,0.15)]',
  ].join(' ')
}

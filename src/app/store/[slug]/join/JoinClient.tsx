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

    async function initAndLogin() {
      try {
        // 第一步：取得 token 與顯示名稱
        // 這是唯一因環境而異的部分；dev 走 mock token，prod 走真實 LIFF
        let token: string
        let profileName: string
        if (process.env.NODE_ENV === 'development') {
          token = 'dev-mock-token'
          profileName = '測試用戶'
        } else {
          const liff = await initLiff()
          if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href })
            return
          }
          token = liff.getAccessToken() ?? ''
          const profile = await liff.getProfile()
          profileName = profile.displayName
        }

        // 第二步：不分環境，一律先檢查會員狀態
        // 已是審核通過的會員 → 直接進入賣場，不顯示申請表單
        const authRes = await fetch(`/api/store-auth?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (authRes.ok) {
          const authData = await authRes.json()
          if (authData.status === 'approved') {
            window.location.replace(`/store/${slug}`)
            return
          }
        }

        // 第三步：非會員 → 顯示申請表單
        setLiffToken(token)
        setDisplayName(profileName)
        setForm((prev) => ({ ...prev, name: profileName }))
        setPageState('form')
      } catch {
        setPageState('error')
      }
    }

    initAndLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div
        data-variant='candy'
        className='min-h-screen bg-app flex items-center justify-center'
        style={{ background: CANDY_BG }}
      >
        <div className='text-center'>
          <div className='w-10 h-10 rounded-full border-4 border-primary-bg border-t-primary animate-spin mx-auto mb-3' />
          <p className='text-sm text-fg-muted'>LINE 登入中...</p>
        </div>
      </div>
    )
  }

  if (pageState !== 'form') {
    return <ResultPage type={pageState} storeName={storeName} />
  }

  return (
    <div data-variant='candy' className='min-h-screen' style={{ background: CANDY_BG }}>
      {/* ── 頂欄（登入前無完整 nav） ─────────────────────────── */}
      <header
        className='sticky top-0 z-30 backdrop-blur-md border-b border-line'
        style={{ background: 'rgba(255,246,241,0.85)' }}
      >
        <div className='max-w-[1100px] mx-auto px-4 lg:px-8 h-16 flex items-center gap-4'>
          <div className='flex items-center gap-2.5'>
            {storeAvatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={storeAvatarUrl}
                alt={storeName}
                className='w-9 h-9 rounded-full object-cover ring-1 ring-line'
              />
            ) : (
              <BrandLogo />
            )}
            <div className='leading-tight'>
              <div className='font-display font-bold text-md text-primary-hv'>{storeName}</div>
              <div className='font-mono text-[9px] text-fg-subtle tracking-[0.15em]'>
                RUEI · SELECT
              </div>
            </div>
          </div>
          <div className='flex-1' />
          <span
            className='inline-flex items-center h-7 px-3 rounded-pill font-display font-bold text-[11px] text-white'
            style={{ background: LINE_GREEN }}
          >
            LINE 已連結
          </span>
        </div>
      </header>

      {/* ── 標題 ─────────────────────────────────────────────── */}
      <section className='max-w-[1100px] mx-auto px-4 lg:px-8 pt-6 lg:pt-8'>
        <h1 className='font-display font-bold text-2xl lg:text-3xl leading-tight text-fg'>
          申請加入賣場
        </h1>
        <p className='text-sm text-fg-muted mt-1'>
          以 LINE 帳號 <span className='font-medium text-fg'>{displayName}</span> 申請加入 ·
          資料只有商家看得到 ✿
        </p>
      </section>

      {/* ── 表單 + 側欄 ─────────────────────────────────────── */}
      <section className='max-w-[1100px] mx-auto px-4 lg:px-8 pt-5 lg:pt-6 pb-16 grid lg:grid-cols-[1fr_360px] gap-5 lg:gap-7 items-start'>
        {/* Left：LINE 卡 + 表單卡 */}
        <div className='flex flex-col gap-5'>
          <LineConnectedCard displayName={displayName} />

          <form
            onSubmit={handleSubmit}
            className='bg-surface rounded-2xl border border-line p-5 lg:p-8 shadow-sm'
          >
            <p className='text-[13px] text-fg-muted leading-relaxed mb-6'>
              商家需要你的<b className='text-fg'>姓名與 LINE ID</b>
              來確認身份、邀你進代購群。手機可以之後下單再填，現在不填也沒關係。
            </p>

            <div className='flex flex-col gap-5'>
              <div className='grid sm:grid-cols-2 gap-5'>
                <FormField
                  label='姓名 / 暱稱'
                  required
                  error={errors.name}
                  hint='請填真實姓名或常用暱稱'
                >
                  <input
                    type='text'
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder='例：王小美'
                    maxLength={20}
                    className={inputClass(!!errors.name)}
                  />
                </FormField>

                <FormField
                  label='LINE ID'
                  required
                  error={errors.line_id}
                  hint='商家靠 LINE ID 聯繫你並邀你入群'
                >
                  <div className={fieldPreClass(!!errors.line_id)}>
                    <span className='font-mono text-[14px] text-fg-subtle'>@</span>
                    <input
                      type='text'
                      value={form.line_id}
                      onChange={handleChange('line_id')}
                      placeholder='yuki_0312'
                      className='flex-1 border-0 outline-none bg-transparent py-[11px] text-sm text-fg'
                    />
                  </div>
                </FormField>
              </div>

              <FormField
                label='手機號碼'
                optional
                error={errors.phone}
                hint='出貨、超商取貨才需要，第一次下單時再補即可'
              >
                <div className={`${fieldPreClass(!!errors.phone)} sm:max-w-[340px]`}>
                  <span className='font-mono text-[13px] text-fg-subtle'>+886</span>
                  <span className='w-px h-5 bg-line-strong' />
                  <input
                    type='tel'
                    inputMode='numeric'
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder='0912 345 678'
                    maxLength={10}
                    className='flex-1 border-0 outline-none bg-transparent py-[11px] text-sm text-fg'
                  />
                </div>
              </FormField>

              <FormField
                label='想跟商家說的話'
                optional
                error={errors.bio}
                hint={`選填・${form.bio.length}/100 字`}
              >
                <textarea
                  value={form.bio}
                  onChange={handleChange('bio')}
                  placeholder='例：朋友 Amy 推薦我來的～'
                  maxLength={100}
                  rows={3}
                  className={`${inputClass(!!errors.bio)} resize-none`}
                />
              </FormField>
            </div>

            {/* footer actions */}
            <div className='flex items-center justify-end gap-3 pt-5 mt-6 border-t border-line'>
              <button
                type='submit'
                disabled={submitting}
                className='h-11 px-6 inline-flex items-center gap-2 rounded-pill bg-sakura-600 hover:bg-sakura-700 text-white font-display font-bold border border-sakura-700 shadow-pink transition-colors active:scale-[.98] disabled:opacity-70 disabled:cursor-not-allowed'
              >
                {submitting ? (
                  <svg
                    className='animate-spin'
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <path d='M21 12a9 9 0 1 1-6.219-8.56' />
                  </svg>
                ) : null}
                送出申請
                {!submitting && (
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2.4'
                    strokeLinecap='round'
                    aria-hidden='true'
                  >
                    <path d='M5 12h14M13 6l6 6-6 6' />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right aside（桌機）：接下來會發生什麼 + 隱私 */}
        <aside className='hidden lg:block sticky top-24 space-y-4'>
          <div className='bg-surface rounded-2xl border border-line p-5 shadow-sm'>
            <div className='font-mono text-[10px] tracking-[0.2em] uppercase text-fg-subtle mb-3'>
              接下來會發生什麼
            </div>
            <NextStep n='1' color='step-current' title='送出申請' desc='填好姓名與 LINE ID 即可' />
            <NextStep
              n='2'
              color='step-wait'
              title='等待商家核准'
              desc='通常 1 天內回覆，結果用 LINE 通知'
            />
            <NextStep
              n='3'
              color='step-future'
              title='開始逛賣場'
              desc='核准後即可瀏覽與下單'
              last
            />
          </div>

          <div
            className='flex items-start gap-2 px-4 py-3 rounded-xl'
            style={{ background: 'var(--c-secondary-bg)' }}
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='var(--c-secondary-hv)'
              strokeWidth='1.9'
              strokeLinecap='round'
              className='shrink-0 mt-0.5'
              aria-hidden='true'
            >
              <rect x='5' y='11' width='14' height='9' rx='2' />
              <path d='M8 11V8a4 4 0 018 0v3' />
            </svg>
            <span className='text-[11px] text-fg-muted leading-snug'>
              你填的資料只有<b style={{ color: 'var(--c-secondary-hv)' }}>商家</b>
              看得到，不會公開在賣場上。
            </span>
          </div>
        </aside>
      </section>
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
  if (type === 'success') {
    return (
      <div
        data-variant='candy'
        className='min-h-screen flex items-start justify-center px-4 py-12'
        style={{ background: CANDY_BG }}
      >
        <div className='max-w-[560px] w-full flex flex-col items-center text-center'>
          <div
            className='w-24 h-24 rounded-2xl flex items-center justify-center'
            style={{
              background: 'linear-gradient(135deg,#FFEAD0,#FFD9E4)',
              boxShadow: '0 18px 38px -12px rgba(255,110,148,0.45)',
            }}
          >
            <svg
              width='48'
              height='48'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#e8527c'
              strokeWidth='1.7'
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'
            >
              <circle cx='12' cy='12' r='9' />
              <path d='M12 7.5V12l3 2' />
            </svg>
          </div>

          <div
            className='inline-flex items-center gap-1.5 mt-6 h-7 px-3 rounded-pill font-display font-bold text-[11px]'
            style={{ background: 'var(--c-accent-bg)', color: '#c97a1e' }}
          >
            <span className='w-1.5 h-1.5 rounded-full' style={{ background: '#c97a1e' }} />
            待商家核准
          </div>
          <h1 className='font-display font-bold text-2xl mt-3 leading-snug text-fg'>
            申請已送出 ✿
          </h1>
          <p className='text-sm text-fg-muted mt-2.5 leading-relaxed'>
            {storeName ? `「${storeName}」` : '商家'}收到你的申請囉！核准後就能逛賣場、開始下單。
          </p>

          <div className='w-full mt-8 rounded-2xl bg-surface border border-line p-6 text-left shadow-sm'>
            <NextStep n='done' color='step-done' title='已送出申請' desc='剛剛' descMono />
            <NextStep n='2' color='step-wait' title='等待商家核准' desc='通常 1 天內回覆' />
            <NextStep
              n='3'
              color='step-future'
              title='開始逛賣場'
              desc='核准後即可瀏覽與下單'
              last
            />
          </div>

          <p className='text-[12px] text-fg-muted mt-5 leading-relaxed'>
            核准結果會透過 <b style={{ color: LINE_GREEN }}>LINE</b> 通知你，不用一直回來看 ✦
          </p>
        </div>
      </div>
    )
  }

  const configs = {
    already_pending: {
      gradient: 'linear-gradient(135deg,#FFEAD0,#FFD9E4)',
      stroke: '#c97a1e',
      icon: (stroke: string) => (
        <svg viewBox='0 0 24 24' width='32' height='32' fill='none' stroke={stroke} strokeWidth='2'>
          <circle cx='12' cy='12' r='10' />
          <path d='M12 6v6l4 2' />
        </svg>
      ),
      title: '申請審核中',
      message: '您的申請正在審核中，請耐心等候。商家審核通過後會以 LINE 通知您。',
    },
    already_approved: {
      gradient: 'linear-gradient(135deg,#FFD9E4,#ECE7FF)',
      stroke: '#e8527c',
      icon: (stroke: string) => (
        <svg viewBox='0 0 24 24' width='32' height='32' fill='none' stroke={stroke} strokeWidth='2'>
          <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
          <path d='M22 4L12 14.01l-3-3' />
        </svg>
      ),
      title: '您已是會員',
      message: `您已是 ${storeName} 的會員，請透過商家分享的連結進入賣場。`,
    },
    error: {
      gradient: 'linear-gradient(135deg,#FFD9E4,#FFC9D4)',
      stroke: '#d94466',
      icon: (stroke: string) => (
        <svg viewBox='0 0 24 24' width='32' height='32' fill='none' stroke={stroke} strokeWidth='2'>
          <circle cx='12' cy='12' r='10' />
          <path d='M15 9l-6 6M9 9l6 6' />
        </svg>
      ),
      title: '發生錯誤',
      message: '申請失敗，請稍後再試或聯繫商家。',
    },
  } as const

  const config = configs[type]

  return (
    <div
      data-variant='candy'
      className='min-h-screen flex items-center justify-center px-4'
      style={{ background: CANDY_BG }}
    >
      <div className='text-center max-w-sm'>
        <div
          className='w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6'
          style={{
            background: config.gradient,
            boxShadow: '0 18px 38px -12px rgba(255,110,148,0.4)',
          }}
        >
          {config.icon(config.stroke)}
        </div>
        <h1 className='font-display font-bold text-xl mb-3 text-fg'>{config.title}</h1>
        <p className='text-sm text-fg-muted leading-relaxed'>{config.message}</p>
      </div>
    </div>
  )
}

// ── 子元件 ────────────────────────────────────────────────────────────────────

const CANDY_BG = 'linear-gradient(160deg, #FFF6F1 0%, #FCEAE0 55%, #F6DCD0 100%)'
const LINE_GREEN = '#06C755'

function BrandLogo() {
  return (
    <svg width='36' height='36' viewBox='0 0 44 44' aria-hidden='true'>
      <rect x='35' y='6' width='6' height='6' transform='rotate(45 38 9)' rx='1' fill='#FFB347' />
      <rect x='6' y='10' width='32' height='28' rx='14' fill='#FFD9E4' />
      <circle cx='13' cy='27' r='2.5' fill='#FF6E94' opacity='0.7' />
      <circle cx='31' cy='27' r='2.5' fill='#FF6E94' opacity='0.7' />
      <ellipse cx='17' cy='22' rx='1.6' ry='2.4' fill='#3B2A2A' />
      <ellipse cx='27' cy='22' rx='1.6' ry='2.4' fill='#3B2A2A' />
      <ellipse cx='22' cy='29' rx='3' ry='1.4' fill='#FF6E94' opacity='0.7' />
    </svg>
  )
}

function LineConnectedCard({ displayName }: { displayName: string }) {
  const initial = displayName.trim().charAt(0) || '你'
  return (
    <div
      className='rounded-2xl p-4 lg:p-5 flex items-center gap-3'
      style={{ background: '#E7F8EC', border: '1px solid #BCE9C9' }}
    >
      <div className='relative shrink-0'>
        <div
          className='w-12 h-12 rounded-full flex items-center justify-center text-white font-display font-bold'
          style={{ background: 'linear-gradient(135deg,#FF7A94,#FFA3B6)' }}
        >
          {initial}
        </div>
        <span
          className='absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white'
          style={{ background: LINE_GREEN }}
        >
          <svg width='13' height='13' viewBox='0 0 24 24' fill='#fff' aria-hidden='true'>
            <path d='M12 3C6.9 3 2.75 6.43 2.75 10.66c0 3.79 3.3 6.96 7.76 7.56.3.06.71.2.81.46.09.24.06.6.03.85l-.13.79c-.04.24-.18.92.81.5s5.34-3.14 7.29-5.38c1.34-1.47 1.99-2.97 1.99-4.78C21.31 6.43 17.13 3 12 3z' />
          </svg>
        </span>
      </div>
      <div className='flex-1 leading-snug'>
        <div className='flex items-center gap-1.5'>
          <span className='font-display font-bold text-sm text-fg'>{displayName || '你'}</span>
          <span
            className='inline-flex items-center h-5 px-2 rounded-pill font-display font-bold text-[10px] text-white'
            style={{ background: LINE_GREEN }}
          >
            LINE 已連結
          </span>
        </div>
        <div className='text-[12px] text-fg-muted mt-0.5'>已用 LINE 登入</div>
      </div>
    </div>
  )
}

type StepColor = 'step-current' | 'step-wait' | 'step-future' | 'step-done'

const STEP_STYLES: Record<StepColor, React.CSSProperties> = {
  // step 1 強調：頁面同色系深粉 #D94466（= sakura-600）+ border 凸顯
  'step-current': { background: '#d94466', color: '#fff', border: '1.5px solid #b82f50' },
  'step-wait': { background: '#ffb347', color: '#fff' },
  'step-future': { background: 'var(--bg-sunken)', color: 'var(--fg-subtle)' },
  'step-done': { background: '#2f8a52', color: '#fff' },
}

function NextStep({
  n,
  color,
  title,
  desc,
  last,
  descMono,
}: {
  n: string
  color: StepColor
  title: string
  desc: string
  last?: boolean
  descMono?: boolean
}) {
  const muted = color === 'step-future'
  return (
    <div className='flex items-start gap-3'>
      <div className='flex flex-col items-center'>
        <span
          className='w-6 h-6 rounded-full flex items-center justify-center font-display font-bold text-[11px]'
          style={STEP_STYLES[color]}
        >
          {n === 'done' ? (
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='3'
              strokeLinecap='round'
              aria-hidden='true'
            >
              <path d='M5 12l4 4 10-10' />
            </svg>
          ) : (
            n
          )}
        </span>
        {!last && <span className='w-0.5 flex-1 my-1 bg-line-strong' style={{ minHeight: 18 }} />}
      </div>
      <div className={last ? '' : 'pb-3'}>
        <div className={`font-display font-bold text-sm ${muted ? 'text-fg-muted' : 'text-fg'}`}>
          {title}
        </div>
        <div
          className={`text-[12px] mt-0.5 ${muted ? 'text-fg-subtle' : 'text-fg-muted'} ${descMono ? 'font-mono' : ''}`}
        >
          {desc}
        </div>
      </div>
    </div>
  )
}

// ── 表單工具 ──────────────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  optional,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center gap-1.5'>
        <label className='font-display font-bold text-sm text-fg'>{label}</label>
        {required && (
          <span
            className='inline-flex items-center h-[18px] px-[7px] rounded-pill font-display font-bold text-[10px]'
            style={{ background: 'var(--c-primary-bg)', color: 'var(--c-primary-hv)' }}
          >
            必填
          </span>
        )}
        {optional && <span className='text-[11px] font-medium text-fg-subtle'>選填</span>}
      </div>
      {children}
      {error ? (
        <p className='text-[11px] text-danger'>{error}</p>
      ) : hint ? (
        <p className='text-[11px] text-fg-subtle pl-0.5'>{hint}</p>
      ) : null}
    </div>
  )
}

function inputClass(hasError: boolean) {
  return [
    'w-full px-3.5 py-[11px] rounded-md border-[1.5px] text-sm text-fg bg-surface',
    'placeholder:text-ink-400 outline-none transition-all',
    hasError
      ? 'border-danger focus:shadow-[0_0_0_4px_var(--c-danger-bg)]'
      : 'border-line-strong focus:border-primary focus:shadow-[0_0_0_4px_var(--c-primary-bg)]',
  ].join(' ')
}

function fieldPreClass(hasError: boolean) {
  return [
    'flex items-center gap-2 px-3.5 rounded-md border-[1.5px] bg-surface transition-all',
    hasError
      ? 'border-danger focus-within:shadow-[0_0_0_4px_var(--c-danger-bg)]'
      : 'border-line-strong focus-within:border-primary focus-within:shadow-[0_0_0_4px_var(--c-primary-bg)]',
  ].join(' ')
}

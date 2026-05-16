'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'idle' | 'authenticating' | 'error'

// ── Logo SVG ──────────────────────────────────────────────────────────────────

function RueiSelectEmblem() {
  return (
    <svg
      viewBox='0 0 120 120'
      fill='none'
      className='w-[200px] h-[200px] drop-shadow-[0_6px_18px_rgba(0,0,0,0.25)]'
    >
      <circle cx='60' cy='60' r='57' stroke='rgba(255,255,255,.65)' strokeWidth='1.8' />
      <circle cx='60' cy='60' r='50' stroke='rgba(255,255,255,.28)' strokeWidth='.9' />
      <circle cx='60' cy='60' r='57' fill='rgba(255,255,255,.08)' />
      <g transform='translate(60,35)'>
        <g transform='rotate(-45) translate(0,-4)'>
          <path
            d='M 0 2 C -1.5 -1 -8 -1 -8 -8 C -8 -14 -2.5 -17 0 -13 C 2.5 -17 8 -14 8 -8 C 8 -1 1.5 -1 0 2 Z'
            fill='none'
            stroke='rgba(255,255,255,.88)'
            strokeWidth='1.5'
            strokeLinejoin='round'
          />
        </g>
        <g transform='rotate(45) translate(0,-4)'>
          <path
            d='M 0 2 C -1.5 -1 -8 -1 -8 -8 C -8 -14 -2.5 -17 0 -13 C 2.5 -17 8 -14 8 -8 C 8 -1 1.5 -1 0 2 Z'
            fill='none'
            stroke='rgba(255,255,255,.88)'
            strokeWidth='1.5'
            strokeLinejoin='round'
          />
        </g>
        <g transform='rotate(135) translate(0,-4)'>
          <path
            d='M 0 2 C -1.5 -1 -8 -1 -8 -8 C -8 -14 -2.5 -17 0 -13 C 2.5 -17 8 -14 8 -8 C 8 -1 1.5 -1 0 2 Z'
            fill='none'
            stroke='rgba(255,255,255,.88)'
            strokeWidth='1.5'
            strokeLinejoin='round'
          />
        </g>
        <g transform='rotate(235) translate(0,-4)'>
          <path
            d='M 0 2 C -1.5 -1 -8 -1 -8 -8 C -8 -14 -2.5 -17 0 -13 C 2.5 -17 8 -14 8 -8 C 8 -1 1.5 -1 0 2 Z'
            fill='none'
            stroke='rgba(255,255,255,.88)'
            strokeWidth='1.5'
            strokeLinejoin='round'
          />
        </g>
        <circle r='2.2' fill='none' stroke='rgba(255,255,255,.55)' strokeWidth='.9' />
        <circle r='1.1' fill='rgba(232,116,157,.82)' />
      </g>
      <line
        x1='60'
        y1='44'
        x2='60'
        y2='54'
        stroke='rgba(255,255,255,.32)'
        strokeWidth='1.2'
        strokeLinecap='round'
      />
      <text
        x='60'
        y='80'
        fontFamily="'Zen Maru Gothic','Noto Sans TC',sans-serif"
        fontSize='28'
        fontWeight='700'
        fill='rgba(255,255,255,.95)'
        textAnchor='middle'
        letterSpacing='6'
      >
        芮選
      </text>
      <circle cx='60' cy='103' r='1.5' fill='rgba(245,168,191,.6)' />
      <circle cx='18' cy='82' r='1.5' fill='rgba(245,168,191,.4)' />
      <circle cx='102' cy='82' r='1.5' fill='rgba(245,168,191,.4)' />
      <path id='bottomArc' d='M 15 70 A 50 50 0 0 0 105 70' fill='none' />
      <text
        fontFamily="'Noto Sans TC',sans-serif"
        fontSize='8'
        fill='rgba(255,255,255,.38)'
        letterSpacing='3'
      >
        <textPath href='#bottomArc' startOffset='50%' textAnchor='middle'>
          RUEI SELECT
        </textPath>
      </text>
    </svg>
  )
}

function LineIcon() {
  return (
    <svg viewBox='0 0 48 48' fill='none' className='w-[23px] h-[23px] shrink-0 relative'>
      <rect width='48' height='48' rx='10' fill='rgba(255,255,255,0.25)' />
      <path
        d='M24 10C15.16 10 8 15.82 8 22.9C8 29.24 13.46 34.58 21.06 35.74C21.58 35.84 22.3 36.06 22.48 36.5C22.64 36.9 22.58 37.52 22.52 37.92L22.24 39.58C22.16 39.98 21.88 41.12 24 40.24C26.12 39.36 35.28 33.72 39.06 29.36C41.62 26.56 43 24 43 22.9C43 15.82 35.84 10 27 10H24Z'
        fill='white'
      />
      <path
        d='M20 26.5V19.5H21.5V26.5H20ZM28 26.5L24.5 21.5V26.5H23V19.5H24.5L28 24.5V19.5H29.5V26.5H28ZM18.5 26.5H15V19.5H16.5V25H18.5V26.5ZM33 21H30.5V22.5H33V24H30.5V25H33V26.5H29V19.5H33V21Z'
        fill='#00B900'
      />
    </svg>
  )
}

// ── Feature list items (left panel) ──────────────────────────────────────────

const FEATURES = [
  { icon: <path d='M9 11l3 3L22 4' />, label: '系統化訂單管理，不再漏單' },
  {
    icon: (
      <>
        <path d='M12 20h9' />
        <path d='M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z' />
      </>
    ),
    label: 'AI 一鍵優化商品文案',
  },
  {
    icon: (
      <>
        <line x1='12' y1='1' x2='12' y2='23' />
        <path d='M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' />
      </>
    ),
    label: '外幣匯率自動換算，定價更輕鬆',
  },
  {
    icon: <polyline points='22 12 18 12 15 21 9 3 6 12 2 12' />,
    label: '銷售數據分析，洞察顧客偏好',
  },
]

// ── Main component ────────────────────────────────────────────────────────────

function AdminLoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const signedOut = searchParams.get('signed_out') === '1'
  const [state, setState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  const authenticate = useCallback(
    async (accessToken: string) => {
      setState('authenticating')
      try {
        const res = await fetch('/api/auth/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken }),
        })
        if (!res.ok) {
          const data = (await res.json()) as { error?: string }
          throw new Error(data.error ?? '登入失敗')
        }
        router.replace('/admin')
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : '登入失敗，請重試')
        setState('error')
      }
    },
    [router]
  )

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const { initLiff } = await import('@/lib/line/liff')
        const liff = await initLiff()
        if (cancelled) return

        if (signedOut) {
          if (liff.isLoggedIn()) liff.logout()
          router.replace('/admin/login')
          setState('idle')
          return
        }

        if (liff.isLoggedIn()) {
          const token = liff.getAccessToken()
          if (token) {
            await authenticate(token)
            return
          }
        }
        setState('idle')
      } catch {
        if (!cancelled) setState('idle')
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [authenticate, signedOut, router])

  const handleLineLogin = useCallback(async () => {
    try {
      const { initLiff } = await import('@/lib/line/liff')
      const liff = await initLiff()
      liff.login({ redirectUri: window.location.href })
    } catch {
      setErrorMessage('無法連接 LINE 服務，請檢查網路後重試')
      setState('error')
    }
  }, [])

  const isLoading = state === 'loading' || state === 'authenticating'

  return (
    <div className="flex min-h-screen [font-family:'Noto_Sans_TC',sans-serif] bg-[#f6fbf0] max-[800px]:flex-col">
      {/* ── Left panel ── */}
      <aside
        className='w-[46%] relative overflow-hidden flex flex-col items-center py-[52px] px-12 min-h-screen max-[800px]:w-full max-[800px]:min-h-0 max-[800px]:pt-9 max-[800px]:px-7 max-[800px]:pb-7 max-[480px]:pt-7 max-[480px]:px-5 max-[480px]:pb-6'
        style={{
          background: 'var(--forest-base, #3a8838)',
          backgroundImage:
            'radial-gradient(ellipse 60% 50% at 85% 12%, rgba(109,171,61,0.4) 0%, transparent 65%), radial-gradient(ellipse 50% 60% at 10% 88%, rgba(44,82,24,0.52) 0%, transparent 60%)',
        }}
      >
        {/* Decorative rings */}
        {[
          { width: 320, height: 320, top: -80, borderColor: 'rgba(255,255,255,0.07)' },
          { width: 220, height: 220, top: -30, borderColor: 'rgba(255,255,255,0.05)' },
          { width: 480, height: 480, top: -180, borderColor: 'rgba(255,255,255,0.04)' },
        ].map((ring, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              border: `1px solid ${ring.borderColor}`,
              pointerEvents: 'none',
              width: ring.width,
              height: ring.height,
              top: ring.top,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        ))}

        <div className='relative z-[2] flex flex-col items-center w-full h-full text-center'>
          {/* Logo */}
          <div className='flex flex-col items-center'>
            <RueiSelectEmblem />
            <p className='text-[11.5px] text-white/[.42] tracking-[.26em] uppercase mt-0'>
              Ruei Select · 代購賣家後台
            </p>
          </div>

          {/* Ornament */}
          <div className='flex items-center gap-2.5 my-6 w-full max-w-[280px]'>
            <div className='flex-1 h-px bg-white/[.18]' />
            <div className='flex gap-[5px] items-center'>
              <div className='w-[3px] h-[3px] rounded-full bg-[rgba(245,168,191,0.4)]' />
              <div className='w-1 h-1 rounded-full bg-[rgba(245,168,191,0.7)]' />
              <div className='w-[3px] h-[3px] rounded-full bg-[rgba(245,168,191,0.4)]' />
            </div>
            <div className='flex-1 h-px bg-white/[.18]' />
          </div>

          <h1 className="[font-family:'Zen_Maru_Gothic',sans-serif] text-[27px] font-bold text-white leading-[1.5] tracking-[.04em] mb-2.5">
            選你所選，<span className='text-[#f5a8bf]'>賣得輕鬆</span>。
          </h1>

          {/* Feature list */}
          <ul className='mt-[15px] list-none w-4/5 text-left p-0 max-[800px]:hidden'>
            {FEATURES.map(({ icon, label }, i) => (
              <li
                key={i}
                className={`flex items-center gap-[13px] py-3 border-t border-white/[.08] ${i === FEATURES.length - 1 ? 'border-b border-white/[.08]' : ''}`}
              >
                <div className='w-7 h-7 rounded-lg bg-white/[.12] border border-white/[.1] flex items-center justify-center shrink-0'>
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='#f5a8bf'
                    strokeWidth='2'
                    className='w-[13px] h-[13px]'
                  >
                    {icon}
                  </svg>
                </div>
                <span className='text-[18px] text-white/[.78]'>{label}</span>
              </li>
            ))}
          </ul>

          <p className='mt-auto text-[11.5px] text-white/[.25] pt-[26px]'>
            © 2026 芮選系統 · 商家專屬後台
          </p>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className='w-[54%] flex items-center justify-center py-[60px] px-[72px] bg-[#fcfff9] relative max-[800px]:w-full max-[800px]:min-h-0 max-[800px]:pt-10 max-[800px]:px-6 max-[800px]:pb-14 max-[480px]:pt-8 max-[480px]:px-5 max-[480px]:pb-12'>
        <div
          className='absolute top-0 right-0 w-[220px] h-[220px] pointer-events-none'
          style={{
            background:
              'radial-gradient(circle at top right, rgba(184,216,153,0.16) 0%, transparent 70%)',
          }}
        />

        <div className='w-full max-w-[400px] relative z-[1]'>
          <p className='text-[16px] font-medium text-[#55a44a] tracking-[.14em] uppercase mb-2.5 flex items-center gap-2'>
            商家後台登入
            <span className='flex-1 h-px bg-[#e0f0d0]' />
          </p>
          <h2 className="[font-family:'Zen_Maru_Gothic',sans-serif] text-[40px] font-bold text-[#192e10] leading-[1.3] mb-2.5">
            Hi，歡迎回來 👋
          </h2>
          <p className='text-[18px] text-[#4a5e42] leading-[1.85] mb-[25px]'>
            使用你的 LINE 帳號快速登入。
            <br />
            首次登入會自動建立後台帳號，無需另外申請。
          </p>

          {/* LINE Login button */}
          <button
            onClick={handleLineLogin}
            disabled={isLoading}
            className={`flex items-center justify-center gap-3 w-full py-[17px] px-7 text-white border-0 rounded-full text-[16px] font-bold [font-family:'Noto_Sans_TC',sans-serif] tracking-[.05em] shadow-[0_6px_24px_rgba(0,185,0,0.25)] transition-all duration-200 ${isLoading ? 'bg-[#009100] cursor-not-allowed opacity-75' : 'bg-[#00b900] cursor-pointer'}`}
          >
            <LineIcon />
            {isLoading ? '登入中…' : '使用 LINE 帳號登入'}
          </button>

          {/* Error state */}
          {state === 'error' && (
            <div className='flex gap-2.5 items-start mt-4 p-4 bg-[#fff0f5] rounded-[10px]'>
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='#e8749d'
                strokeWidth='2'
                className='w-[15px] h-[15px] shrink-0 mt-0.5'
              >
                <circle cx='12' cy='12' r='10' />
                <line x1='12' y1='8' x2='12' y2='12' />
                <circle cx='12' cy='16' r='0.5' fill='#e8749d' />
              </svg>
              <p className='text-[15px] text-[#7a3050] leading-[1.7] m-0'>
                {errorMessage}
                <br />
                <button
                  onClick={() => setState('idle')}
                  className='text-[#5a1a38] font-bold bg-transparent border-0 cursor-pointer p-0 text-[15px]'
                >
                  重新登入
                </button>
              </p>
            </div>
          )}

          {/* Feature pills */}
          <div className='flex flex-wrap gap-2 mt-[26px]'>
            {['訂單管理', 'AI 文案', '匯率換算', '數據分析', '供應商管理'].map((label) => (
              <span
                key={label}
                className='inline-flex items-center gap-1.5 bg-[#f2f8ec] border border-[#e0f0d0] rounded-[20px] py-[5px] px-[11px] text-[14px] text-[#4a5e42]'
              >
                <span className='w-[5px] h-[5px] rounded-full bg-[#e8749d] shrink-0 inline-block' />
                {label}
              </span>
            ))}
          </div>

          {/* Info note */}
          <div className='flex gap-2.5 items-start mt-[26px] p-4 bg-[#fff0f5] rounded-[10px]'>
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='#e8749d'
              strokeWidth='2'
              className='w-[15px] h-[15px] shrink-0 mt-0.5'
            >
              <circle cx='12' cy='12' r='10' />
              <line x1='12' y1='8' x2='12' y2='12' />
              <circle cx='12' cy='16' r='0.5' fill='#e8749d' />
            </svg>
            <p className='text-[15px] text-[#7a3050] leading-[1.7] m-0'>
              這是<strong className='text-[#5a1a38]'>商家專屬</strong>
              後台。如果你是顧客，請透過商家提供的邀請連結進入。
            </p>
          </div>

          <div className='mt-[34px] text-center text-[12.5px] text-[#8a9a82]'>
            登入即代表同意{' '}
            <a href='#' className='text-[#4a5e42]'>
              服務條款
            </a>{' '}
            與{' '}
            <a href='#' className='text-[#4a5e42]'>
              隱私政策
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginPageContent />
    </Suspense>
  )
}

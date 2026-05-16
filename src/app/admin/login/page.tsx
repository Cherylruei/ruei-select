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
      style={{ width: 200, height: 200, filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.25))' }}
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
    <svg
      viewBox='0 0 48 48'
      fill='none'
      style={{ width: 23, height: 23, flexShrink: 0, position: 'relative' }}
    >
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
    <div
      className='login-page'
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: "'Noto Sans TC', sans-serif",
        background: '#f6fbf0',
      }}
    >
      {/* ── Left panel ── */}
      <aside
        className='login-aside'
        style={{
          width: '46%',
          background: 'var(--forest-base, #3a8838)',
          backgroundImage:
            'radial-gradient(ellipse 60% 50% at 85% 12%, rgba(109,171,61,0.4) 0%, transparent 65%), radial-gradient(ellipse 50% 60% at 10% 88%, rgba(44,82,24,0.52) 0%, transparent 60%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '52px 48px',
          minHeight: '100vh',
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

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            textAlign: 'center',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <RueiSelectEmblem />
            <p
              style={{
                fontSize: 11.5,
                color: 'rgba(255,255,255,0.42)',
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                marginTop: 0,
              }}
            >
              Ruei Select · 代購賣家後台
            </p>
          </div>

          {/* Ornament */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: '24px 0',
              width: '100%',
              maxWidth: 280,
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.18)' }} />
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <div
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: 'rgba(245,168,191,0.4)',
                }}
              />
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'rgba(245,168,191,0.7)',
                }}
              />
              <div
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: 'rgba(245,168,191,0.4)',
                }}
              />
            </div>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.18)' }} />
          </div>

          <h1
            style={{
              fontFamily: "'Zen Maru Gothic', sans-serif",
              fontSize: 27,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.5,
              letterSpacing: '0.04em',
              marginBottom: 10,
            }}
          >
            選你所選，<span style={{ color: '#f5a8bf' }}>賣得輕鬆</span>。
          </h1>

          {/* Feature list */}
          <ul
            className='login-features'
            style={{
              margin: '15px 0 0',
              listStyle: 'none',
              width: '80%',
              textAlign: 'left',
              padding: 0,
            }}
          >
            {FEATURES.map(({ icon, label }, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  padding: '12px 0',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  borderBottom:
                    i === FEATURES.length - 1 ? '1px solid rgba(255,255,255,0.08)' : undefined,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='#f5a8bf'
                    strokeWidth='2'
                    style={{ width: 13, height: 13 }}
                  >
                    {icon}
                  </svg>
                </div>
                <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.78)' }}>{label}</span>
              </li>
            ))}
          </ul>

          <p
            style={{
              marginTop: 'auto',
              fontSize: 11.5,
              color: 'rgba(255,255,255,0.25)',
              paddingTop: 26,
            }}
          >
            © 2026 芮選系統 · 商家專屬後台
          </p>
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main
        className='login-main'
        style={{
          width: '54%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 72px',
          background: '#fcfff9',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 220,
            height: 220,
            background:
              'radial-gradient(circle at top right, rgba(184,216,153,0.16) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 1 }}>
          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: '#55a44a',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            商家後台登入
            <span style={{ flex: 1, height: 1, background: '#e0f0d0' }} />
          </p>
          <h2
            style={{
              fontFamily: "'Zen Maru Gothic', sans-serif",
              fontSize: 40,
              fontWeight: 700,
              color: '#192e10',
              lineHeight: 1.3,
              marginBottom: 10,
            }}
          >
            Hi，歡迎回來 👋
          </h2>
          <p style={{ fontSize: 18, color: '#4a5e42', lineHeight: 1.85, marginBottom: 25 }}>
            使用你的 LINE 帳號快速登入。
            <br />
            首次登入會自動建立後台帳號，無需另外申請。
          </p>

          {/* LINE Login button */}
          <button
            onClick={handleLineLogin}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              width: '100%',
              padding: '17px 28px',
              background: isLoading ? '#009100' : '#00b900',
              color: '#fff',
              border: 'none',
              borderRadius: 100,
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Noto Sans TC', sans-serif",
              cursor: isLoading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.05em',
              boxShadow: '0 6px 24px rgba(0,185,0,0.25)',
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.75 : 1,
            }}
          >
            <LineIcon />
            {isLoading ? '登入中…' : '使用 LINE 帳號登入'}
          </button>

          {/* Error state */}
          {state === 'error' && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                marginTop: 16,
                padding: '14px 16px',
                background: '#fff0f5',
                borderRadius: 10,
              }}
            >
              <svg
                viewBox='0 0 24 24'
                fill='none'
                stroke='#e8749d'
                strokeWidth='2'
                style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2 }}
              >
                <circle cx='12' cy='12' r='10' />
                <line x1='12' y1='8' x2='12' y2='12' />
                <circle cx='12' cy='16' r='0.5' fill='#e8749d' />
              </svg>
              <p style={{ fontSize: 15, color: '#7a3050', lineHeight: 1.7, margin: 0 }}>
                {errorMessage}
                <br />
                <button
                  onClick={() => setState('idle')}
                  style={{
                    color: '#5a1a38',
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 15,
                  }}
                >
                  重新登入
                </button>
              </p>
            </div>
          )}

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 26 }}>
            {['訂單管理', 'AI 文案', '匯率換算', '數據分析', '供應商管理'].map((label) => (
              <span
                key={label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f2f8ec',
                  border: '1px solid #e0f0d0',
                  borderRadius: 20,
                  padding: '5px 11px',
                  fontSize: 14,
                  color: '#4a5e42',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#e8749d',
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                {label}
              </span>
            ))}
          </div>

          {/* Info note */}
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              marginTop: 26,
              padding: '14px 16px',
              background: '#fff0f5',
              borderRadius: 10,
            }}
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='#e8749d'
              strokeWidth='2'
              style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2 }}
            >
              <circle cx='12' cy='12' r='10' />
              <line x1='12' y1='8' x2='12' y2='12' />
              <circle cx='12' cy='16' r='0.5' fill='#e8749d' />
            </svg>
            <p style={{ fontSize: 15, color: '#7a3050', lineHeight: 1.7, margin: 0 }}>
              這是<strong style={{ color: '#5a1a38' }}>商家專屬</strong>
              後台。如果你是顧客，請透過商家提供的邀請連結進入。
            </p>
          </div>

          <div style={{ marginTop: 34, textAlign: 'center', fontSize: 12.5, color: '#8a9a82' }}>
            登入即代表同意{' '}
            <a href='#' style={{ color: '#4a5e42' }}>
              服務條款
            </a>{' '}
            與{' '}
            <a href='#' style={{ color: '#4a5e42' }}>
              隱私政策
            </a>
          </div>
        </div>
      </main>

      {/* ── Mobile styles ── */}
      <style>{`
        @media (max-width: 800px) {
          .login-page {
            flex-direction: column !important;
          }
          .login-aside {
            width: 100% !important;
            min-height: auto !important;
            padding: 36px 28px 28px !important;
          }
          .login-features {
            display: none !important;
          }
          .login-main {
            width: 100% !important;
            min-height: auto !important;
            padding: 40px 24px 56px !important;
          }
        }
        @media (max-width: 480px) {
          .login-aside {
            padding: 28px 20px 24px !important;
          }
          .login-main {
            padding: 32px 20px 48px !important;
          }
        }
      `}</style>
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

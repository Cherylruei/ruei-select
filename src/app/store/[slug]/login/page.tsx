interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function StoreLoginPage({ params }: PageProps) {
  const { slug } = await params

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--sage-700, #2c5218)',
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 90% 10%, rgba(109,171,61,.3) 0%, transparent 60%), radial-gradient(ellipse 60% 70% at 5% 95%, rgba(28,54,16,.6) 0%, transparent 60%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Noto Sans TC', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'rgba(255,255,255,.07)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,.12)',
          padding: '40px 32px',
          color: '#fff',
          textAlign: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,.2)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(255,255,255,.1)',
            border: '1px solid rgba(255,255,255,.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <svg width='36' height='36' viewBox='0 0 120 120' fill='none' aria-hidden='true'>
            <g transform='translate(60,60)'>
              {[0, 90, 180, 270].map((deg) => (
                <g key={deg} transform={`rotate(${deg - 45}) translate(0,-6)`}>
                  <path
                    d='M 0 2 C -1.5 -1 -8 -1 -8 -8 C -8 -14 -2.5 -17 0 -13 C 2.5 -17 8 -14 8 -8 C 8 -1 1.5 -1 0 2 Z'
                    fill='none'
                    stroke='rgba(255,255,255,.88)'
                    strokeWidth='1.5'
                    strokeLinejoin='round'
                  />
                </g>
              ))}
              <circle r='1.1' fill='rgba(232,116,157,.82)' />
            </g>
          </svg>
        </div>

        <div
          style={{
            fontFamily: "'Zen Maru Gothic', sans-serif",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '.06em',
            marginBottom: 8,
          }}
        >
          芮選 · {slug}
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,.55)',
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          此賣場正在建置中
          <br />
          即將開放顧客登入
        </div>

        {/* Disabled LINE login button */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(0,185,0,.5)',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'not-allowed',
            opacity: 0.6,
            userSelect: 'none',
          }}
          aria-label='尚未開放登入'
        >
          <svg viewBox='0 0 48 48' width='16' height='16' fill='none' aria-hidden='true'>
            <rect width='48' height='48' rx='10' fill='rgba(255,255,255,.25)' />
            <path
              d='M24 10C15.16 10 8 15.82 8 22.9C8 29.24 13.46 34.58 21.06 35.74C21.58 35.84 22.3 36.06 22.48 36.5C22.64 36.9 22.58 37.52 22.52 37.92L22.24 39.58C22.16 39.98 21.88 41.12 24 40.24C26.12 39.36 35.28 33.72 39.06 29.36C41.62 26.56 43 24 43 22.9C43 15.82 35.84 10 27 10H24Z'
              fill='white'
            />
          </svg>
          使用 LINE 登入
        </div>

        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.35)', marginTop: 20 }}>
          Sprint 3 功能上線後開放
        </div>
      </div>
    </div>
  )
}

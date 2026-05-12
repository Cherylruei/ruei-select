export default function AdminDashboard() {
  const today = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <>
      {/* Welcome banner */}
      <section
        style={{
          background: 'var(--forest-deep)',
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 95% 10%, rgba(85,164,74,.4) 0%, transparent 60%), radial-gradient(ellipse 50% 70% at 5% 95%, rgba(28,54,16,.55) 0%, transparent 60%), linear-gradient(135deg, var(--forest-base) 0%, var(--forest-deep) 100%)',
          borderRadius: 'var(--r-xl)',
          padding: '34px 36px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          boxShadow: 'var(--sh-md)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.62)', letterSpacing: '.04em', marginBottom: 8 }}>
            歡迎回來 👋
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-zen-maru-gothic)',
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '.08em',
              marginBottom: 10,
              lineHeight: 1.2,
            }}
          >
            芮選後台
          </h1>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              fontSize: 12.5,
              color: 'rgba(255,255,255,.55)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg
                viewBox='0 0 24 24'
                width='13'
                height='13'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                aria-hidden='true'
              >
                <rect x='3' y='4' width='18' height='18' rx='2' />
                <path d='M3 10h18M8 4V2M16 4V2' />
              </svg>
              {today}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg
                viewBox='0 0 24 24'
                width='13'
                height='13'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                aria-hidden='true'
              >
                <circle cx='12' cy='12' r='9' />
                <polyline points='12 7 12 12 15 14' />
              </svg>
              Sprint 1 · MVP 開發中
            </span>
          </div>
        </div>
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} aria-hidden='true'>
          <svg width='80' height='80' viewBox='0 0 120 120' fill='none'>
            <circle cx='60' cy='60' r='57' stroke='rgba(255,255,255,.65)' strokeWidth='1.8' />
            <circle cx='60' cy='60' r='57' fill='rgba(255,255,255,.08)' />
            <g transform='translate(60,35)'>
              {['-45', '45', '135', '235'].map((deg) => (
                <g key={deg} transform={`rotate(${deg}) translate(0,-4)`}>
                  <path
                    d='M 0 2 C -1.5 -1 -8 -1 -8 -8 C -8 -14 -2.5 -17 0 -13 C 2.5 -17 8 -14 8 -8 C 8 -1 1.5 -1 0 2 Z'
                    fill='none'
                    stroke='rgba(255,255,255,.88)'
                    strokeWidth='1.5'
                    strokeLinejoin='round'
                  />
                </g>
              ))}
              <circle r='2.2' fill='none' stroke='rgba(255,255,255,.55)' strokeWidth='.9' />
              <circle r='1.1' fill='rgba(232,116,157,.82)' />
            </g>
            <line x1='60' y1='44' x2='60' y2='54' stroke='rgba(255,255,255,.32)' strokeWidth='1.2' strokeLinecap='round' />
            <text
              x='60'
              y='80'
              fontFamily="'Zen Maru Gothic',sans-serif"
              fontSize='28'
              fontWeight='700'
              fill='rgba(255,255,255,.95)'
              textAnchor='middle'
              letterSpacing='6'
            >
              芮選
            </text>
          </svg>
        </div>
      </section>

      {/* Quick links */}
      <section style={{ marginTop: 30 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-zen-maru-gothic)',
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--neutral-800)',
              letterSpacing: '.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 4,
                height: 16,
                background: 'var(--forest-base)',
                borderRadius: 4,
              }}
            />
            快速功能
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {[
            {
              href: '/admin/store',
              title: '賣場設定',
              desc: '設定賣場名稱、介紹、頭像與邀請連結',
              icon: (
                <svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' strokeWidth='1.7'>
                  <path d='M3 9l1-5h16l1 5' />
                  <path d='M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9' />
                  <path d='M3 9c0 2 1.5 3 3 3s3-1 3-3M9 9c0 2 1.5 3 3 3s3-1 3-3M15 9c0 2 1.5 3 3 3s3-1 3-3' />
                </svg>
              ),
            },
            {
              href: '/admin/suppliers',
              title: '供應商管理',
              desc: '新增、編輯、刪除供應商資料',
              icon: (
                <svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' strokeWidth='1.7'>
                  <path d='M3 7l9-4 9 4-9 4-9-4z' />
                  <path d='M3 12l9 4 9-4' />
                  <path d='M3 17l9 4 9-4' />
                </svg>
              ),
            },
            {
              href: '/admin/customers',
              title: '顧客管理',
              desc: '審核顧客申請、查看會員名單',
              icon: (
                <svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' strokeWidth='1.7'>
                  <circle cx='9' cy='8' r='3.5' />
                  <path d='M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6' />
                  <circle cx='17' cy='9' r='2.5' />
                  <path d='M15 14c2.5 0 6 1.5 6 5' />
                </svg>
              ),
            },
          ].map((card) => (
            <a
              key={card.href}
              href={card.href}
              style={{
                background: '#fff',
                border: '1px solid var(--neutral-200)',
                borderRadius: 'var(--r-lg)',
                padding: '22px 22px 20px',
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.25s var(--ease-smooth), box-shadow 0.25s var(--ease-smooth)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'var(--forest-50)',
                  color: 'var(--forest-deep)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {card.icon}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-zen-maru-gothic)',
                  fontSize: 17,
                  fontWeight: 500,
                  color: 'var(--neutral-800)',
                }}
              >
                {card.title}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--neutral-500)', lineHeight: 1.6 }}>{card.desc}</div>
            </a>
          ))}
        </div>
      </section>
    </>
  )
}

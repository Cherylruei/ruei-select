import Link from 'next/link'

const QUICK_LINKS = [
  {
    href: '/admin/store',
    title: '賣場設定',
    desc: '設定賣場名稱、介紹、頭像與邀請連結',
    icon: (
      <svg
        viewBox='0 0 24 24'
        width='22'
        height='22'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.7'
      >
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
      <svg
        viewBox='0 0 24 24'
        width='22'
        height='22'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.7'
      >
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
      <svg
        viewBox='0 0 24 24'
        width='22'
        height='22'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.7'
      >
        <circle cx='9' cy='8' r='3.5' />
        <path d='M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6' />
        <circle cx='17' cy='9' r='2.5' />
        <path d='M15 14c2.5 0 6 1.5 6 5' />
      </svg>
    ),
  },
]

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
        className='relative overflow-hidden rounded-2xl px-9 py-8 text-white flex items-center justify-between gap-6'
        style={{
          background: 'var(--forest-deep)',
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 95% 10%, rgba(85,164,74,.4) 0%, transparent 60%), radial-gradient(ellipse 50% 70% at 5% 95%, rgba(28,54,16,.55) 0%, transparent 60%), linear-gradient(135deg, var(--forest-base) 0%, var(--forest-deep) 100%)',
          boxShadow: 'var(--sh-md)',
        }}
      >
        <div className='relative z-10 min-w-0'>
          <p className='text-[13.5px] text-white/60 tracking-wide mb-2'>歡迎回來 👋</p>
          <h1 className='text-3xl font-bold tracking-widest mb-2.5 leading-tight [font-family:var(--font-zen-maru-gothic)]'>
            芮選後台
          </h1>
          <div className='flex gap-4 flex-wrap text-[12.5px] text-white/55'>
            <span className='inline-flex items-center gap-1.5'>
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
            <span className='inline-flex items-center gap-1.5'>
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

        <div className='relative z-10 shrink-0' aria-hidden='true'>
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
      <section className='mt-8'>
        <h2 className='flex items-center gap-2.5 [font-family:var(--font-zen-maru-gothic)] text-lg font-medium text-[var(--neutral-800)] tracking-wide mb-4'>
          <span className='inline-block w-1 h-4 bg-[var(--forest-base)] rounded-full' />
          快速功能
        </h2>

        <div className='grid grid-cols-3 gap-3.5'>
          {QUICK_LINKS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className='bg-white border border-[var(--neutral-200)] rounded-xl p-5 flex flex-col gap-3 no-underline text-inherit relative overflow-hidden transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md'
            >
              <div className='w-11 h-11 rounded-xl bg-[var(--forest-50)] text-[var(--forest-deep)] grid place-items-center'>
                {card.icon}
              </div>
              <p className='[font-family:var(--font-zen-maru-gothic)] text-[17px] font-medium text-[var(--neutral-800)]'>
                {card.title}
              </p>
              <p className='text-[12.5px] text-[var(--neutral-500)] leading-relaxed'>{card.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

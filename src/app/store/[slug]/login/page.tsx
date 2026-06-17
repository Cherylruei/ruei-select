import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

interface PageProps {
  params: Promise<{ slug: string }>
}

const HERO_GRADIENT = 'linear-gradient(150deg, #FF6E94 0%, #9A8CFF 100%)'

export default async function StoreLoginPage({ params }: PageProps) {
  const { slug } = await params

  const serviceClient = createServiceClient()
  const { data: store } = (await serviceClient
    .from('stores')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()) as { data: { name: string } | null; error: unknown }

  if (!store) notFound()

  return (
    <div data-variant='candy' className='min-h-screen grid lg:grid-cols-2 bg-surface'>
      <style>{`
        @keyframes loginFloaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes loginTwinkle { 0%,100% { transform: scale(1); opacity: .55; } 50% { transform: scale(1.2); opacity: 1; } }
        .login-floaty { animation: loginFloaty 4s ease-in-out infinite; }
        .login-sparkle { position: absolute; pointer-events: none; color: #ffb347; animation: loginTwinkle 2s ease-in-out infinite; }
      `}</style>

      {/* ── 左：品牌 hero ──────────────────────────────── */}
      <section
        className='relative px-8 lg:px-14 py-12 lg:py-16 flex flex-col overflow-hidden'
        style={{ background: HERO_GRADIENT }}
      >
        <span className='login-sparkle' style={{ top: 48, right: 48, fontSize: 20 }}>
          ✦
        </span>
        <span
          className='login-sparkle'
          style={{ top: 160, left: 36, fontSize: 14, animationDelay: '.8s' }}
        >
          ✦
        </span>
        <span
          className='login-sparkle'
          style={{ bottom: 90, right: 70, fontSize: 16, animationDelay: '1.3s' }}
        >
          ✦
        </span>
        <div className='absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10' />
        <div className='absolute -left-12 bottom-2 w-32 h-32 rounded-full bg-white/10' />

        <div className='relative z-10 flex flex-col items-start'>
          <div
            className='login-floaty w-20 h-20 rounded-2xl bg-white/95 flex items-center justify-center'
            style={{ boxShadow: '0 18px 40px -10px rgba(60,40,40,0.35)' }}
          >
            <svg width='54' height='54' viewBox='0 0 44 44' aria-hidden='true'>
              <rect
                fill='#FFB347'
                x='35'
                y='6'
                width='6'
                height='6'
                transform='rotate(45 38 9)'
                rx='1'
              />
              <rect
                fill='#FFB347'
                x='4'
                y='32'
                width='4'
                height='4'
                transform='rotate(45 6 34)'
                rx='0.8'
              />
              <rect fill='#FFD9E4' x='6' y='10' width='32' height='28' rx='14' />
              <circle fill='#FF6E94' fillOpacity='0.7' cx='13' cy='27' r='2.5' />
              <circle fill='#FF6E94' fillOpacity='0.7' cx='31' cy='27' r='2.5' />
              <ellipse fill='#3B2A2A' cx='17' cy='22' rx='1.6' ry='2.4' />
              <ellipse fill='#3B2A2A' cx='27' cy='22' rx='1.6' ry='2.4' />
              <ellipse fill='#FF6E94' fillOpacity='0.7' cx='22' cy='29' rx='3' ry='1.4' />
            </svg>
          </div>
          <div
            className='inline-flex items-center gap-1.5 font-mono text-[10px] text-white tracking-[0.2em] uppercase px-2.5 py-1 mt-6 rounded-pill bg-white/15'
            style={{ border: '1px solid rgba(255,255,255,0.28)' }}
          >
            邀請你加入
          </div>
          <h1 className='font-display font-bold text-white text-2xl lg:text-3xl mt-3 leading-tight'>
            {store.name}
          </h1>
          <p className='text-white/85 text-xs mt-2 font-mono tracking-[0.18em]'>RUEI · SELECT</p>
        </div>

        <div className='hidden lg:block flex-1' />

        {/* selling points */}
        <div className='relative z-10 space-y-4 mt-8 lg:mt-0'>
          <SellPoint
            iconColor='#E8527C'
            title='精選好物'
            desc='日本・英國・台灣職人小物'
            icon={<path d='M5 8h14l-1 12H6L5 8z M9 8V6a3 3 0 016 0v2' />}
          />
          <SellPoint
            iconColor='#7E70E8'
            title='許願代購'
            desc='想要的找不到？商家幫你跨海找'
            icon={<path d='M12 4l2.5 5 5.5.8-4 4 1 5.5L12 16.8 7 19.3l1-5.5-4-4 5.5-.8L12 4z' />}
          />
          <SellPoint
            iconColor='#C97A1E'
            title='訂單追蹤'
            desc='從下單到收貨，狀態一目了然'
            icon={<path d='M4 5h16v16H4z M8 10h8M8 14h5' />}
          />
        </div>
      </section>

      {/* ── 右：登入 ──────────────────────────────────── */}
      <section className='px-8 lg:px-16 py-12 lg:py-16 flex flex-col bg-surface'>
        <div className='flex-1 flex flex-col justify-center'>
          <h2 className='font-display font-bold text-xl lg:text-2xl leading-snug text-fg'>
            日本・英國・台灣
            <br />
            職人小物，幫你跨海代購
          </h2>
          <p className='text-sm text-fg-muted mt-4 leading-relaxed'>
            用 LINE 一秒登入，加入{store.name}的選物清單。
            <br />
            登入後填寫資料，待商家核准即可逛賣場 ✿
          </p>

          <Link
            href={`/store/${slug}/join`}
            className='mt-8 lg:mt-9 w-full h-14 rounded-pill text-white font-display font-bold text-md flex items-center justify-center gap-2.5 transition-colors active:scale-[.98] bg-[#06C755] hover:bg-[#05b14c]'
            style={{ boxShadow: '0 12px 30px rgba(6,199,85,0.34)' }}
          >
            <svg width='26' height='26' viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
              <path d='M12 3C6.9 3 2.75 6.43 2.75 10.66c0 3.79 3.3 6.96 7.76 7.56.3.06.71.2.81.46.09.24.06.6.03.85l-.13.79c-.04.24-.18.92.81.5s5.34-3.14 7.29-5.38h0c1.34-1.47 1.99-2.97 1.99-4.78C21.31 6.43 17.13 3 12 3z' />
            </svg>
            用 LINE 快速登入
          </Link>
          <div className='flex items-center justify-center gap-1.5 mt-4 text-fg-subtle'>
            <svg
              width='13'
              height='13'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              aria-hidden='true'
            >
              <rect x='5' y='11' width='14' height='9' rx='2' />
              <path d='M8 11V8a4 4 0 018 0v3' />
            </svg>
            <span className='font-mono text-[10px] tracking-wide'>
              透過 LINE 安全登入 · 不會公開你的帳號
            </span>
          </div>

          <div className='flex items-center gap-3 mt-8 lg:mt-9'>
            <span className='flex-1 h-px bg-line-strong' />
            <span className='font-mono text-[10px] text-fg-subtle tracking-wider uppercase'>
              為什麼用 LINE
            </span>
            <span className='flex-1 h-px bg-line-strong' />
          </div>
          <ul className='mt-5 space-y-2.5'>
            <Advantage>免記帳號密碼，點一下就完成</Advantage>
            <Advantage>核准結果與訂單通知直接傳到 LINE</Advantage>
          </ul>
        </div>

        <p className='text-center text-[11px] text-fg-subtle mt-8 leading-relaxed'>
          登入即表示同意{store.name}
          <a className='text-primary font-semibold' href='#'>
            服務條款
          </a>
          與
          <a className='text-primary font-semibold' href='#'>
            隱私權政策
          </a>
        </p>
      </section>
    </div>
  )
}

function SellPoint({
  iconColor,
  title,
  desc,
  icon,
}: {
  iconColor: string
  title: string
  desc: string
  icon: React.ReactNode
}) {
  return (
    <div className='flex items-center gap-3.5'>
      <div
        className='w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shrink-0'
        style={{ color: iconColor }}
      >
        <svg
          width='22'
          height='22'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.9'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
        >
          {icon}
        </svg>
      </div>
      <div className='leading-tight'>
        <div className='font-display font-bold text-white text-sm'>{title}</div>
        <div className='text-white/75 text-xs mt-0.5'>{desc}</div>
      </div>
    </div>
  )
}

function Advantage({ children }: { children: React.ReactNode }) {
  return (
    <li className='flex items-start gap-2.5 text-[13px] text-fg-muted'>
      <svg
        width='16'
        height='16'
        viewBox='0 0 24 24'
        fill='none'
        stroke='#2f8a52'
        strokeWidth='2.4'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='shrink-0 mt-0.5'
        aria-hidden='true'
      >
        <path d='M5 12l4 4 10-10' />
      </svg>
      {children}
    </li>
  )
}

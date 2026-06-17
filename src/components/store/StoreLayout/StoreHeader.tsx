'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import StoreUserMenu from './StoreUserMenu'

interface StoreHeaderProps {
  name: string
  avatarUrl: string | null
  slug: string
  memberName: string | null
}

export default function StoreHeader({ name, avatarUrl, slug, memberName }: StoreHeaderProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: `/store/${slug}`,
      label: '商品',
      active: pathname === `/store/${slug}` || pathname.startsWith(`/store/${slug}/products`),
    },
    {
      href: `/store/${slug}/wishlist`,
      label: '許願池',
      active: pathname.startsWith(`/store/${slug}/wishlist`),
    },
    {
      href: `/store/${slug}/orders`,
      label: '我的訂單',
      active: pathname.startsWith(`/store/${slug}/orders`),
    },
  ]

  const initial = memberName ? memberName.slice(0, 1) : '我'

  return (
    <header
      className='sticky top-0 z-30 border-b'
      style={{
        background: 'rgba(255,246,241,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: '#f0d9cb',
      }}
    >
      <div className='max-w-[1280px] mx-auto px-4 lg:px-8 h-14 lg:h-16 flex items-center gap-4 lg:gap-6'>
        {/* Brand */}
        <Link href={`/store/${slug}`} className='flex items-center gap-2 shrink-0'>
          {/* Desktop: 賣場大頭貼 */}
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={36}
              height={36}
              className='hidden lg:block w-9 h-9 rounded-full object-cover shrink-0'
              style={{ border: '1px solid #f0d9cb' }}
            />
          ) : (
            <svg
              className='hidden lg:block'
              width='36'
              height='36'
              viewBox='0 0 44 44'
              aria-hidden='true'
            >
              <rect
                fill='#FFB347'
                x='35'
                y='6'
                width='6'
                height='6'
                transform='rotate(45 38 9)'
                rx='1'
              />
              <rect fill='#FFD9E4' x='6' y='10' width='32' height='28' rx='14' />
              <circle fill='#FF6E94' fillOpacity='0.7' cx='13' cy='27' r='2.5' />
              <circle fill='#FF6E94' fillOpacity='0.7' cx='31' cy='27' r='2.5' />
              <ellipse fill='#3B2A2A' cx='17' cy='22' rx='1.6' ry='2.4' />
              <ellipse fill='#3B2A2A' cx='27' cy='22' rx='1.6' ry='2.4' />
              <ellipse fill='#FF6E94' fillOpacity='0.7' cx='22' cy='29' rx='3' ry='1.4' />
            </svg>
          )}
          {/* Mobile: 賣場大頭貼 */}
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={32}
              height={32}
              className='lg:hidden w-8 h-8 rounded-full object-cover shrink-0'
              style={{ border: '1px solid #f0d9cb' }}
            />
          ) : (
            <div className='lg:hidden w-8 h-8 rounded-full bg-gradient-to-br from-sakura-300 to-primary flex items-center justify-center shrink-0'>
              <svg
                viewBox='0 0 24 24'
                width='15'
                height='15'
                fill='none'
                stroke='white'
                strokeWidth='2.2'
                aria-hidden='true'
              >
                <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
                <line x1='3' y1='6' x2='21' y2='6' />
                <path d='M16 10a4 4 0 01-8 0' />
              </svg>
            </div>
          )}
          <div className='leading-tight'>
            <div
              className='font-display font-bold text-[14px] lg:text-[15px] truncate max-w-[120px] lg:max-w-none'
              style={{ color: '#E8527C' }}
            >
              {name}
            </div>
            <div className='hidden lg:block font-mono text-[9px] text-fg-subtle tracking-[0.15em]'>
              RUEI · SELECT
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className='hidden lg:flex items-center gap-1' aria-label='賣場導覽'>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'px-3.5 py-2 rounded-full font-display font-bold text-[13.5px] transition-colors whitespace-nowrap',
                item.active ? 'bg-primary-bg text-primary-hv' : 'text-fg hover:bg-sunken',
              ].join(' ')}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop search bar */}
        <div className='hidden lg:block flex-1 max-w-md relative'>
          <input
            type='search'
            placeholder='搜尋商品 / 訂單…'
            className='w-full h-10 pl-10 pr-4 rounded-full bg-surface text-sm outline-none transition'
            style={{ border: '1px solid #f0d9cb', fontFamily: 'var(--font-body)' }}
            aria-label='搜尋'
          />
          <svg
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
            className='absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none'
            aria-hidden='true'
          >
            <circle cx='11' cy='11' r='6' />
            <path d='M20 20l-4-4' />
          </svg>
        </div>

        {/* Mobile: flex spacer */}
        <div className='flex-1 lg:hidden' />

        {/* Desktop right: bell + user pill */}
        <div className='hidden lg:flex items-center gap-2 shrink-0'>
          <button
            className='relative w-10 h-10 rounded-full bg-surface flex items-center justify-center'
            style={{ border: '1px solid #f0d9cb' }}
            aria-label='通知'
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              aria-hidden='true'
            >
              <path d='M6 16V11a6 6 0 1112 0v5l2 2H4l2-2z' />
              <path d='M10 20a2 2 0 004 0' />
            </svg>
          </button>

          <StoreUserMenu slug={slug} memberName={memberName} />
        </div>

        {/* Mobile: avatar shortcut */}
        <Link
          href={`/store/${slug}/account`}
          className='lg:hidden w-8 h-8 rounded-full bg-primary text-white font-display font-bold text-sm flex items-center justify-center shrink-0'
          aria-label='帳戶'
        >
          {initial}
        </Link>
      </div>
    </header>
  )
}

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface StoreHeaderProps {
  name: string
  avatarUrl: string | null
  slug: string
}

export default function StoreHeader({ name, avatarUrl, slug }: StoreHeaderProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: `/store/${slug}`,
      label: '商品',
      active: pathname === `/store/${slug}` || pathname.startsWith(`/store/${slug}/products`),
    },
    {
      href: `/store/${slug}/orders`,
      label: '訂單',
      active: pathname.startsWith(`/store/${slug}/orders`),
    },
    {
      href: `/store/${slug}/account`,
      label: '帳戶',
      active: pathname === `/store/${slug}/account`,
    },
  ]

  return (
    <header
      className='sticky top-0 z-10 bg-surface border-b shadow-sm'
      style={{ borderColor: 'var(--border)' }}
    >
      <div className='flex items-center gap-3 px-4 h-14 max-w-5xl mx-auto'>
        <div className='flex items-center gap-3 flex-1 min-w-0'>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={36}
              height={36}
              className='w-9 h-9 rounded-full object-cover ring-1 ring-line shrink-0'
            />
          ) : (
            <div className='w-9 h-9 rounded-full bg-gradient-to-br from-forest-400 to-forest-500 flex items-center justify-center shrink-0'>
              <svg
                viewBox='0 0 24 24'
                width='18'
                height='18'
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
          <span
            className='text-[15px] font-bold text-fg truncate'
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {name}
          </span>
        </div>

        {/* 桌面版導覽 */}
        <nav className='hidden lg:flex items-center gap-1' aria-label='賣場導覽'>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                item.active
                  ? 'bg-primary-bg text-primary font-semibold'
                  : 'text-fg-muted hover:text-fg hover:bg-sunken',
              ].join(' ')}
              aria-current={item.active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

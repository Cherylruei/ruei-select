'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface StoreBottomNavProps {
  slug: string
}

export default function StoreBottomNav({ slug }: StoreBottomNavProps) {
  const pathname = usePathname()

  const tabs = [
    {
      href: `/store/${slug}`,
      label: '商品',
      isActive: (p: string) => p === `/store/${slug}` || p.startsWith(`/store/${slug}/products`),
      icon: (active: boolean) => (
        <svg
          viewBox='0 0 24 24'
          width='22'
          height='22'
          fill='none'
          stroke={active ? 'var(--c-primary)' : 'var(--fg-subtle)'}
          strokeWidth='1.8'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <path d='M5 8h14l-1 12H6L5 8z' />
          <path d='M9 8V6a3 3 0 016 0v2' />
        </svg>
      ),
    },
    {
      href: `/store/${slug}/orders`,
      label: '訂單',
      isActive: (p: string) => p.startsWith(`/store/${slug}/orders`),
      icon: (active: boolean) => (
        <svg
          viewBox='0 0 24 24'
          width='22'
          height='22'
          fill={active ? 'var(--c-primary)' : 'none'}
          stroke={active ? 'var(--c-primary)' : 'var(--fg-subtle)'}
          strokeWidth='1.8'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <rect x='4' y='5' width='16' height='16' rx='2' opacity={active ? '0.2' : '0'} />
          <rect
            x='4'
            y='5'
            width='16'
            height='16'
            rx='2'
            fill='none'
            stroke={active ? 'var(--c-primary)' : 'var(--fg-subtle)'}
            strokeWidth='1.8'
          />
          <path
            d='M8 10h8M8 14h5'
            stroke={active ? 'var(--c-primary)' : 'var(--fg-subtle)'}
            strokeWidth='1.8'
            strokeLinecap='round'
          />
        </svg>
      ),
    },
    {
      href: `/store/${slug}/wishlist`,
      label: '許願池',
      isActive: (p: string) => p.startsWith(`/store/${slug}/wishlist`),
      icon: (active: boolean) => (
        <svg
          viewBox='0 0 24 24'
          width='22'
          height='22'
          fill='none'
          stroke={active ? 'var(--c-primary)' : 'var(--fg-subtle)'}
          strokeWidth='1.8'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <path d='M12 4l2.5 5 5.5.8-4 4 1 5.5L12 16.8 7 19.3l1-5.5-4-4 5.5-.8L12 4z' />
        </svg>
      ),
    },
    {
      href: `/store/${slug}/account`,
      label: '我的',
      isActive: (p: string) => p === `/store/${slug}/account`,
      icon: (active: boolean) => (
        <svg
          viewBox='0 0 24 24'
          width='22'
          height='22'
          fill='none'
          stroke={active ? 'var(--c-primary)' : 'var(--fg-subtle)'}
          strokeWidth='1.8'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <circle cx='12' cy='8' r='4' />
          <path d='M4 20c0-4 4-6 8-6s8 2 8 6' />
        </svg>
      ),
    },
  ]

  return (
    <nav
      className='fixed bottom-0 left-0 right-0 z-20 max-w-[420px] mx-auto bg-surface lg:hidden'
      style={{
        borderTop: '1px solid #f0d9cb',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label='底部導覽'
    >
      <ul className='grid grid-cols-4 px-3 py-2'>
        {tabs.map((tab) => {
          const active = tab.isActive(pathname)
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className='flex flex-col items-center gap-1 py-1.5'
                style={{ color: active ? 'var(--c-primary)' : 'var(--fg-subtle)' }}
                aria-current={active ? 'page' : undefined}
              >
                {tab.icon(active)}
                <span
                  className={[
                    'text-[11px]',
                    active ? 'font-display font-bold' : 'font-display font-semibold',
                  ].join(' ')}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

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
      href: `/store/${slug}/account`,
      label: '我的帳戶',
      icon: (active: boolean) => (
        <svg
          viewBox='0 0 24 24'
          width='22'
          height='22'
          fill='none'
          stroke={active ? 'var(--forest-base)' : 'var(--neutral-400)'}
          strokeWidth='1.8'
          aria-hidden='true'
        >
          <path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' />
          <circle cx='12' cy='7' r='4' />
        </svg>
      ),
      isActive: (p: string) => p === `/store/${slug}/account`,
    },
    {
      href: `/store/${slug}`,
      label: '商品',
      icon: (active: boolean) => (
        <svg
          viewBox='0 0 24 24'
          width='22'
          height='22'
          fill='none'
          stroke={active ? 'var(--forest-base)' : 'var(--neutral-400)'}
          strokeWidth='1.8'
          aria-hidden='true'
        >
          <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
          <line x1='3' y1='6' x2='21' y2='6' />
          <path d='M16 10a4 4 0 01-8 0' />
        </svg>
      ),
      isActive: (p: string) => p === `/store/${slug}` || p.startsWith(`/store/${slug}/products`),
    },
    {
      href: `/store/${slug}/orders`,
      label: '我的訂單',
      icon: (active: boolean) => (
        <svg
          viewBox='0 0 24 24'
          width='22'
          height='22'
          fill='none'
          stroke={active ? 'var(--forest-base)' : 'var(--neutral-400)'}
          strokeWidth='1.8'
          aria-hidden='true'
        >
          <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' />
          <polyline points='14 2 14 8 20 8' />
          <line x1='16' y1='13' x2='8' y2='13' />
          <line x1='16' y1='17' x2='8' y2='17' />
          <polyline points='10 9 9 9 8 9' />
        </svg>
      ),
      isActive: (p: string) => p.startsWith(`/store/${slug}/orders`),
    },
  ]

  return (
    <nav
      className='fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-[var(--neutral-200)]'
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label='底部導覽'
    >
      <ul className='flex items-stretch h-16'>
        {tabs.map((tab) => {
          const active = tab.isActive(pathname)
          return (
            <li key={tab.href} className='flex-1'>
              <Link
                href={tab.href}
                className='flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-medium transition-colors'
                style={{ color: active ? 'var(--forest-base)' : 'var(--neutral-400)' }}
                aria-current={active ? 'page' : undefined}
              >
                {tab.icon(active)}
                <span>{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

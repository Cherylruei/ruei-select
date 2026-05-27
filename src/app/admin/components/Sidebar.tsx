'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logout } from '../actions'

interface SidebarProps {
  displayName: string
  avatarUrl: string | null
  isMobileOpen: boolean
  onNavClick?: () => void
}

interface NavItem {
  href: string
  label: string
  exact: boolean
  icon: React.ReactElement
  disabled?: boolean
  tag?: string
}

const NAV_SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: '主要',
    items: [
      {
        href: '/admin',
        label: '總覽',
        exact: true,
        icon: (
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
          >
            <path d='M4 20h16M7 16V10M12 16V6M17 16v-8' />
          </svg>
        ),
      },
      {
        href: '/admin/orders',
        label: '訂單管理',
        exact: false,
        icon: (
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
          >
            <path d='M5 8h14l-1 12H6L5 8z' />
            <path d='M9 8V6a3 3 0 016 0v2' />
          </svg>
        ),
      },
      {
        href: '/admin/products',
        label: '商品管理',
        exact: false,
        icon: (
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
          >
            <path d='M4 8l8-4 8 4-8 4-8-4z' />
            <path d='M4 8v8l8 4 8-4V8' />
          </svg>
        ),
      },
      {
        href: '/admin/customers',
        label: '顧客管理',
        exact: false,
        icon: (
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
          >
            <circle cx='12' cy='8' r='4' />
            <path d='M4 20c0-4 4-6 8-6s8 2 8 6' />
          </svg>
        ),
      },
    ],
  },
  {
    section: '設定',
    items: [
      {
        href: '/admin/suppliers',
        label: '供應商',
        exact: false,
        icon: (
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
          >
            <path d='M3 7l9-4 9 4-9 4-9-4z' />
            <path d='M3 12l9 4 9-4' />
            <path d='M3 17l9 4 9-4' />
          </svg>
        ),
      },
      {
        href: '/admin/store',
        label: '賣場設定',
        exact: false,
        icon: (
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.8'
            strokeLinecap='round'
          >
            <circle cx='12' cy='12' r='3' />
            <path d='M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14' />
          </svg>
        ),
      },
    ],
  },
]

function isActive(href: string, pathname: string, exact: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

export default function Sidebar({
  displayName,
  avatarUrl,
  isMobileOpen,
  onNavClick,
}: SidebarProps) {
  const pathname = usePathname()
  const firstChar = displayName.charAt(0)

  return (
    <aside
      data-testid='sidebar'
      data-mobile-open={String(isMobileOpen)}
      className='w-[220px] shrink-0 bg-surface border-r border-line flex flex-col fixed inset-y-0 left-0 z-50 max-md:-translate-x-full max-md:data-[mobile-open=true]:translate-x-0 transition-transform duration-300'
    >
      {/* ── Header / Logo ───────────────────────────────────── */}
      <Link
        href='/admin'
        onClick={onNavClick}
        className='px-5 py-5 border-b border-line flex items-center gap-3 no-underline text-inherit shrink-0'
      >
        {/* 芮選 sakura logo SVG */}
        <svg width='36' height='36' viewBox='0 0 40 40' className='shrink-0' aria-hidden='true'>
          <ellipse
            cx='32'
            cy='11'
            rx='5'
            ry='3'
            transform='rotate(35 32 11)'
            style={{ fill: 'var(--c-secondary)', opacity: 0.85 }}
          />
          {(
            [
              [20, 11],
              [28.56, 17.22],
              [25.29, 27.28],
              [14.71, 27.28],
              [11.44, 17.22],
            ] as [number, number][]
          ).map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r='9' style={{ fill: 'var(--c-primary)' }} />
          ))}
          <circle cx='20' cy='20' r='4.5' style={{ fill: 'var(--c-primary-bg)' }} />
        </svg>

        <div className='leading-none'>
          <div className='font-display font-bold text-lg tracking-wide text-fg'>芮選</div>
          <div className='font-mono text-[9px] text-fg-subtle tracking-[0.2em] mt-1'>
            RUEI · SELECT
          </div>
        </div>
      </Link>

      {/* ── Nav ────────────────────────────────────────────── */}
      <nav className='flex-1 px-3 py-4'>
        {NAV_SECTIONS.map(({ section, items }) => (
          <div key={section} className='mb-1'>
            <div className='font-mono text-[10px] text-fg-subtle tracking-[0.15em] uppercase px-3 mb-2 mt-3 first:mt-0'>
              {section}
            </div>

            {items.map((item) => {
              const active = isActive(item.href, pathname, item.exact)
              const cls = [
                'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm mb-0.5 no-underline',
                'transition-[background,color] duration-150',
                active ? 'font-semibold' : 'font-medium text-fg hover:bg-sunken',
                item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')

              const activeStyle = active
                ? { backgroundColor: 'var(--c-primary-bg)', color: 'var(--c-primary-hv)' }
                : undefined

              const content = (
                <>
                  <span className='shrink-0 w-5 h-5 grid place-items-center'>{item.icon}</span>
                  <span className='flex-1'>{item.label}</span>
                  {item.tag && (
                    <span className='font-mono text-xs px-2 py-0.5 rounded-pill bg-primary text-white font-medium'>
                      {item.tag}
                    </span>
                  )}
                </>
              )

              if (item.disabled) {
                return (
                  <span key={item.href} className={cls} style={activeStyle}>
                    {content}
                  </span>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cls}
                  style={activeStyle}
                  data-active={String(active)}
                  onClick={onNavClick}
                >
                  {content}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Bottom / Profile ────────────────────────────────── */}
      <div className='p-3 border-t border-line shrink-0'>
        <div className='flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-sunken cursor-pointer'>
          {/* Avatar */}
          <div className='shrink-0 w-9 h-9 rounded-pill bg-secondary text-white font-display font-bold text-sm grid place-items-center overflow-hidden'>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={36}
                height={36}
                className='object-cover'
              />
            ) : (
              <span data-testid='avatar-fallback'>{firstChar}</span>
            )}
          </div>

          {/* Name + role */}
          <div className='flex-1 leading-tight min-w-0'>
            <div className='font-semibold text-sm text-fg truncate'>{displayName}</div>
            <div className='font-mono text-[10px] text-fg-subtle'>商家管理員</div>
          </div>

          {/* Logout */}
          <form action={logout} className='shrink-0'>
            <button
              type='submit'
              aria-label='登出'
              title='登出'
              className='w-[28px] h-[28px] rounded-lg border-0 bg-transparent text-fg-subtle grid place-items-center cursor-pointer hover:text-fg transition'
            >
              <svg
                viewBox='0 0 24 24'
                width='15'
                height='15'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                aria-hidden='true'
              >
                <path d='M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4' />
                <polyline points='16 17 21 12 16 7' />
                <line x1='21' y1='12' x2='9' y2='12' />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}

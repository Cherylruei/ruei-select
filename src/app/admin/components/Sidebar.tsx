'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logout } from '../actions'

interface SidebarProps {
  displayName: string
  avatarUrl: string | null
  isCollapsed: boolean
  isMobileOpen: boolean
  onToggle: () => void
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

const NAV_ITEMS: { section: string; items: NavItem[] }[] = [
  {
    section: '主功能',
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
            strokeWidth='1.7'
          >
            <rect x='3' y='3' width='7' height='9' rx='1.5' />
            <rect x='14' y='3' width='7' height='5' rx='1.5' />
            <rect x='14' y='12' width='7' height='9' rx='1.5' />
            <rect x='3' y='16' width='7' height='5' rx='1.5' />
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
        label: '供應商管理',
        exact: false,
        icon: (
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
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
        label: '顧客管理',
        exact: false,
        icon: (
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
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
            strokeWidth='1.7'
          >
            <rect x='3' y='6' width='18' height='14' rx='2' />
            <path d='M3 10h18M8 6V4M16 6V4' />
          </svg>
        ),
      },
    ],
  },
  {
    section: '即將推出',
    items: [
      {
        href: '/admin/orders',
        label: '訂單管理',
        tag: 'S3',
        disabled: true,
        exact: false,
        icon: (
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.7'
          >
            <path d='M5 4h14l-1 12H6L5 4z' />
            <path d='M5 4l-1-2H1' />
            <circle cx='9' cy='20' r='1.5' />
            <circle cx='17' cy='20' r='1.5' />
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
  isCollapsed,
  isMobileOpen,
  onToggle,
  onNavClick,
}: SidebarProps) {
  const pathname = usePathname()
  const firstChar = displayName.charAt(0)

  return (
    <aside
      data-testid='sidebar'
      data-collapsed={String(isCollapsed)}
      data-mobile-open={String(isMobileOpen)}
      className={`shrink-0 text-white flex flex-col fixed inset-y-0 left-0 z-50 overflow-hidden [transition:width_0.3s_var(--ease-smooth),transform_0.3s_var(--ease-smooth)] max-md:-translate-x-full max-md:data-[mobile-open=true]:translate-x-0 max-md:w-[220px] ${isCollapsed ? 'w-16' : 'w-[220px]'}`}
      style={{
        background: 'var(--forest-deep)',
        backgroundImage:
          'radial-gradient(ellipse 60% 50% at 85% 12%, rgba(85,164,74,.28) 0%, transparent 65%), radial-gradient(ellipse 50% 60% at 10% 88%, rgba(28,54,16,.45) 0%, transparent 60%)',
      }}
    >
      {/* Header */}
      <Link
        href='/admin'
        onClick={onNavClick}
        className='pt-[18px] px-4 pb-4 flex items-center gap-3 border-b border-white/[.08] shrink-0 no-underline text-inherit'
      >
        <div className='shrink-0 w-10 h-10'>
          <svg width='40' height='40' viewBox='0 0 120 120' fill='none' aria-hidden='true'>
            <circle cx='60' cy='60' r='57' stroke='rgba(255,255,255,.65)' strokeWidth='1.8' />
            <circle cx='60' cy='60' r='57' fill='rgba(255,255,255,.08)' />
            <g transform='translate(60,60)'>
              {['-45', '45', '135', '235'].map((deg) => (
                <g key={deg} transform={`rotate(${deg}) translate(0,-6)`}>
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
          </svg>
        </div>
        <div
          className={`overflow-hidden [transition:opacity_0.2s_var(--ease-smooth)] ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
        >
          <div className='[font-family:var(--font-zen-maru-gothic)] font-bold text-[19px] tracking-[.12em] whitespace-nowrap'>
            芮選
          </div>
          <div className='text-[10px] text-white/[.42] tracking-[.22em] whitespace-nowrap'>
            RUEI SELECT
          </div>
        </div>
      </Link>

      {/* Nav */}
      <ul className='list-none py-3.5 px-2.5 flex-1 overflow-y-auto m-0'>
        {NAV_ITEMS.map(({ section, items }) => (
          <li key={section}>
            <div
              className={`text-[10.5px] tracking-[.22em] uppercase pt-3.5 px-3 pb-2 whitespace-nowrap transition-colors duration-200 ${isCollapsed ? 'text-transparent' : 'text-white/[.32]'}`}
            >
              {section}
            </div>
            <ul className='list-none p-0 m-0'>
              {items.map((item) => {
                const active = isActive(item.href, pathname, item.exact ?? false)
                const navClassName = [
                  'flex items-center gap-3 py-2.5 px-3 rounded-[10px] text-[14.5px] whitespace-nowrap mb-0.5 no-underline',
                  'transition-[background,color] duration-150',
                  active
                    ? 'text-white bg-white/[.13] shadow-[inset_3px_0_0_var(--sakura-300)]'
                    : 'text-white/[.78] bg-transparent',
                  item.disabled ? 'opacity-[.35] cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')

                const content = (
                  <>
                    <span className='shrink-0 w-5 h-5 grid place-items-center'>{item.icon}</span>
                    <span
                      className={`flex-1 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
                    >
                      {item.label}
                    </span>
                    {item.tag && !isCollapsed && (
                      <span className='text-[10px] py-0.5 px-1.5 rounded bg-white/[.08] text-white/50 font-medium'>
                        {item.tag}
                      </span>
                    )}
                  </>
                )

                if (item.disabled) {
                  return (
                    <li key={item.href}>
                      <span className={navClassName}>{content}</span>
                    </li>
                  )
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={navClassName}
                      data-active={String(active)}
                      onClick={onNavClick}
                    >
                      {content}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className='py-3 px-2.5 border-t border-white/[.08] flex items-center gap-2.5 shrink-0'>
        <div className='flex items-center gap-2.5 flex-1 min-w-0'>
          <div className='shrink-0 w-9 h-9 rounded-full bg-[linear-gradient(135deg,var(--sakura-300),var(--sakura-base))] grid place-items-center text-white font-bold text-[14px] [font-family:var(--font-zen-maru-gothic)] shadow-[0_2px_6px_rgba(0,0,0,0.2)] overflow-hidden'>
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
          <div
            className={`leading-[1.3] overflow-hidden transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}
          >
            <div className='text-[13px] font-medium text-white whitespace-nowrap overflow-hidden text-ellipsis'>
              {displayName}
            </div>
            <div className='text-[11px] text-white/[.45] whitespace-nowrap'>商家管理員</div>
          </div>
        </div>

        <form action={logout} className='shrink-0'>
          <button
            type='submit'
            aria-label='登出'
            title='登出'
            className='w-[30px] h-[30px] rounded-lg border-0 bg-white/[.08] text-white/[.7] grid place-items-center cursor-pointer'
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

        <button
          onClick={onToggle}
          aria-label='收合側邊欄'
          className='shrink-0 w-[30px] h-[30px] rounded-lg border-0 bg-white/[.08] text-white/[.7] grid place-items-center cursor-pointer'
        >
          <svg
            viewBox='0 0 24 24'
            width='16'
            height='16'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            aria-hidden='true'
          >
            <polyline points='15 18 9 12 15 6' />
          </svg>
        </button>
      </div>
    </aside>
  )
}

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
    ],
  },
  {
    section: '即將推出',
    items: [
      {
        href: '/admin/products',
        label: '商品管理',
        tag: 'S2',
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
            <rect x='3' y='6' width='18' height='14' rx='2' />
            <path d='M3 10h18M8 6V4M16 6V4' />
          </svg>
        ),
      },
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
      style={{
        width: isCollapsed ? 64 : 220,
        flexShrink: 0,
        background: 'var(--forest-deep)',
        backgroundImage:
          'radial-gradient(ellipse 60% 50% at 85% 12%, rgba(85,164,74,.28) 0%, transparent 65%), radial-gradient(ellipse 50% 60% at 10% 88%, rgba(28,54,16,.45) 0%, transparent 60%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        transition: 'width 0.3s var(--ease-smooth), transform 0.3s var(--ease-smooth)',
        overflow: 'hidden',
        transform: isMobileOpen ? 'translateX(0)' : undefined,
      }}
      className='admin-sidebar'
    >
      {/* Header */}
      <Link
        href='/admin'
        onClick={onNavClick}
        style={{
          padding: '18px 16px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid rgba(255,255,255,.08)',
          flexShrink: 0,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ flexShrink: 0, width: 40, height: 40 }}>
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
          style={{
            overflow: 'hidden',
            opacity: isCollapsed ? 0 : 1,
            transition: 'opacity 0.2s var(--ease-smooth)',
            pointerEvents: isCollapsed ? 'none' : 'auto',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-zen-maru-gothic)',
              fontWeight: 700,
              fontSize: 19,
              letterSpacing: '.12em',
              whiteSpace: 'nowrap',
            }}
          >
            芮選
          </div>
          <div
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,.42)',
              letterSpacing: '.22em',
              whiteSpace: 'nowrap',
            }}
          >
            RUEI SELECT
          </div>
        </div>
      </Link>

      {/* Nav */}
      <ul
        style={{
          listStyle: 'none',
          padding: '14px 10px',
          flex: 1,
          overflowY: 'auto',
          margin: 0,
        }}
      >
        {NAV_ITEMS.map(({ section, items }) => (
          <li key={section}>
            <div
              style={{
                fontSize: 10.5,
                color: isCollapsed ? 'transparent' : 'rgba(255,255,255,.32)',
                letterSpacing: '.22em',
                textTransform: 'uppercase',
                padding: '14px 12px 8px',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
              }}
            >
              {section}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map((item) => {
                const active = isActive(item.href, pathname, item.exact ?? false)
                const navStyle: React.CSSProperties = {
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  color: active ? '#fff' : 'rgba(255,255,255,.78)',
                  textDecoration: 'none',
                  fontSize: 14.5,
                  whiteSpace: 'nowrap',
                  marginBottom: 2,
                  background: active ? 'rgba(255,255,255,.13)' : 'transparent',
                  boxShadow: active ? 'inset 3px 0 0 var(--sakura-300)' : 'none',
                  opacity: item.disabled ? 0.35 : 1,
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }

                const content = (
                  <>
                    <span
                      style={{
                        flexShrink: 0,
                        width: 20,
                        height: 20,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {item.icon}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        opacity: isCollapsed ? 0 : 1,
                        transition: 'opacity 0.2s',
                        pointerEvents: isCollapsed ? 'none' : 'auto',
                      }}
                    >
                      {item.label}
                    </span>
                    {item.tag && !isCollapsed && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(255,255,255,.08)',
                          color: 'rgba(255,255,255,.5)',
                          fontWeight: 500,
                        }}
                      >
                        {item.tag}
                      </span>
                    )}
                  </>
                )

                if (item.disabled) {
                  return (
                    <li key={item.href}>
                      <span style={navStyle}>{content}</span>
                    </li>
                  )
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      style={navStyle}
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
      <div
        style={{
          padding: '12px 10px',
          borderTop: '1px solid rgba(255,255,255,.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--sakura-300), var(--sakura-base))',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: 'var(--font-zen-maru-gothic)',
              boxShadow: '0 2px 6px rgba(0,0,0,.2)',
              overflow: 'hidden',
            }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={36}
                height={36}
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span data-testid='avatar-fallback'>{firstChar}</span>
            )}
          </div>
          <div
            style={{
              lineHeight: 1.3,
              overflow: 'hidden',
              opacity: isCollapsed ? 0 : 1,
              transition: 'opacity 0.2s',
              pointerEvents: isCollapsed ? 'none' : 'auto',
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', whiteSpace: 'nowrap' }}>
              商家管理員
            </div>
          </div>
        </div>

        <form action={logout} style={{ flexShrink: 0 }}>
          <button
            type='submit'
            aria-label='登出'
            title='登出'
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: 'rgba(255,255,255,.08)',
              color: 'rgba(255,255,255,.7)',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
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
          style={{
            flexShrink: 0,
            width: 30,
            height: 30,
            borderRadius: 8,
            border: 'none',
            background: 'rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.7)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <svg
            viewBox='0 0 24 24'
            width='16'
            height='16'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            style={{
              transform: isCollapsed ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.3s',
            }}
            aria-hidden='true'
          >
            <polyline points='15 18 9 12 15 6' />
          </svg>
        </button>
      </div>
    </aside>
  )
}

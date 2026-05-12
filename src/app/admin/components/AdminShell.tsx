'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const PAGE_TITLES: Record<string, string> = {
  '/admin': '總覽',
  '/admin/store': '賣場設定',
  '/admin/suppliers': '供應商管理',
  '/admin/customers': '顧客管理',
  '/admin/products': '商品管理',
  '/admin/orders': '訂單管理',
}

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return title
    }
  }
  return '後台'
}

interface AdminShellProps {
  displayName: string
  avatarUrl: string | null
  children: React.ReactNode
}

export default function AdminShell({ displayName, avatarUrl, children }: AdminShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        displayName={displayName}
        avatarUrl={avatarUrl}
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onToggle={() => setIsCollapsed((c) => !c)}
      />

      {/* Mobile backdrop */}
      <div
        data-testid='sidebar-backdrop'
        onClick={() => setIsMobileOpen(false)}
        style={{
          display: isMobileOpen ? 'block' : 'none',
          position: 'fixed',
          inset: 0,
          background: 'rgba(28,54,16,.4)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          zIndex: 40,
        }}
      />

      {/* Main content */}
      <div
        style={{
          flex: 1,
          marginLeft: isCollapsed ? 64 : 220,
          transition: 'margin-left 0.3s var(--ease-smooth)',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
        className='admin-main'
      >
        {/* Topbar */}
        <header
          style={{
            height: 60,
            background: 'rgba(255,255,255,.88)',
            backdropFilter: 'saturate(140%) blur(8px)',
            WebkitBackdropFilter: 'saturate(140%) blur(8px)',
            borderBottom: '1px solid var(--neutral-200)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            flexShrink: 0,
          }}
        >
          <button
            aria-label='開啟選單'
            onClick={() => setIsMobileOpen(true)}
            style={{
              display: 'none',
              background: 'none',
              border: '1px solid var(--neutral-200)',
              borderRadius: 8,
              width: 36,
              height: 36,
              placeItems: 'center',
              cursor: 'pointer',
              color: 'var(--forest-deep)',
            }}
            className='admin-hamburger'
          >
            <svg
              viewBox='0 0 24 24'
              width='18'
              height='18'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
            >
              <line x1='3' y1='6' x2='21' y2='6' />
              <line x1='3' y1='12' x2='21' y2='12' />
              <line x1='3' y1='18' x2='21' y2='18' />
            </svg>
          </button>

          <div
            style={{
              fontSize: 13,
              color: 'var(--neutral-500)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>後台</span>
            <svg
              viewBox='0 0 24 24'
              width='13'
              height='13'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
            >
              <polyline points='9 18 15 12 9 6' />
            </svg>
            <strong style={{ color: 'var(--neutral-800)', fontWeight: 500 }}>{pageTitle}</strong>
          </div>

          <div style={{ flex: 1 }} />
        </header>

        {/* Page content */}
        <main
          style={{
            flex: 1,
            padding: '28px 32px 56px',
            maxWidth: 1400,
            width: '100%',
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .admin-sidebar {
            transform: translateX(-100%) !important;
            width: 220px !important;
          }
          .admin-sidebar[data-mobile-open="true"] {
            transform: translateX(0) !important;
          }
          .admin-main {
            margin-left: 0 !important;
          }
          .admin-hamburger {
            display: grid !important;
          }
        }
      `}</style>
    </div>
  )
}

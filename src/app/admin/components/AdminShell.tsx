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
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  return (
    <div data-variant='forest' className='flex min-h-screen bg-app text-fg'>
      <Sidebar
        displayName={displayName}
        avatarUrl={avatarUrl}
        isMobileOpen={isMobileOpen}
        onNavClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile backdrop */}
      <div
        data-testid='sidebar-backdrop'
        onClick={() => setIsMobileOpen(false)}
        className={`fixed inset-0 bg-[rgba(28,54,16,0.4)] backdrop-blur-[3px] z-40 ${isMobileOpen ? 'block' : 'hidden'}`}
      />

      {/* Main content */}
      <div className='flex-1 min-w-0 flex flex-col min-h-screen ml-[220px] max-md:ml-0'>
        {/* Topbar */}
        <header className='h-[60px] bg-surface/[.88] backdrop-saturate-[140%] backdrop-blur-[8px] border-b border-line flex items-center gap-3.5 px-6 sticky top-0 z-30 shrink-0'>
          <button
            aria-label='開啟選單'
            onClick={() => setIsMobileOpen(true)}
            className='hidden max-md:grid bg-transparent border border-line rounded-lg w-9 h-9 place-items-center cursor-pointer text-forest-700'
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

          <div className='text-[13px] text-fg-muted flex items-center gap-1.5'>
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
            <strong className='text-fg font-medium'>{pageTitle}</strong>
          </div>

          <div className='flex-1' />
        </header>

        {/* Page content */}
        <main className='flex-1 px-8 pt-7 pb-14 max-w-[1400px] w-full'>{children}</main>
      </div>
    </div>
  )
}

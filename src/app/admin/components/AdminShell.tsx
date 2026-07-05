'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const PAGE_TITLES: Record<string, string> = {
  '/admin': '總覽',
  '/admin/store': '賣場設定',
  '/admin/suppliers': '供應商管理',
  '/admin/customers': '顧客管理',
  '/admin/announcements': '公告管理',
  '/admin/products': '商品管理',
  '/admin/orders': '訂單管理',
}

// 這些頁面有自己的完整頁首，隱藏 desktop topbar 避免重複
const CUSTOM_HEADER_PATHS = new Set([
  '/admin/store',
  '/admin/suppliers',
  '/admin/products',
  '/admin/products/new',
  '/admin/orders',
  '/admin/orders/new',
  '/admin/customers',
  '/admin/announcements',
])

function getPageTitle(pathname: string): string {
  // 長路徑優先，避免 /admin 搶先匹配 /admin/orders 等子路徑
  const sorted = Object.entries(PAGE_TITLES).sort((a, b) => b[0].length - a[0].length)
  for (const [path, title] of sorted) {
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
  const hasCustomHeader =
    CUSTOM_HEADER_PATHS.has(pathname) ||
    pathname.startsWith('/admin/products/') ||
    pathname.startsWith('/admin/orders/')

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
        {/* Topbar — custom-header 頁面在 desktop 隱藏，避免與頁面自己的 topbar 重複 */}
        <header
          className={`h-[60px] bg-surface/[.88] backdrop-saturate-[140%] backdrop-blur-[8px] border-b border-line flex items-center gap-3.5 px-6 sticky top-0 z-30 shrink-0 ${hasCustomHeader ? 'md:hidden' : ''}`}
        >
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

          <div className='text-[18px] text-fg-muted flex items-center gap-2'>
            <span className='text-[15px]'>後台</span>
            <svg
              viewBox='0 0 24 24'
              width='14'
              height='14'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
            >
              <polyline points='9 18 15 12 9 6' />
            </svg>
            <strong className='text-fg font-semibold'>{pageTitle}</strong>
          </div>

          <div className='flex-1' />
        </header>

        {/* Page content */}
        <main
          className={`flex-1 w-full ${hasCustomHeader ? '' : 'max-w-[1400px] px-8 pt-7 pb-14'}`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

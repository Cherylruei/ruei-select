'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { logoutLiff } from '@/lib/line/liff'

interface StoreUserMenuProps {
  slug: string
  memberName: string | null
}

export default function StoreUserMenu({ slug, memberName }: StoreUserMenuProps) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initial = memberName ? memberName.slice(0, 1) : '我'

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleLogout = async () => {
    setLoggingOut(true)
    await logoutLiff(`/store/${slug}/login`)
  }

  return (
    <div className='relative' ref={ref}>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex items-center gap-2 pl-1 pr-3 h-10 rounded-full bg-surface transition-colors hover:bg-sunken'
        style={{ border: '1px solid #f0d9cb' }}
        aria-haspopup='menu'
        aria-expanded={open}
        aria-label='帳戶選單'
      >
        <div className='w-7 h-7 rounded-full bg-primary text-white font-display font-bold text-xs flex items-center justify-center shrink-0'>
          {initial}
        </div>
        <div className='leading-tight text-left'>
          <div className='font-display font-semibold text-xs text-fg'>{memberName ?? '會員'}</div>
          <div className='font-mono text-[9px] text-fg-subtle'>已驗證</div>
        </div>
        <svg
          width='14'
          height='14'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2.2'
          strokeLinecap='round'
          className={`text-fg-subtle transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden='true'
        >
          <path d='M6 9l6 6 6-6' />
        </svg>
      </button>

      {open && (
        <div
          role='menu'
          className='absolute right-0 mt-2 w-48 rounded-xl bg-surface shadow-lg overflow-hidden z-40'
          style={{ border: '1px solid #f0d9cb' }}
        >
          <Link
            href={`/store/${slug}/account`}
            role='menuitem'
            onClick={() => setOpen(false)}
            className='flex items-center gap-2.5 px-4 py-3 text-sm text-fg hover:bg-sunken transition-colors'
          >
            <svg
              width='17'
              height='17'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              className='text-fg-muted'
              aria-hidden='true'
            >
              <circle cx='12' cy='8' r='4' />
              <path d='M4 20c0-4 4-6 8-6s8 2 8 6' />
            </svg>
            查看個人檔案
          </Link>
          <div className='h-px bg-line' />
          <button
            type='button'
            role='menuitem'
            onClick={handleLogout}
            disabled={loggingOut}
            className='w-full flex items-center gap-2.5 px-4 py-3 text-sm text-primary-hv hover:bg-primary-bg transition-colors disabled:opacity-60'
          >
            <svg
              width='17'
              height='17'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.8'
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'
            >
              <path d='M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4' />
              <path d='M16 17l5-5-5-5M21 12H9' />
            </svg>
            {loggingOut ? '登出中…' : '登出'}
          </button>
        </div>
      )}
    </div>
  )
}

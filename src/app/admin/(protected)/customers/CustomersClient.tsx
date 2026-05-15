'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

type Tab = 'pending' | 'approved'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: '待審核' },
  { key: 'approved', label: '會員名單' },
]

interface CustomersClientProps {
  initialTab: Tab
}

export default function CustomersClient({ initialTab }: CustomersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab | null) ?? initialTab

  const switchTab = useCallback(
    (tab: Tab) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div>
      {/* Tab 列 */}
      <div className='flex gap-1 border-b border-[var(--neutral-200)] mb-6'>
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={[
                'px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors cursor-pointer',
                isActive
                  ? 'text-[var(--forest-deep)] border-b-2 border-[var(--forest-base)] -mb-px bg-white'
                  : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)] hover:bg-[var(--neutral-100)]',
              ].join(' ')}
              aria-selected={isActive}
              role='tab'
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab 內容 */}
      {activeTab === 'pending' ? <PendingEmptyState /> : <ApprovedEmptyState />}
    </div>
  )
}

function PendingEmptyState() {
  return (
    <div className='bg-white border border-[var(--neutral-200)] rounded-xl px-6 py-14 flex flex-col items-center text-center'>
      <div className='w-16 h-16 rounded-full bg-[var(--neutral-100)] flex items-center justify-center mb-4 text-[var(--neutral-400)]'>
        <svg
          viewBox='0 0 24 24'
          width='28'
          height='28'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
        >
          <circle cx='12' cy='8' r='4' />
          <path d='M4 20c0-4 3.6-7 8-7' />
          <circle cx='18' cy='18' r='3' />
          <path d='M18 15v3l1.5 1.5' />
        </svg>
      </div>
      <p className='text-sm font-medium text-[var(--neutral-700)] mb-1'>目前沒有待審核申請</p>
      <p className='text-xs text-[var(--neutral-400)]'>
        分享邀請連結後，顧客申請加入將會顯示在這裡
      </p>
    </div>
  )
}

function ApprovedEmptyState() {
  return (
    <div className='bg-white border border-[var(--neutral-200)] rounded-xl px-6 py-14 flex flex-col items-center text-center'>
      <div className='w-16 h-16 rounded-full bg-[var(--neutral-100)] flex items-center justify-center mb-4 text-[var(--neutral-400)]'>
        <svg
          viewBox='0 0 24 24'
          width='28'
          height='28'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
        >
          <circle cx='9' cy='8' r='3.5' />
          <path d='M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6' />
          <circle cx='17' cy='9' r='2.5' />
          <path d='M15 14c2.5 0 6 1.5 6 5' />
        </svg>
      </div>
      <p className='text-sm font-medium text-[var(--neutral-700)] mb-1'>尚未有會員</p>
      <p className='text-xs text-[var(--neutral-400)]'>分享邀請連結讓顧客申請加入</p>
    </div>
  )
}

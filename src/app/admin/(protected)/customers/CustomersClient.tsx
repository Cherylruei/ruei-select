'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import type { StoreMemberWithProduct } from '@/types'

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

  const [members, setMembers] = useState<StoreMemberWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchMembers = useCallback(async (tab: Tab) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers?status=${tab}`)
      const json = await res.json()
      if (json.success) setMembers(json.data)
    } catch {
      setToast({ message: '載入資料失敗，請重新整理', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMembers(activeTab)
  }, [activeTab, fetchMembers])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const switchTab = useCallback(
    (tab: Tab) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleReview = useCallback(async (memberId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/customers/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setToast({ message: action === 'approve' ? '已通過申請' : '已拒絕申請', type: 'success' })
        setMembers((prev) => prev.filter((m) => m.id !== memberId))
      } else {
        const json = await res.json()
        setToast({ message: json.error ?? '操作失敗', type: 'error' })
      }
    } catch {
      setToast({ message: '操作失敗，請重試', type: 'error' })
    }
  }, [])

  return (
    <div className='relative'>
      {/* Toast */}
      {toast && (
        <div
          className={[
            'fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg transition-all',
            toast.type === 'success'
              ? 'bg-[var(--forest-base)] text-white'
              : 'bg-[var(--color-error)] text-white',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}

      {/* Tab 列 */}
      <div className='flex gap-1 bg-[var(--neutral-100)] rounded-xl p-1 mb-6 w-fit'>
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={[
                'px-5 py-2 rounded-[9px] text-sm font-medium transition-all cursor-pointer flex items-center gap-2',
                isActive
                  ? 'bg-white text-[var(--neutral-800)] shadow-sm'
                  : 'text-[var(--neutral-500)] hover:text-[var(--neutral-700)]',
              ].join(' ')}
              aria-selected={isActive}
              role='tab'
            >
              {label}
              {!loading && (
                <span
                  className={[
                    'text-xs font-bold px-1.5 py-px rounded-full',
                    isActive
                      ? 'bg-[var(--sakura-base)] text-white'
                      : 'bg-[var(--neutral-200)] text-[var(--neutral-500)]',
                  ].join(' ')}
                >
                  {activeTab === key ? members.length : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab 內容 */}
      {loading ? (
        <LoadingSkeleton />
      ) : activeTab === 'pending' ? (
        <PendingList members={members} onReview={handleReview} />
      ) : (
        <ApprovedList members={members} />
      )}
    </div>
  )
}

// ── 待審核列表 ────────────────────────────────────────────────────────────────

function PendingList({
  members,
  onReview,
}: {
  members: StoreMemberWithProduct[]
  onReview: (id: string, action: 'approve' | 'reject') => Promise<void>
}) {
  if (members.length === 0) return <PendingEmptyState />

  return (
    <div className='flex flex-col gap-3'>
      {members.map((m) => (
        <MemberCard key={m.id} member={m} onReview={onReview} />
      ))}
    </div>
  )
}

function MemberCard({
  member,
  onReview,
}: {
  member: StoreMemberWithProduct
  onReview: (id: string, action: 'approve' | 'reject') => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null)

  const handle = (action: 'approve' | 'reject') => {
    setActionLoading(action)
    startTransition(async () => {
      await onReview(member.id, action)
      setActionLoading(null)
    })
  }

  const initials = member.name.charAt(0)
  const appliedAt = new Date(member.applied_at).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <div className='bg-white rounded-xl border border-[var(--neutral-200)] p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow'>
      {/* 頭像 */}
      <div className='flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-[var(--forest-200)] to-[var(--forest-400)] flex items-center justify-center text-white font-bold text-base [font-family:var(--font-zen-maru-gothic)]'>
        {initials}
      </div>

      {/* 資訊 */}
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 flex-wrap'>
          <span className='text-sm font-bold text-[var(--neutral-800)]'>{member.name}</span>
          <SourceBadge source={member.source} />
        </div>

        {member.source === 'public_page' && member.referring_product_name && (
          <div className='mt-1 inline-flex items-center gap-1 text-xs text-[var(--sakura-deep)] bg-[var(--sakura-pale)] rounded px-2 py-0.5'>
            <svg
              viewBox='0 0 24 24'
              width='11'
              height='11'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <rect x='3' y='3' width='18' height='18' rx='2' />
              <path d='M3 9h18M9 21V9' />
            </svg>
            觸發商品：{member.referring_product_name}
          </div>
        )}

        <div className='flex gap-4 mt-1.5 flex-wrap'>
          <MetaItem icon='phone'>{member.phone ?? '未填寫'}</MetaItem>
          <MetaItem icon='line'>LINE ID: {member.line_id}</MetaItem>
          <MetaItem icon='clock'>{appliedAt}</MetaItem>
        </div>

        {member.note && (
          <p className='text-xs text-[var(--neutral-500)] mt-1 italic leading-relaxed line-clamp-2'>
            {member.note}
          </p>
        )}
      </div>

      {/* 審核按鈕 */}
      <div className='flex gap-2 flex-shrink-0'>
        <button
          onClick={() => handle('approve')}
          disabled={isPending}
          className='px-4 py-2 rounded-xl bg-[var(--forest-base)] text-white text-sm font-semibold hover:bg-[var(--forest-deep)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5'
        >
          {actionLoading === 'approve' ? <Spinner /> : null}
          通過
        </button>
        <button
          onClick={() => handle('reject')}
          disabled={isPending}
          className='px-4 py-2 rounded-xl bg-white text-[var(--neutral-600)] border border-[var(--neutral-200)] text-sm font-semibold hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center gap-1.5'
        >
          {actionLoading === 'reject' ? <Spinner /> : null}
          拒絕
        </button>
      </div>
    </div>
  )
}

// ── 會員名單 ──────────────────────────────────────────────────────────────────

function ApprovedList({ members }: { members: StoreMemberWithProduct[] }) {
  if (members.length === 0) return <ApprovedEmptyState />

  return (
    <div className='bg-white rounded-xl border border-[var(--neutral-200)] overflow-hidden shadow-sm'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-[var(--neutral-200)] bg-[var(--neutral-50)]'>
            <th className='text-left px-5 py-3 text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide'>
              姓名
            </th>
            <th className='text-left px-5 py-3 text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide'>
              手機
            </th>
            <th className='text-left px-5 py-3 text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide'>
              LINE ID
            </th>
            <th className='text-left px-5 py-3 text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wide'>
              加入時間
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr
              key={m.id}
              className='border-b border-[var(--neutral-100)] last:border-0 hover:bg-[var(--neutral-50)] transition-colors'
            >
              <td className='px-5 py-3 font-medium text-[var(--neutral-800)]'>{m.name}</td>
              <td className='px-5 py-3 text-[var(--neutral-600)]'>
                {m.phone ?? <span className='text-[var(--neutral-400)] italic'>未填寫</span>}
              </td>
              <td className='px-5 py-3 text-[var(--neutral-600)]'>{m.line_id}</td>
              <td className='px-5 py-3 text-[var(--neutral-400)]'>
                {m.reviewed_at ? new Date(m.reviewed_at).toLocaleDateString('zh-TW') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── 空狀態 ────────────────────────────────────────────────────────────────────

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

// ── 小元件 ────────────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  if (source === 'public_page') {
    return (
      <span className='inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--sakura-100,#ffd8e8)] text-[var(--sakura-deep,#c42858)] border border-[var(--sakura-mid,#f5a8bf)]'>
        <svg
          viewBox='0 0 24 24'
          width='11'
          height='11'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
        >
          <circle cx='12' cy='12' r='10' />
          <path d='M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20' />
        </svg>
        公開申請
      </span>
    )
  }
  return (
    <span className='inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--forest-50)] text-[var(--forest-deep)] border border-[var(--forest-200)]'>
      <svg
        viewBox='0 0 24 24'
        width='11'
        height='11'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
      >
        <path d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' />
        <path d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' />
      </svg>
      邀請連結
    </span>
  )
}

function MetaItem({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className='flex items-center gap-1 text-xs text-[var(--neutral-600)]'>
      {icon === 'phone' && (
        <svg
          viewBox='0 0 24 24'
          width='12'
          height='12'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
        >
          <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.59 1.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.03a16 16 0 0 0 6.05 6.06l.88-.88a2 2 0 0 1 2.1-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.75 2.02z' />
        </svg>
      )}
      {icon === 'line' && (
        <svg
          viewBox='0 0 24 24'
          width='12'
          height='12'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
        >
          <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
        </svg>
      )}
      {icon === 'clock' && (
        <svg
          viewBox='0 0 24 24'
          width='12'
          height='12'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
        >
          <circle cx='12' cy='12' r='10' />
          <path d='M12 6v6l4 2' />
        </svg>
      )}
      {children}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className='flex flex-col gap-3'>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className='bg-white rounded-xl border border-[var(--neutral-200)] p-4 flex items-center gap-4 animate-pulse'
        >
          <div className='w-11 h-11 rounded-full bg-[var(--neutral-200)]' />
          <div className='flex-1 space-y-2'>
            <div className='h-4 bg-[var(--neutral-200)] rounded w-1/4' />
            <div className='h-3 bg-[var(--neutral-100)] rounded w-1/2' />
          </div>
          <div className='flex gap-2'>
            <div className='h-9 w-16 bg-[var(--neutral-200)] rounded-xl' />
            <div className='h-9 w-16 bg-[var(--neutral-100)] rounded-xl' />
          </div>
        </div>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className='animate-spin'
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    >
      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
    </svg>
  )
}

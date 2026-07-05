'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ToastContainer, useToast } from '@/components/ui/Toast'
import type { StoreMemberWithProduct } from '@/types'

type Tab = 'pending' | 'approved' | 'rejected'

const REJECT_REASONS = ['疑似廣告帳號', '重複申請', '非熟客 / 不認識', '資料不完整']

const AVATAR_COLORS = [
  'var(--forest-400)',
  'var(--sakura-400)',
  'var(--earth-400)',
  'var(--c-info)',
  'var(--c-secondary)',
  'var(--sakura-500)',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

interface CustomersClientProps {
  initialTab: Tab
}

export default function CustomersClient({ initialTab }: CustomersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = (searchParams.get('tab') as Tab | null) ?? initialTab

  const [allMembers, setAllMembers] = useState<StoreMemberWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { toasts, toast, dismiss } = useToast()

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedReasonChip, setSelectedReasonChip] = useState<string | null>(null)
  const [rejectLoading, setRejectLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/customers')
      const json = await res.json()
      if (json.success) setAllMembers(json.data)
    } catch {
      toast('載入資料失敗，請重新整理', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll()
  }, [fetchAll])

  const counts = useMemo(
    () => ({
      pending: allMembers.filter((m) => m.status === 'pending').length,
      approved: allMembers.filter((m) => m.status === 'approved').length,
      rejected: allMembers.filter((m) => m.status === 'rejected').length,
    }),
    [allMembers]
  )

  const thisMonthNew = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return allMembers.filter((m) => new Date(m.applied_at) >= start).length
  }, [allMembers])

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allMembers
      .filter((m) => m.status === activeTab)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.line_id.toLowerCase().includes(q))
  }, [allMembers, activeTab, search])

  const switchTab = useCallback(
    (tab: Tab) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/customers/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        })
        if (res.ok) {
          const member = allMembers.find((m) => m.id === id)
          setAllMembers((prev) =>
            prev.map((m) =>
              m.id === id ? { ...m, status: 'approved', reviewed_at: new Date().toISOString() } : m
            )
          )
          toast(`已通過 ${member?.name ?? ''} 的申請 · 已可逛賣場`, 'success')
        } else {
          const json = await res.json()
          toast(json.error ?? '操作失敗', 'error')
        }
      } catch {
        toast('操作失敗，請重試', 'error')
      }
    },
    [allMembers, toast]
  )

  const handleApproveAll = useCallback(async () => {
    const pending = allMembers.filter((m) => m.status === 'pending')
    if (!pending.length) return
    const results = await Promise.allSettled(
      pending.map((m) =>
        fetch(`/api/customers/${m.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        })
      )
    )
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    if (succeeded > 0) {
      setAllMembers((prev) =>
        prev.map((m) =>
          m.status === 'pending'
            ? { ...m, status: 'approved', reviewed_at: new Date().toISOString() }
            : m
        )
      )
      toast(`已一次通過 ${succeeded} 位顧客 ✿`, 'success')
    }
  }, [allMembers, toast])

  const openRejectModal = useCallback((id: string, name: string) => {
    setRejectModal({ id, name })
    setRejectReason('')
    setSelectedReasonChip(null)
  }, [])

  const handleReject = useCallback(async () => {
    if (!rejectModal) return
    setRejectLoading(true)
    try {
      const res = await fetch(`/api/customers/${rejectModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectReason.trim() || null,
        }),
      })
      if (res.ok) {
        setAllMembers((prev) =>
          prev.map((m) =>
            m.id === rejectModal.id
              ? {
                  ...m,
                  status: 'rejected',
                  rejection_reason: rejectReason.trim() || null,
                  reviewed_at: new Date().toISOString(),
                }
              : m
          )
        )
        toast(`已拒絕 ${rejectModal.name} 的申請`, 'info')
        setRejectModal(null)
      } else {
        const json = await res.json()
        toast(json.error ?? '操作失敗', 'error')
      }
    } catch {
      toast('操作失敗，請重試', 'error')
    } finally {
      setRejectLoading(false)
    }
  }, [rejectModal, rejectReason, toast])

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/customers/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restore' }),
        })
        if (res.ok) {
          const member = allMembers.find((m) => m.id === id)
          setAllMembers((prev) =>
            prev.map((m) =>
              m.id === id
                ? {
                    ...m,
                    status: 'approved',
                    rejection_reason: null,
                    reviewed_at: new Date().toISOString(),
                  }
                : m
            )
          )
          toast(`已改為通過 · ${member?.name ?? ''}`, 'success')
        } else {
          const json = await res.json()
          toast(json.error ?? '操作失敗', 'error')
        }
      } catch {
        toast('操作失敗，請重試', 'error')
      }
    },
    [allMembers, toast]
  )

  return (
    <>
      {/* ── Sticky page header ── */}
      <div className='px-8 py-5 border-b border-line bg-surface/70 backdrop-blur sticky top-0 z-20'>
        <div className='font-mono text-[11px] text-fg-subtle mb-2 flex items-center gap-1.5'>
          <span>後台</span>
          <span>›</span>
          <span className='text-fg'>顧客管理</span>
        </div>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h1 className='font-display font-bold text-2xl text-fg'>顧客管理</h1>
            <p className='text-sm text-fg-muted mt-0.5'>
              <b className='text-warning'>{counts.pending}</b> 筆申請待審核 · 賣場目前{' '}
              <b className='text-fg'>{counts.approved}</b> 位顧客
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <div className='relative'>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-64 h-10 pl-10 pr-4 rounded-pill border-[1.5px] border-line bg-surface outline-none focus:border-primary focus:shadow-[0_0_0_4px_var(--c-primary-bg)] transition text-sm'
                placeholder='搜尋顧客姓名、LINE ID…'
              />
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                className='absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none'
              >
                <circle cx='11' cy='11' r='6' />
                <path d='M20 20l-4-4' strokeLinecap='round' />
              </svg>
            </div>
            <button className='inline-flex items-center gap-2 h-10 rounded-pill border border-line bg-surface text-fg px-4 font-display font-semibold text-sm hover:bg-sunken transition cursor-pointer'>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.9'
                strokeLinecap='round'
              >
                <path d='M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1' />
                <path d='M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1' />
              </svg>
              邀請連結
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className='p-8 space-y-6 max-w-[1080px]'>
        {/* Stats strip */}
        {!loading && (
          <section className='grid grid-cols-4 gap-4'>
            <div
              className='bg-surface rounded-xl p-4'
              style={{ border: '1.5px solid var(--c-warning)', boxShadow: 'var(--shadow-xs)' }}
            >
              <div className='flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-pill bg-warning' />
                <span className='font-mono text-[10px] text-fg-muted uppercase tracking-wider'>
                  待審核
                </span>
              </div>
              <div className='font-display font-bold text-3xl mt-1.5 text-warning'>
                {counts.pending}
              </div>
              <div className='text-[11px] text-fg-subtle mt-1'>待商家審核</div>
            </div>

            <div className='bg-surface border border-line rounded-xl p-4'>
              <div className='flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-pill bg-success' />
                <span className='font-mono text-[10px] text-fg-muted uppercase tracking-wider'>
                  已通過
                </span>
              </div>
              <div className='font-display font-bold text-3xl mt-1.5'>{counts.approved}</div>
              <div className='text-[11px] text-fg-subtle mt-1'>賣場會員人數</div>
            </div>

            <div className='bg-surface border border-line rounded-xl p-4'>
              <div className='flex items-center gap-1.5'>
                <span className='w-2 h-2 rounded-pill' style={{ background: 'var(--ink-400)' }} />
                <span className='font-mono text-[10px] text-fg-muted uppercase tracking-wider'>
                  已拒絕
                </span>
              </div>
              <div className='font-display font-bold text-3xl mt-1.5 text-fg-subtle'>
                {counts.rejected}
              </div>
              <div className='text-[11px] text-fg-subtle mt-1'>多為廣告 / 重複帳號</div>
            </div>

            <div
              className='rounded-xl p-4 text-white relative overflow-hidden'
              style={{
                background: 'linear-gradient(135deg, var(--forest-400), var(--forest-600))',
              }}
            >
              <div className='font-mono text-[10px] uppercase tracking-wider text-white/85'>
                本月新申請
              </div>
              <div className='font-display font-bold text-3xl mt-1.5 leading-none'>
                {thisMonthNew}
              </div>
              <div className='text-[11px] text-white/85 mt-1.5'>累計申請加入</div>
            </div>
          </section>
        )}

        {/* Tab filter */}
        <section className='flex items-center gap-2'>
          <TabBtn
            label='待審核'
            count={counts.pending}
            active={activeTab === 'pending'}
            onClick={() => switchTab('pending')}
            countStyle='warning'
          />
          <TabBtn
            label='已通過'
            count={counts.approved}
            active={activeTab === 'approved'}
            onClick={() => switchTab('approved')}
          />
          <TabBtn
            label='已拒絕'
            count={counts.rejected}
            active={activeTab === 'rejected'}
            onClick={() => switchTab('rejected')}
          />
          <div className='flex-1' />
          {activeTab === 'pending' && counts.pending > 0 && (
            <button
              onClick={handleApproveAll}
              className='inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill bg-secondary-bg text-secondary font-display font-semibold text-xs hover:bg-secondary hover:text-white transition cursor-pointer'
            >
              <svg
                width='13'
                height='13'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.4'
                strokeLinecap='round'
              >
                <path d='M5 12l4 4 10-10' />
              </svg>
              全部通過
            </button>
          )}
        </section>

        {/* List */}
        {loading ? (
          <LoadingSkeleton />
        ) : activeTab === 'pending' ? (
          <PendingList
            members={filteredMembers}
            total={counts.pending}
            onApprove={handleApprove}
            onReject={openRejectModal}
          />
        ) : activeTab === 'approved' ? (
          <ApprovedList members={filteredMembers} total={counts.approved} />
        ) : (
          <RejectedList
            members={filteredMembers}
            total={counts.rejected}
            onRestore={handleRestore}
          />
        )}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <Modal
          title={`拒絕「${rejectModal.name}」的申請？`}
          onClose={() => setRejectModal(null)}
          maxWidth='md'
          footer={
            <>
              <button
                onClick={() => setRejectModal(null)}
                className='flex-1 h-11 rounded-pill border border-line text-fg font-display font-semibold text-sm hover:bg-sunken transition'
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={rejectLoading}
                className='flex-1 h-11 rounded-pill bg-danger text-white font-display font-semibold text-sm hover:opacity-90 active:scale-[.97] transition disabled:opacity-50'
              >
                {rejectLoading ? '處理中…' : '確定拒絕'}
              </button>
            </>
          }
        >
          <p className='text-sm text-fg-muted mb-4 leading-relaxed'>
            對方將無法瀏覽賣場與下單。你可日後在「已拒絕」分頁改回通過。
          </p>
          <div className='mb-2'>
            <label className='block text-sm font-semibold mb-2'>
              拒絕原因 <span className='text-fg-subtle font-normal'>（選填，僅商家可見）</span>
            </label>
            <div className='flex flex-wrap gap-1.5 mb-2.5'>
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => {
                    const isSelected = selectedReasonChip === reason
                    setSelectedReasonChip(isSelected ? null : reason)
                    setRejectReason(isSelected ? '' : reason)
                  }}
                  className='h-7 px-3 rounded-pill border font-display font-semibold text-xs transition cursor-pointer'
                  style={
                    selectedReasonChip === reason
                      ? {
                          background: 'var(--c-danger)',
                          color: '#fff',
                          borderColor: 'var(--c-danger)',
                        }
                      : {
                          background: 'var(--bg-surface)',
                          color: 'var(--fg-muted)',
                          borderColor: 'var(--border)',
                        }
                  }
                >
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value)
                setSelectedReasonChip(null)
              }}
              className='w-full rounded-md border-[1.5px] border-line bg-surface text-fg text-sm px-3 py-2.5 outline-none focus:border-primary focus:shadow-[0_0_0_4px_var(--c-primary-bg)] transition resize-y'
              style={{ minHeight: 64, fontFamily: 'inherit' }}
              placeholder='補充說明（選填）'
            />
          </div>
        </Modal>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}

// ── Tab button ──────────────────────────────────────────────────────────────

function TabBtn({
  label,
  count,
  active,
  onClick,
  countStyle,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  countStyle?: 'warning'
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill font-display font-semibold text-xs transition cursor-pointer',
        active ? 'bg-primary text-white' : 'bg-sunken text-fg-muted hover:bg-ink-200',
      ].join(' ')}
    >
      {label}
      <span
        className='font-mono'
        style={
          active ? undefined : countStyle === 'warning' ? { color: 'var(--c-warning)' } : undefined
        }
      >
        {count}
      </span>
    </button>
  )
}

// ── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initial = name.charAt(0)
  const bg = avatarColor(name)
  const fontSize = size * 0.4
  const badgeSize = size * 0.4
  const badgeIconSize = size * 0.22

  return (
    <div
      className='rounded-pill text-white font-display font-bold flex items-center justify-center shrink-0 relative'
      style={{ width: size, height: size, background: bg, fontSize }}
    >
      {initial}
      {/* LINE green badge */}
      <span
        className='absolute -bottom-0.5 -right-0.5 rounded-pill flex items-center justify-center ring-2 ring-white'
        style={{ width: badgeSize, height: badgeSize, background: '#06C755' }}
      >
        <svg
          width={badgeIconSize}
          height={badgeIconSize}
          viewBox='0 0 24 24'
          fill='#fff'
          aria-label='LINE 已連結'
        >
          <path d='M12 3C6.9 3 2.75 6.43 2.75 10.66c0 3.79 3.3 6.96 7.76 7.56.3.06.71.2.81.46.09.24.06.6.03.85l-.13.79c-.04.24-.18.92.81.5s5.34-3.14 7.29-5.38c1.34-1.47 1.99-2.97 1.99-4.78C21.31 6.43 17.13 3 12 3z' />
        </svg>
      </span>
    </div>
  )
}

// ── Pending list ────────────────────────────────────────────────────────────

function PendingList({
  members,
  total,
  onApprove,
  onReject,
}: {
  members: StoreMemberWithProduct[]
  total: number
  onApprove: (id: string) => void
  onReject: (id: string, name: string) => void
}) {
  if (total === 0) return <PendingEmptyState />
  if (members.length === 0) return <NoSearchResult />

  return (
    <div className='space-y-3'>
      {members.map((m) => (
        <PendingCard key={m.id} member={m} onApprove={onApprove} onReject={onReject} />
      ))}
    </div>
  )
}

function PendingCard({
  member,
  onApprove,
  onReject,
}: {
  member: StoreMemberWithProduct
  onApprove: (id: string) => void
  onReject: (id: string, name: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null)

  const handleApprove = () => {
    setActionLoading('approve')
    startTransition(async () => {
      await onApprove(member.id)
      setActionLoading(null)
    })
  }

  const appliedAt = formatRelativeTime(member.applied_at)

  return (
    <article className='bg-surface border border-line rounded-xl p-5 hover:shadow-md transition-shadow'>
      <div className='flex items-start gap-4'>
        <Avatar name={member.name} size={48} />
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h3 className='font-display font-bold text-md'>{member.name}</h3>
            <span
              className='inline-flex items-center h-5 px-2 rounded-pill font-display font-bold text-[10px] text-white'
              style={{ background: '#06C755' }}
            >
              LINE 已連結
            </span>
          </div>
          <div className='flex items-center gap-3 mt-1.5 flex-wrap'>
            <span className='font-mono text-xs text-fg-muted'>
              <span className='text-fg-subtle'>@</span>
              {member.line_id}
            </span>
            <PhoneChip phone={member.phone} />
          </div>
          {member.note && (
            <div className='mt-3 relative rounded-lg rounded-tl-sm bg-ink-50 border border-line px-3.5 py-2.5 text-sm text-fg leading-relaxed'>
              <span className='font-mono text-[9px] text-fg-subtle uppercase tracking-wider block mb-0.5'>
                留言
              </span>
              {member.note}
            </div>
          )}
        </div>
        <div className='text-right shrink-0'>
          <div className='font-mono text-[11px] text-fg-subtle'>{appliedAt}</div>
          <div className='inline-flex items-center gap-1 mt-1 h-5 px-2 rounded-pill bg-sunken text-fg-muted font-mono text-[10px]'>
            <svg
              width='10'
              height='10'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.9'
              strokeLinecap='round'
            >
              <path d='M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1' />
              <path d='M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1' />
            </svg>
            {member.source === 'public_page' ? '公開申請' : '邀請連結'}
          </div>
        </div>
      </div>

      <div className='mt-4 pt-4 border-t border-line flex items-center gap-2'>
        <span className='font-mono text-[10px] text-fg-subtle uppercase tracking-wider flex-1'>
          審核這位顧客的入會申請
        </span>
        <button
          onClick={() => onReject(member.id, member.name)}
          disabled={isPending}
          className='inline-flex items-center gap-1.5 h-9 px-4 rounded-pill border border-line text-fg-muted font-display font-semibold text-xs hover:bg-danger-bg hover:text-danger hover:border-danger transition disabled:opacity-50 cursor-pointer'
        >
          <svg
            width='13'
            height='13'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.2'
            strokeLinecap='round'
          >
            <path d='M6 6l12 12M6 18L18 6' />
          </svg>
          拒絕
        </button>
        <button
          onClick={handleApprove}
          disabled={isPending}
          className='inline-flex items-center gap-1.5 h-9 px-5 rounded-pill bg-secondary text-white font-display font-bold text-xs hover:bg-secondary-hv active:scale-[.97] transition disabled:opacity-50 cursor-pointer'
          style={{ boxShadow: '0 2px 8px 0 rgba(60,122,69,.25)' }}
        >
          {actionLoading === 'approve' ? (
            <Spinner />
          ) : (
            <svg
              width='14'
              height='14'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.4'
              strokeLinecap='round'
            >
              <path d='M5 12l4 4 10-10' />
            </svg>
          )}
          通過申請
        </button>
      </div>
    </article>
  )
}

// ── Approved list ───────────────────────────────────────────────────────────

function ApprovedList({ members, total }: { members: StoreMemberWithProduct[]; total: number }) {
  if (total === 0) return <ApprovedEmptyState />
  if (members.length === 0) return <NoSearchResult />

  return (
    <div className='bg-surface border border-line rounded-xl overflow-hidden'>
      {members.map((m, idx) => (
        <div key={m.id}>
          {idx > 0 && <div className='border-t border-line' />}
          <div className='flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50 transition-colors'>
            <Avatar name={m.name} size={40} />
            <div className='min-w-0' style={{ width: 200 }}>
              <div className='font-display font-bold text-sm truncate'>{m.name}</div>
              <div className='font-mono text-[11px] text-fg-subtle truncate'>@{m.line_id}</div>
            </div>
            <div className='hidden lg:block' style={{ width: 150 }}>
              <PhoneChip phone={m.phone} />
            </div>
            <div className='flex-1' />
            <div className='font-mono text-[11px] text-fg-subtle hidden xl:block'>
              加入 {formatRelativeTime(m.reviewed_at ?? m.applied_at)}
            </div>
            <span className='inline-flex items-center gap-1 h-6 px-2.5 rounded-pill font-display font-bold text-[10px] text-success bg-success-bg'>
              <svg
                width='10'
                height='10'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='3'
                strokeLinecap='round'
              >
                <path d='M5 12l4 4 10-10' />
              </svg>
              已通過
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Rejected list ───────────────────────────────────────────────────────────

function RejectedList({
  members,
  total,
  onRestore,
}: {
  members: StoreMemberWithProduct[]
  total: number
  onRestore: (id: string) => void
}) {
  if (total === 0) return <RejectedEmptyState />
  if (members.length === 0) return <NoSearchResult />

  return (
    <div className='bg-surface border border-line rounded-xl overflow-hidden'>
      {members.map((m, idx) => (
        <div key={m.id}>
          {idx > 0 && <div className='border-t border-line' />}
          <div className='flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50 transition-colors'>
            <div
              className='rounded-pill text-white font-display font-bold flex items-center justify-center shrink-0 opacity-70'
              style={{
                width: 40,
                height: 40,
                background: 'var(--ink-400)',
                fontSize: 16,
              }}
            >
              {m.name.charAt(0)}
            </div>
            <div className='min-w-0' style={{ width: 200 }}>
              <div className='font-display font-bold text-sm truncate text-fg-muted'>{m.name}</div>
              <div className='font-mono text-[11px] text-fg-subtle truncate'>@{m.line_id}</div>
            </div>
            <div className='flex items-center gap-1.5'>
              <span className='font-mono text-[10px] text-fg-subtle uppercase tracking-wider'>
                原因
              </span>
              <span className='inline-flex items-center h-6 px-2.5 rounded-pill bg-sunken text-fg-muted font-display font-semibold text-[11px]'>
                {m.rejection_reason ?? '—'}
              </span>
            </div>
            <div className='flex-1' />
            <div className='font-mono text-[11px] text-fg-subtle hidden xl:block'>
              拒絕於 {formatRelativeTime(m.reviewed_at ?? m.applied_at)}
            </div>
            <span className='inline-flex items-center gap-1 h-6 px-2.5 rounded-pill bg-sunken text-fg-subtle font-display font-bold text-[10px]'>
              已拒絕
            </span>
            <button
              onClick={() => onRestore(m.id)}
              className='inline-flex items-center gap-1.5 h-8 px-3 rounded-pill border border-line text-secondary font-display font-semibold text-xs hover:bg-secondary-bg transition cursor-pointer'
            >
              <svg
                width='12'
                height='12'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
              >
                <path d='M9 14l-4-4 4-4M5 10h9a5 5 0 010 10h-1' />
              </svg>
              改為通過
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty states ────────────────────────────────────────────────────────────

function PendingEmptyState() {
  return (
    <div className='bg-surface border border-dashed border-line rounded-2xl py-16 px-8 flex flex-col items-center text-center'>
      <div
        className='w-20 h-20 rounded-pill flex items-center justify-center'
        style={{ background: 'var(--c-success-bg)' }}
      >
        <svg
          width='34'
          height='34'
          viewBox='0 0 24 24'
          fill='none'
          stroke='var(--c-success)'
          strokeWidth='1.6'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <circle cx='12' cy='12' r='9' />
          <path d='M8 12l3 3 5-6' />
        </svg>
      </div>
      <h3 className='font-display font-bold text-lg mt-5'>沒有待審核的申請</h3>
      <p className='text-sm text-fg-muted mt-2 leading-relaxed max-w-sm'>
        所有入會申請都處理完囉，辛苦了 ✿
        <br />
        新申請進來時會即時出現在這裡，側欄也會跳出提醒。
      </p>
    </div>
  )
}

function ApprovedEmptyState() {
  return (
    <div className='bg-surface border border-dashed border-line rounded-2xl py-16 px-8 flex flex-col items-center text-center'>
      <div className='w-20 h-20 rounded-pill flex items-center justify-center bg-sunken'>
        <svg
          width='32'
          height='32'
          viewBox='0 0 24 24'
          fill='none'
          stroke='var(--fg-subtle)'
          strokeWidth='1.6'
          strokeLinecap='round'
        >
          <circle cx='12' cy='8' r='4' />
          <path d='M4 20c0-4 4-6 8-6s8 2 8 6' />
        </svg>
      </div>
      <h3 className='font-display font-bold text-lg mt-5'>還沒有通過的顧客</h3>
      <p className='text-sm text-fg-muted mt-2'>通過第一筆申請後，顧客就會出現在這裡。</p>
    </div>
  )
}

function RejectedEmptyState() {
  return (
    <div className='bg-surface border border-dashed border-line rounded-2xl py-16 px-8 flex flex-col items-center text-center'>
      <div className='w-20 h-20 rounded-pill flex items-center justify-center bg-sunken'>
        <svg
          width='32'
          height='32'
          viewBox='0 0 24 24'
          fill='none'
          stroke='var(--fg-subtle)'
          strokeWidth='1.6'
          strokeLinecap='round'
        >
          <circle cx='12' cy='12' r='9' />
          <path d='M15 9l-6 6M9 9l6 6' />
        </svg>
      </div>
      <h3 className='font-display font-bold text-lg mt-5'>沒有被拒絕的申請</h3>
      <p className='text-sm text-fg-muted mt-2'>被拒絕的申請會留存在這裡，方便日後改回通過。</p>
    </div>
  )
}

function NoSearchResult() {
  return (
    <div className='bg-surface border border-line rounded-xl py-12 text-center'>
      <div className='font-display font-bold text-md text-fg-muted'>找不到符合的顧客</div>
      <p className='text-sm text-fg-subtle mt-1.5'>試試其他關鍵字，或切換分頁</p>
    </div>
  )
}

// ── Micro components ────────────────────────────────────────────────────────

function PhoneChip({ phone }: { phone: string | null }) {
  return (
    <span className='inline-flex items-center gap-1 font-mono text-xs text-fg-muted'>
      <svg
        width='13'
        height='13'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.7'
        className='text-fg-subtle'
      >
        <path d='M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5V18a2 2 0 01-2 2A14 14 0 015 6a2 2 0 010-2z' />
      </svg>
      {phone ?? <span className='text-fg-subtle'>手機下單時再補</span>}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className='flex flex-col gap-3'>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className='bg-surface rounded-xl border border-line p-5 flex items-center gap-4 animate-pulse'
        >
          <div className='w-12 h-12 rounded-pill bg-ink-100' />
          <div className='flex-1 space-y-2'>
            <div className='h-4 bg-ink-100 rounded w-1/4' />
            <div className='h-3 bg-ink-50 rounded w-1/3' />
          </div>
          <div className='flex gap-2'>
            <div className='h-9 w-16 bg-ink-100 rounded-pill' />
            <div className='h-9 w-20 bg-ink-50 rounded-pill' />
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '剛剛'
  if (minutes < 60) return `${minutes} 分鐘前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 個月前`
  return `${Math.floor(months / 12)} 年前`
}

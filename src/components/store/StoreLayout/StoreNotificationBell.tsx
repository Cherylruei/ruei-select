'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { initLiff } from '@/lib/line/liff'
import type { StoreAnnouncement, AnnouncementType } from '@/types'

interface StoreNotificationBellProps {
  slug: string
}

const TYPE_META: Record<AnnouncementType, { emoji: string; label: string }> = {
  info: { emoji: '📢', label: '一般通知' },
  promo: { emoji: '🎉', label: '促銷活動' },
  warning: { emoji: '⚠️', label: '重要公告' },
}

function seenKey(slug: string) {
  return `ruei-ann-seen-${slug}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}`
}

export default function StoreNotificationBell({ slug }: StoreNotificationBellProps) {
  const [announcements, setAnnouncements] = useState<StoreAnnouncement[]>([])
  const [hasNew, setHasNew] = useState(false)
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function load() {
      try {
        let token = 'dev-mock-token'
        if (process.env.NODE_ENV !== 'development') {
          const liff = await initLiff()
          token = liff.getAccessToken() ?? ''
        }
        const res = await fetch(`/api/store-announcements?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const json = (await res.json()) as { success: boolean; data: StoreAnnouncement[] }
        if (cancelled || !json.success) return
        setAnnouncements(json.data)

        const lastSeen =
          typeof window !== 'undefined' ? window.localStorage.getItem(seenKey(slug)) : null
        const newer = json.data.some(
          (a) => !lastSeen || new Date(a.created_at) > new Date(lastSeen)
        )
        setHasNew(newer)
      } catch {
        // 靜默失敗：鈴鐺維持無紅點
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  // 點外面 / Esc 關閉
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      if (next) {
        // 開啟即標記為已讀
        try {
          window.localStorage.setItem(seenKey(slug), new Date().toISOString())
        } catch {
          // localStorage 不可用時略過
        }
        setHasNew(false)
      }
      return next
    })
  }, [slug])

  return (
    <div className='relative' ref={ref}>
      <button
        type='button'
        onClick={handleToggle}
        className='relative w-10 h-10 rounded-full bg-surface flex items-center justify-center transition-colors hover:bg-sunken'
        style={{ border: '1px solid #f0d9cb' }}
        aria-label='公告通知'
        aria-haspopup='dialog'
        aria-expanded={open}
      >
        <svg
          width='18'
          height='18'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.8'
          strokeLinecap='round'
          aria-hidden='true'
        >
          <path d='M6 16V11a6 6 0 1112 0v5l2 2H4l2-2z' />
          <path d='M10 20a2 2 0 004 0' />
        </svg>
        {hasNew && (
          <span
            className='absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-white'
            style={{ background: 'var(--c-primary)' }}
            aria-label='有新公告'
          />
        )}
      </button>

      {open && (
        <div
          role='dialog'
          aria-label='公告列表'
          className='absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl bg-surface shadow-lg overflow-hidden z-40'
          style={{ border: '1px solid #f0d9cb' }}
        >
          <div className='px-4 py-3 border-b border-line flex items-center justify-between'>
            <span className='font-display font-bold text-sm text-fg'>公告通知</span>
            {announcements.length > 0 && (
              <span className='font-mono text-[10px] text-fg-subtle'>
                {announcements.length} 則
              </span>
            )}
          </div>

          {announcements.length === 0 ? (
            <div className='px-4 py-8 text-center'>
              <p className='text-sm text-fg-muted'>目前沒有新消息</p>
            </div>
          ) : (
            <ul className='max-h-[60vh] overflow-y-auto'>
              {announcements.map((a) => {
                const meta = TYPE_META[a.type]
                const expanded = expandedId === a.id
                return (
                  <li key={a.id} className='border-b border-line last:border-0'>
                    <button
                      type='button'
                      onClick={() => setExpandedId(expanded ? null : a.id)}
                      className='w-full text-left px-4 py-3 hover:bg-sunken transition-colors'
                    >
                      <div className='flex items-center gap-2'>
                        <span aria-hidden='true'>{meta.emoji}</span>
                        <span className='flex-1 font-display font-semibold text-sm text-fg truncate'>
                          {a.title}
                        </span>
                        <span className='font-mono text-[10px] text-fg-subtle shrink-0'>
                          {formatDate(a.created_at)}
                        </span>
                      </div>
                      {expanded && (
                        <p className='text-[13px] text-fg-muted mt-2 leading-relaxed whitespace-pre-wrap'>
                          {a.content}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

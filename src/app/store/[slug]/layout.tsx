'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { initLiff } from '@/lib/line/liff'
import StoreHeader from '@/components/store/StoreLayout/StoreHeader'
import StoreBottomNav from '@/components/store/StoreLayout/StoreBottomNav'
import type { StoreAuthResult } from '@/types'

interface StoreLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

type LayoutState = 'loading' | 'approved' | 'pending' | 'rejected' | 'none' | 'error'

interface AuthState {
  layoutState: LayoutState
  store: StoreAuthResult['store'] | null
  member: StoreAuthResult['member'] | null
}

export default function StoreLayout({ children, params }: StoreLayoutProps) {
  const [slug, setSlug] = useState<string>('')
  const [auth, setAuth] = useState<AuthState>({
    layoutState: 'loading',
    store: null,
    member: null,
  })
  const initialized = useRef(false)
  const pathname = usePathname()

  // /join 是公開路由，不受 auth guard 管轄
  const isJoinPage = pathname.endsWith('/join')

  useEffect(() => {
    params.then((p) => setSlug(p.slug))
  }, [params])

  useEffect(() => {
    if (!slug || initialized.current) return
    initialized.current = true

    async function run() {
      try {
        let token: string
        if (process.env.NODE_ENV === 'development') {
          token = 'dev-mock-token'
        } else {
          const liff = await initLiff()
          if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href })
            return
          }
          token = liff.getAccessToken() ?? ''
        }

        const res = await fetch(`/api/store-auth?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.status === 404) {
          setAuth({ layoutState: 'error', store: null, member: null })
          return
        }

        if (res.status === 401) {
          setAuth({ layoutState: 'error', store: null, member: null })
          return
        }

        const data = (await res.json()) as StoreAuthResult

        setAuth({
          layoutState: data.status === 'approved' ? 'approved' : data.status,
          store: data.store,
          member: data.member ?? null,
        })
      } catch {
        setAuth({ layoutState: 'error', store: null, member: null })
      }
    }

    run()
  }, [slug])

  // join 頁直接渲染，不套 auth guard
  if (isJoinPage) {
    return <>{children}</>
  }

  if (auth.layoutState === 'loading') {
    return <StoreSkeleton />
  }

  if (auth.layoutState === 'error') {
    return <ErrorPage />
  }

  if (auth.layoutState === 'pending') {
    return <PendingPage storeName={auth.store?.name ?? ''} />
  }

  if (auth.layoutState === 'rejected' || auth.layoutState === 'none') {
    return (
      <NotMemberPage
        slug={slug}
        storeName={auth.store?.name ?? ''}
        avatarUrl={auth.store?.avatar_url ?? null}
      />
    )
  }

  // approved
  return (
    <div data-variant='candy' className='min-h-screen bg-app flex flex-col'>
      {auth.store && (
        <StoreHeader name={auth.store.name} avatarUrl={auth.store.avatar_url} slug={slug} />
      )}
      <main className='flex-1 max-w-5xl mx-auto w-full pb-20 lg:pb-8'>{children}</main>
      <StoreBottomNav slug={slug} />
    </div>
  )
}

// ── 骨架畫面 ──────────────────────────────────────────────────────────────────

function StoreSkeleton() {
  return (
    <div data-variant='candy' className='min-h-screen bg-app'>
      {/* header skeleton */}
      <div className='h-14 bg-surface border-b border-line flex items-center px-4 gap-3'>
        <div className='w-9 h-9 rounded-full bg-ink-100 animate-pulse' />
        <div className='h-4 w-32 rounded bg-ink-100 animate-pulse' />
      </div>
      {/* content skeleton */}
      <div className='max-w-5xl mx-auto px-4 pt-6 grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className='bg-surface rounded-xl overflow-hidden shadow-sm'>
            <div className='aspect-square bg-ink-100 animate-pulse' />
            <div className='p-3 flex flex-col gap-2'>
              <div className='h-3 w-full rounded bg-ink-100 animate-pulse' />
              <div className='h-3 w-2/3 rounded bg-ink-100 animate-pulse' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 審核中頁面 ────────────────────────────────────────────────────────────────

function PendingPage({ storeName }: { storeName: string }) {
  return (
    <div data-variant='candy' className='min-h-screen bg-app flex items-center justify-center px-4'>
      <div className='text-center max-w-sm'>
        <div className='w-20 h-20 rounded-full bg-gradient-to-br from-[#c4a828] to-[#9a8020] flex items-center justify-center mx-auto mb-6 shadow-md'>
          <svg
            viewBox='0 0 24 24'
            width='32'
            height='32'
            fill='none'
            stroke='white'
            strokeWidth='2'
            aria-hidden='true'
          >
            <circle cx='12' cy='12' r='10' />
            <path d='M12 6v6l4 2' />
          </svg>
        </div>
        <h1
          className='text-xl font-bold text-fg mb-3'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          申請正在審核中
        </h1>
        <p className='text-sm text-fg-muted leading-relaxed'>
          {storeName ? `「${storeName}」` : ''}商家審核通過後即可進入賣場選購。
          <br />
          請耐心等候。
        </p>
      </div>
    </div>
  )
}

// ── 未加入頁面 ────────────────────────────────────────────────────────────────

function NotMemberPage({
  slug,
  storeName,
  avatarUrl,
}: {
  slug: string
  storeName: string
  avatarUrl: string | null
}) {
  return (
    <div data-variant='candy' className='min-h-screen bg-app flex items-center justify-center px-4'>
      <div className='text-center max-w-sm'>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={storeName}
            width={80}
            height={80}
            className='w-20 h-20 rounded-full object-cover mx-auto mb-6 shadow-md ring-2 ring-line'
          />
        ) : (
          <div className='w-20 h-20 rounded-full bg-gradient-to-br from-forest-400 to-forest-500 flex items-center justify-center mx-auto mb-6 shadow-md'>
            <svg
              viewBox='0 0 24 24'
              width='32'
              height='32'
              fill='none'
              stroke='white'
              strokeWidth='2'
              aria-hidden='true'
            >
              <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
              <line x1='3' y1='6' x2='21' y2='6' />
              <path d='M16 10a4 4 0 01-8 0' />
            </svg>
          </div>
        )}
        <h1
          className='text-xl font-bold text-fg mb-3'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          您尚未加入此賣場
        </h1>
        <p className='text-sm text-fg-muted leading-relaxed mb-6'>
          {storeName ? `「${storeName}」` : '此賣場'}需要申請加入後才能瀏覽商品。
        </p>
        <Link
          href={`/store/${slug}/join`}
          className='inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hv text-white text-sm font-display font-semibold rounded-pill transition-colors shadow-pink'
        >
          前往申請加入
        </Link>
      </div>
    </div>
  )
}

// ── 錯誤頁面 ──────────────────────────────────────────────────────────────────

function ErrorPage() {
  return (
    <div data-variant='candy' className='min-h-screen bg-app flex items-center justify-center px-4'>
      <div className='text-center max-w-sm'>
        <div className='w-20 h-20 rounded-full bg-gradient-to-br from-sakura-400 to-sakura-500 flex items-center justify-center mx-auto mb-6 shadow-md'>
          <svg
            viewBox='0 0 24 24'
            width='32'
            height='32'
            fill='none'
            stroke='white'
            strokeWidth='2'
            aria-hidden='true'
          >
            <circle cx='12' cy='12' r='10' />
            <path d='M15 9l-6 6M9 9l6 6' />
          </svg>
        </div>
        <h1
          className='text-xl font-bold text-fg mb-3'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          發生錯誤
        </h1>
        <p className='text-sm text-fg-muted leading-relaxed'>無法載入賣場，請稍後再試。</p>
      </div>
    </div>
  )
}

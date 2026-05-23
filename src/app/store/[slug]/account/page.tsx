'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { initLiff } from '@/lib/line/liff'
import type { StoreAuthResult } from '@/types'

type PageState = 'loading' | 'ready' | 'error'

interface LineProfile {
  displayName: string
  pictureUrl: string | null
}

interface AccountData {
  lineProfile: LineProfile
  member: NonNullable<StoreAuthResult['member']>
  store: StoreAuthResult['store']
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

export default function AccountPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [pageState, setPageState] = useState<PageState>('loading')
  const [data, setData] = useState<AccountData | null>(null)

  useEffect(() => {
    if (!slug) return

    async function load() {
      try {
        let token: string
        let displayName: string
        let pictureUrl: string | null = null

        if (process.env.NODE_ENV === 'development') {
          token = 'dev-mock-token'
          displayName = ''
        } else {
          const liff = await initLiff()
          if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href })
            return
          }
          token = liff.getAccessToken() ?? ''
          const lineProfile = await liff.getProfile()
          displayName = lineProfile.displayName
          pictureUrl = lineProfile.pictureUrl ?? null
        }

        const res = await fetch(`/api/store-auth?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          setPageState('error')
          return
        }

        const authData = (await res.json()) as StoreAuthResult

        if (authData.status !== 'approved' || !authData.member) {
          setPageState('error')
          return
        }

        setData({
          lineProfile: {
            displayName: displayName || authData.member.name,
            pictureUrl,
          },
          member: authData.member,
          store: authData.store,
        })
        setPageState('ready')
      } catch {
        setPageState('error')
      }
    }

    load()
  }, [slug])

  if (pageState === 'loading') {
    return <AccountSkeleton />
  }

  if (pageState === 'error' || !data) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] px-4 text-center'>
        <p className='text-sm text-[var(--neutral-500)]'>帳戶資料載入失敗，請稍後再試。</p>
      </div>
    )
  }

  const { lineProfile, member, store } = data

  return (
    <div className='px-4 pt-6 pb-6 max-w-md mx-auto'>
      {/* LINE 大頭照 + 顯示名稱 */}
      <div className='flex flex-col items-center mb-8'>
        <div className='w-20 h-20 rounded-full overflow-hidden bg-[var(--neutral-100)] mb-3 relative shadow-[var(--sh-sm)] ring-2 ring-[var(--neutral-200)]'>
          {lineProfile.pictureUrl ? (
            <Image
              src={lineProfile.pictureUrl}
              alt={lineProfile.displayName}
              fill
              className='object-cover'
              sizes='80px'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--forest-400)] to-[var(--forest-base)]'>
              <svg
                viewBox='0 0 24 24'
                width='32'
                height='32'
                fill='none'
                stroke='white'
                strokeWidth='1.8'
                aria-hidden='true'
              >
                <path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' />
                <circle cx='12' cy='7' r='4' />
              </svg>
            </div>
          )}
        </div>
        <p
          className='text-[17px] font-bold text-[var(--neutral-800)]'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {lineProfile.displayName}
        </p>
        <p className='text-[12px] text-[var(--neutral-400)] mt-0.5'>{store.name}</p>
      </div>

      {/* 會員資訊卡 */}
      <div className='bg-white rounded-2xl shadow-[var(--sh-xs)] border border-[var(--neutral-100)] overflow-hidden mb-4'>
        <div className='px-4 py-3 border-b border-[var(--neutral-100)]'>
          <p className='text-[11px] font-semibold text-[var(--neutral-400)] uppercase tracking-widest'>
            會員資料
          </p>
        </div>

        <InfoRow label='姓名' value={member.name} />
        <InfoRow label='手機號碼' value={member.phone ?? '未設定'} dim={!member.phone} />
        <InfoRow label='LINE ID' value={member.line_id ?? '—'} dim={!member.line_id} />
        <InfoRow label='加入日期' value={formatDate(member.applied_at)} isLast />
      </div>

      <p className='text-[11px] text-[var(--neutral-400)] text-center leading-relaxed mb-6'>
        如需修改個人資料，請聯繫商家協助更新。
      </p>

      {/* 聯繫商家按鈕 */}
      {store.line_official_account_url && (
        <a
          href={store.line_official_account_url}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[#06C755] hover:bg-[#05b04b] text-white text-[14px] font-semibold transition-colors shadow-[var(--sh-sm)]'
        >
          <svg viewBox='0 0 24 24' width='18' height='18' fill='white' aria-hidden='true'>
            <path d='M12 2C6.48 2 2 5.92 2 10.76c0 3.06 1.71 5.77 4.36 7.44V22l3.96-2.18c.54.14 1.1.22 1.68.22 5.52 0 10-3.92 10-8.76C22 5.92 17.52 2 12 2z' />
          </svg>
          聯繫商家
        </a>
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  dim = false,
  isLast = false,
}: {
  label: string
  value: string
  dim?: boolean
  isLast?: boolean
}) {
  return (
    <div
      className={[
        'px-4 py-3 flex items-center justify-between',
        !isLast ? 'border-b border-[var(--neutral-100)]' : '',
      ].join(' ')}
    >
      <span className='text-[13px] text-[var(--neutral-500)]'>{label}</span>
      <span
        className={[
          'text-[13px] font-medium',
          dim ? 'text-[var(--neutral-400)]' : 'text-[var(--neutral-800)]',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

function AccountSkeleton() {
  return (
    <div className='px-4 pt-6 max-w-md mx-auto'>
      <div className='flex flex-col items-center mb-8'>
        <div className='w-20 h-20 rounded-full bg-[var(--neutral-100)] animate-pulse mb-3' />
        <div className='h-4 w-28 rounded bg-[var(--neutral-100)] animate-pulse' />
      </div>
      <div className='bg-white rounded-2xl shadow-[var(--sh-xs)] overflow-hidden'>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className='px-4 py-3 flex items-center justify-between border-b border-[var(--neutral-100)] last:border-0'
          >
            <div className='h-3 w-16 rounded bg-[var(--neutral-100)] animate-pulse' />
            <div className='h-3 w-24 rounded bg-[var(--neutral-100)] animate-pulse' />
          </div>
        ))}
      </div>
    </div>
  )
}

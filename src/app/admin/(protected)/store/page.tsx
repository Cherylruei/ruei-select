import Link from 'next/link'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { Store } from '@/types'
import StoreSettingsClient from './StoreSettingsClient'

export const metadata = { title: '賣場設定 — 芮選後台' }

export default async function StoreSettingsPage() {
  const rhc = await createRouteHandlerClient()
  const {
    data: { user },
  } = await rhc.auth.getUser()

  let store: Store | null = null

  if (user?.email) {
    const lineIdMatch = user.email.match(/^line_(.+)@internal\.rueiselect\.local$/)
    if (lineIdMatch) {
      const serviceClient = createServiceClient()
      const { data: userData } = (await serviceClient
        .from('users')
        .select('id')
        .eq('line_id', lineIdMatch[1])
        .single()) as { data: { id: string } | null; error: unknown }

      if (userData) {
        const { data: storeData } = (await serviceClient
          .from('stores')
          .select('*')
          .eq('owner_id', userData.id)
          .maybeSingle()) as { data: Store | null; error: unknown }
        store = storeData
      }
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ruei-select.vercel.app'

  return (
    <>
      {/* ── Sticky topbar ─────────────────────────────────────────────────── */}
      <div className='sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur-md px-8 py-5'>
        <div className='font-mono text-[11px] text-fg-subtle mb-2 flex items-center gap-1.5'>
          <Link href='/admin' className='hover:text-fg'>
            後台
          </Link>
          <span>›</span>
          <span className='text-fg'>賣場設定</span>
        </div>
        <div>
          <h1 className='font-display font-bold text-2xl'>賣場設定</h1>
          <p className='text-sm text-fg-muted mt-0.5'>
            管理賣場形象、邀請連結，掌握顧客看到的第一印象。
          </p>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className='px-8 pt-6 pb-14 space-y-5'>
        <StoreSettingsClient initialStore={store} appUrl={appUrl} />
      </div>
    </>
  )
}

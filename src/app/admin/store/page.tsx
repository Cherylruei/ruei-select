import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { Store } from '@/types'
import StoreSettingsClient from './StoreSettingsClient'

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
    <div>
      <div className='store-page-head'>
        <h1 className='store-page-title'>賣場設定</h1>
        <p className='store-page-sub'>管理賣場形象、邀請連結，掌握顧客看到的第一印象。</p>
      </div>

      <StoreSettingsClient initialStore={store} appUrl={appUrl} />

      <style>{`
        .store-page-head { margin-bottom: 22px; }
        .store-page-title {
          font-family: var(--font-zen-maru-gothic), 'Zen Maru Gothic', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: var(--neutral-800);
          letter-spacing: .04em;
          margin-bottom: 6px;
        }
        .store-page-sub {
          font-size: 13.5px;
          color: var(--neutral-500);
        }
      `}</style>
    </div>
  )
}

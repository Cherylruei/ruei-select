import { getServerStore } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import type { Supplier } from '@/types'
import SuppliersClient from './SuppliersClient'

export default async function SuppliersPage() {
  const store = await getServerStore()

  let suppliers: Supplier[] = []

  if (store) {
    const serviceClient = createServiceClient()
    const { data } = (await serviceClient
      .from('suppliers')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })) as {
      data: Supplier[] | null
      error: unknown
    }
    suppliers = data ?? []
  }

  return (
    <div>
      <div className='mb-6'>
        <h1 className='text-[26px] font-bold text-[var(--neutral-800)] tracking-wide mb-1.5 [font-family:var(--font-zen-maru-gothic)]'>
          供應商管理
        </h1>
        <p className='text-[13.5px] text-[var(--neutral-500)]'>
          新增、編輯、刪除供應商，商品上架時可快速選擇對應廠商。
        </p>
      </div>

      <SuppliersClient initialSuppliers={suppliers} />
    </div>
  )
}

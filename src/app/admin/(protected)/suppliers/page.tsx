import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { Supplier } from '@/types'
import SuppliersClient from './SuppliersClient'

export default async function SuppliersPage() {
  const rhc = await createRouteHandlerClient()
  const {
    data: { user },
  } = await rhc.auth.getUser()

  let suppliers: Supplier[] = []

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
          .select('id')
          .eq('owner_id', userData.id)
          .maybeSingle()) as { data: { id: string } | null; error: unknown }

        if (storeData) {
          const { data: suppliersData } = (await serviceClient
            .from('suppliers')
            .select('*')
            .eq('store_id', storeData.id)
            .order('created_at', { ascending: false })) as {
            data: Supplier[] | null
            error: unknown
          }
          suppliers = suppliersData ?? []
        }
      }
    }
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

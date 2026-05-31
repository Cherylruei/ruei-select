import { getServerStore } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/server'
import type { Supplier } from '@/types'
import SuppliersClient from './SuppliersClient'

interface SupplierWithCount extends Supplier {
  productCount: number
}

export default async function SuppliersPage() {
  const store = await getServerStore()

  let suppliers: SupplierWithCount[] = []

  if (store) {
    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = (await (serviceClient as any)
      .from('suppliers')
      .select('*, products(id)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })) as {
      data: (Supplier & { products: { id: string }[] })[] | null
      error: unknown
    }
    suppliers = (data ?? []).map((s) => ({
      ...s,
      productCount: (s.products ?? []).length,
    }))
  }

  const totalProducts = suppliers.reduce((sum, s) => sum + s.productCount, 0)

  return <SuppliersClient initialSuppliers={suppliers} totalProducts={totalProducts} />
}

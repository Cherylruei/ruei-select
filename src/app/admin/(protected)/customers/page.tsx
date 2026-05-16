import { Suspense } from 'react'
import CustomersClient from './CustomersClient'

interface CustomersPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams
  const initialTab = params.tab === 'approved' ? 'approved' : 'pending'

  return (
    <div>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-[var(--neutral-800)] tracking-wide mb-1.5 [font-family:var(--font-zen-maru-gothic)]'>
          顧客管理
        </h1>
        <p className='text-sm text-[var(--neutral-500)]'>審核顧客申請、管理賣場會員名單。</p>
      </div>

      <Suspense>
        <CustomersClient initialTab={initialTab} />
      </Suspense>
    </div>
  )
}

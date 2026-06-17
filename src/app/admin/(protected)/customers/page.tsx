import { Suspense } from 'react'
import CustomersClient from './CustomersClient'

type Tab = 'pending' | 'approved' | 'rejected'

interface CustomersPageProps {
  searchParams: Promise<{ tab?: string }>
}

function parseTab(raw: string | undefined): Tab {
  if (raw === 'approved' || raw === 'rejected') return raw
  return 'pending'
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams
  const initialTab = parseTab(params.tab)

  return (
    <Suspense>
      <CustomersClient initialTab={initialTab} />
    </Suspense>
  )
}

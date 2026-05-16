import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import JoinClient from './JoinClient'

interface JoinPageProps {
  params: Promise<{ slug: string }>
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { slug } = await params

  const serviceClient = createServiceClient()
  const { data: store } = (await serviceClient
    .from('stores')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()) as { data: { id: string; name: string } | null; error: unknown }

  if (!store) notFound()

  return <JoinClient slug={slug} storeName={store.name} />
}

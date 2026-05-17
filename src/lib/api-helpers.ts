import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

export async function resolveUserAndStore(
  lineId: string
): Promise<{ userId: string; storeId: string } | null> {
  const serviceClient = createServiceClient()

  const { data: dbUser } = (await serviceClient
    .from('users')
    .select('id')
    .eq('line_id', lineId)
    .single()) as { data: { id: string } | null; error: unknown }

  if (!dbUser) return null

  const { data: store } = (await serviceClient
    .from('stores')
    .select('id')
    .eq('owner_id', dbUser.id)
    .maybeSingle()) as { data: { id: string } | null; error: unknown }

  if (!store) return null

  return { userId: dbUser.id, storeId: store.id }
}

export async function getAuthContext(): Promise<
  { storeId: string; userId: string } | NextResponse
> {
  const rhc = await createRouteHandlerClient()
  const {
    data: { user },
  } = await rhc.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lineId = extractLineId(user.email)
  if (!lineId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const context = await resolveUserAndStore(lineId)
  if (!context) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  return context
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse
}

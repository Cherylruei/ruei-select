import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import type { Store } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

async function resolveUserId(lineId: string): Promise<string | null> {
  const serviceClient = createServiceClient()
  const { data } = (await serviceClient
    .from('users')
    .select('id')
    .eq('line_id', lineId)
    .single()) as { data: { id: string } | null; error: unknown }
  return data?.id ?? null
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const rhc = await createRouteHandlerClient()
    const {
      data: { user },
    } = await rhc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const lineId = extractLineId(user.email)
    if (!lineId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const userId = await resolveUserId(lineId)
    if (!userId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { id } = await context.params
    const serviceClient = createServiceClient()

    const { data: store } = (await serviceClient
      .from('stores')
      .select('id, owner_id')
      .eq('id', id)
      .single()) as { data: Pick<Store, 'id' | 'owner_id'> | null; error: unknown }

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    if (store.owner_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const newToken = randomUUID()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = (await (serviceClient.from('stores') as any)
      .update({ invite_token: newToken, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('invite_token')
      .single()) as { data: { invite_token: string } | null; error: { message: string } | null }

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

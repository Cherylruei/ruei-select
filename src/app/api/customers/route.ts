import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { StoreMember, MemberStatus } from '@/types'

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

const VALID_STATUSES: MemberStatus[] = ['pending', 'approved', 'rejected']

export async function GET(request: NextRequest) {
  try {
    const rhc = await createRouteHandlerClient()
    const {
      data: { user },
    } = await rhc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const lineId = extractLineId(user.email)
    if (!lineId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const serviceClient = createServiceClient()

    const { data: dbUser } = (await serviceClient
      .from('users')
      .select('id, role')
      .eq('line_id', lineId)
      .single()) as { data: { id: string; role: string } | null; error: unknown }

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 })
    if (dbUser.role !== 'merchant')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: store } = (await serviceClient
      .from('stores')
      .select('id')
      .eq('owner_id', dbUser.id)
      .maybeSingle()) as { data: { id: string } | null; error: unknown }

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const statusParam = request.nextUrl.searchParams.get('status')
    const status = VALID_STATUSES.includes(statusParam as MemberStatus)
      ? (statusParam as MemberStatus)
      : null

    let query = serviceClient.from('store_members').select('*').eq('store_id', store.id)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: members, error } = (await query.order('applied_at', { ascending: false })) as {
      data: StoreMember[] | null
      error: unknown
    }

    if (error) throw error

    return NextResponse.json({ success: true, data: members ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

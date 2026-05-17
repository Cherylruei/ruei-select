import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

type ReviewAction = 'approve' | 'reject'
const VALID_ACTIONS: ReviewAction[] = ['approve', 'reject']

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

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

    const body = await request.json()
    const action = body?.action as string | undefined

    if (!VALID_ACTIONS.includes(action as ReviewAction)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      )
    }

    const { data: member } = (await serviceClient
      .from('store_members')
      .select('id, store_id, status')
      .eq('id', id)
      .eq('store_id', store.id)
      .maybeSingle()) as {
      data: { id: string; store_id: string; status: string } | null
      error: unknown
    }

    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (member.status !== 'pending') {
      return NextResponse.json({ error: 'Member already reviewed' }, { status: 409 })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const membersTable = serviceClient.from('store_members') as any
    const { data: updated, error: updateError } = (await membersTable
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()) as { data: unknown; error: unknown }

    if (updateError) throw updateError

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

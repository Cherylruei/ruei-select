import { NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { MemberOption } from '@/types'

function extractLineId(email: string | undefined): string | null {
  const match = email?.match(/^line_(.+)@internal\.rueiselect\.local$/)
  return match ? match[1] : null
}

/**
 * GET /api/admin/members
 * 回傳此賣場已審核通過（approved）的顧客清單，供代客建單下拉選取用。
 */
export async function GET() {
  try {
    const rhc = await createRouteHandlerClient()
    const {
      data: { user },
    } = await rhc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const lineId = extractLineId(user.email)
    if (!lineId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const db = createServiceClient()

    const { data: dbUser } = (await db
      .from('users')
      .select('id, role')
      .eq('line_id', lineId)
      .single()) as { data: { id: string; role: string } | null; error: unknown }

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 401 })
    if (dbUser.role !== 'merchant')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: store } = (await db
      .from('stores')
      .select('id')
      .eq('owner_id', dbUser.id)
      .maybeSingle()) as { data: { id: string } | null; error: unknown }

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = (await (db as any)
      .from('store_members')
      .select('id, name, line_id')
      .eq('store_id', store.id)
      .eq('status', 'approved')
      .order('name')) as {
      data: { id: string; name: string; line_id: string }[] | null
      error: { message: string } | null
    }

    if (error) throw new Error(error.message)

    const members: MemberOption[] = rows ?? []

    return NextResponse.json({ success: true, data: members })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

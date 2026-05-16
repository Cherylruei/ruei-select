import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyLiffToken } from '@/lib/line/verify-token'
import type { MemberSource } from '@/types'

const PHONE_REGEX = /^09\d{8}$/
const VALID_SOURCES: MemberSource[] = ['invite_link', 'public_page']

interface ApplyBody {
  liffToken: string
  slug: string
  name: string
  line_id: string
  phone?: string
  bio?: string
  source: MemberSource
  referring_product_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ApplyBody>

    const { liffToken, slug, name, line_id, phone, bio, source, referring_product_id } = body

    // 驗證 LIFF token
    if (!liffToken) return NextResponse.json({ error: 'Missing LIFF token' }, { status: 401 })
    const profile = await verifyLiffToken(liffToken)
    if (!profile) return NextResponse.json({ error: 'Invalid LIFF token' }, { status: 401 })

    // 驗證必填欄位
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: '姓名至少需要 2 個字' }, { status: 400 })
    }
    if (!line_id || line_id.trim().length === 0) {
      return NextResponse.json({ error: 'LINE ID 為必填' }, { status: 400 })
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: '手機號碼格式錯誤，請輸入 09 開頭的 10 碼號碼' },
        { status: 400 }
      )
    }
    if (!source || !VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }
    if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

    const serviceClient = createServiceClient()

    // 查詢賣場
    const { data: store } = (await serviceClient
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()) as { data: { id: string } | null; error: unknown }

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    // 取得或建立用戶（以 LINE userId 識別）
    const { data: existingUser } = (await serviceClient
      .from('users')
      .select('id')
      .eq('line_id', profile.lineId)
      .maybeSingle()) as { data: { id: string } | null; error: unknown }

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newUser, error: upsertError } = (await (serviceClient.from('users') as any)
        .upsert(
          {
            line_id: profile.lineId,
            display_name: profile.displayName,
            role: 'customer',
          },
          { onConflict: 'line_id' }
        )
        .select('id')
        .single()) as { data: { id: string } | null; error: unknown }

      if (upsertError || !newUser) {
        throw upsertError ?? new Error('Failed to create user')
      }
      userId = newUser.id
    }

    // 檢查是否已有申請記錄
    const { data: existingMember } = (await serviceClient
      .from('store_members')
      .select('id, status')
      .eq('store_id', store.id)
      .eq('user_id', userId)
      .maybeSingle()) as { data: { id: string; status: string } | null; error: unknown }

    if (existingMember) {
      if (existingMember.status === 'pending') {
        return NextResponse.json(
          { error: '申請正在審核中', code: 'already_pending' },
          { status: 409 }
        )
      }
      if (existingMember.status === 'approved') {
        return NextResponse.json(
          { error: '您已是本賣場會員', code: 'already_approved' },
          { status: 409 }
        )
      }
    }

    // 建立申請記錄
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member, error: insertError } = (await (serviceClient.from('store_members') as any)
      .insert({
        store_id: store.id,
        user_id: userId,
        name: name.trim(),
        phone: phone?.trim() || null,
        line_id: line_id.trim(),
        status: 'pending',
        source,
        referring_product_id: referring_product_id ?? null,
        note: bio?.trim() || null,
      })
      .select()
      .single()) as { data: unknown; error: unknown }

    if (insertError) throw insertError

    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

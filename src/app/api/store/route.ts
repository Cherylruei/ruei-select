import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/slug'
import type { Store } from '@/types'

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
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

    const serviceClient = createServiceClient()
    const { data: store, error } = (await serviceClient
      .from('stores')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle()) as { data: Store | null; error: unknown }

    if (error) throw error

    return NextResponse.json({ success: true, data: store })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as { name?: string; description?: string }
    const name = body.name?.trim() ?? ''
    const description = body.description?.trim() ?? null

    if (name.length < 2) {
      return NextResponse.json({ error: '賣場名稱至少需要 2 個字' }, { status: 400 })
    }
    if (name.length > 30) {
      return NextResponse.json({ error: '賣場名稱不能超過 30 個字' }, { status: 400 })
    }
    if (description && description.length > 200) {
      return NextResponse.json({ error: '賣場介紹不能超過 200 個字' }, { status: 400 })
    }

    const serviceClient = createServiceClient()

    // Slug collision retry (max 3 attempts)
    let store: Store | null = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = generateSlug(name)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await (serviceClient.from('stores') as any)
        .insert({ owner_id: userId, name, description, slug })
        .select()
        .single()) as { data: Store | null; error: { code?: string; message: string } | null }

      if (!error) {
        store = data
        break
      }
      // Unique constraint violation on slug — retry
      if (error.code !== '23505' || attempt === 2) {
        throw new Error(error.message)
      }
    }

    if (!store) {
      return NextResponse.json({ error: 'Failed to generate unique slug' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: store }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

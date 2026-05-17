import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
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

async function fetchStore(id: string): Promise<Store | null> {
  const serviceClient = createServiceClient()
  const { data } = (await serviceClient.from('stores').select('*').eq('id', id).single()) as {
    data: Store | null
    error: unknown
  }
  return data
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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
    const store = await fetchStore(id)
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    if (store.owner_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = (await request.json()) as {
      name?: string
      description?: string | null
      avatar_url?: string | null
      allow_public_products?: boolean
    }

    const name = body.name !== undefined ? body.name.trim() : store.name
    const description =
      body.description !== undefined
        ? body.description === null
          ? null
          : body.description.trim() || null
        : store.description

    if (name.length < 2) {
      return NextResponse.json({ error: '賣場名稱至少需要 2 個字' }, { status: 400 })
    }
    if (name.length > 30) {
      return NextResponse.json({ error: '賣場名稱不能超過 30 個字' }, { status: 400 })
    }
    if (description && description.length > 200) {
      return NextResponse.json({ error: '賣場介紹不能超過 200 個字' }, { status: 400 })
    }

    const updates: Partial<Store> = {
      name,
      description,
      updated_at: new Date().toISOString(),
    }
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url
    if (body.allow_public_products !== undefined)
      updates.allow_public_products = body.allow_public_products

    const serviceClient = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = (await (serviceClient.from('stores') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()) as { data: Store | null; error: { message: string } | null }

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, data: updated })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

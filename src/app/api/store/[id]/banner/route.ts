import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { Store } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

const BANNER_BUCKET = 'store-banners'
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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

async function resolveOwnedStore(
  id: string
): Promise<
  { store: Pick<Store, 'id' | 'owner_id' | 'banner_image_url'> } | { error: NextResponse }
> {
  const rhc = await createRouteHandlerClient()
  const {
    data: { user },
  } = await rhc.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const lineId = extractLineId(user.email)
  if (!lineId) return { error: NextResponse.json({ error: 'Invalid session' }, { status: 401 }) }

  const userId = await resolveUserId(lineId)
  if (!userId) return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }

  const serviceClient = createServiceClient()
  const { data: store } = (await serviceClient
    .from('stores')
    .select('id, owner_id, banner_image_url')
    .eq('id', id)
    .single()) as {
    data: Pick<Store, 'id' | 'owner_id' | 'banner_image_url'> | null
    error: unknown
  }

  if (!store) return { error: NextResponse.json({ error: 'Store not found' }, { status: 404 }) }
  if (store.owner_id !== userId)
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { store }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const resolved = await resolveOwnedStore(id)
    if ('error' in resolved) return resolved.error
    const { store } = resolved

    const formData = await request.formData()
    const file = formData.get('banner') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 JPG / PNG / WebP 格式' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: '圖片大小不能超過 5MB' }, { status: 400 })
    }

    const serviceClient = createServiceClient()

    if (store.banner_image_url) {
      const oldPath = store.banner_image_url.split(`/${BANNER_BUCKET}/`)[1]
      if (oldPath) {
        await serviceClient.storage.from(BANNER_BUCKET).remove([oldPath])
      }
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filePath = `${id}/banner-${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await serviceClient.storage
      .from(BANNER_BUCKET)
      .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const {
      data: { publicUrl },
    } = serviceClient.storage.from(BANNER_BUCKET).getPublicUrl(filePath)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (serviceClient.from('stores') as any)
      .update({ banner_image_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ success: true, data: { banner_image_url: publicUrl } })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ error: 'Internal server error', detail }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const resolved = await resolveOwnedStore(id)
    if ('error' in resolved) return resolved.error
    const { store } = resolved

    const serviceClient = createServiceClient()

    if (store.banner_image_url) {
      const oldPath = store.banner_image_url.split(`/${BANNER_BUCKET}/`)[1]
      if (oldPath) {
        await serviceClient.storage.from(BANNER_BUCKET).remove([oldPath])
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (serviceClient.from('stores') as any)
      .update({ banner_image_url: null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ success: true, data: { banner_image_url: null } })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ error: 'Internal server error', detail }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

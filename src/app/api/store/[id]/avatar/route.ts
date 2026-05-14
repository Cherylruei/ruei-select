import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createServiceClient } from '@/lib/supabase/server'
import type { Store } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

const AVATAR_BUCKET = 'store-avatars'
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
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

export async function POST(request: NextRequest, context: RouteContext) {
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
      .select('id, owner_id, avatar_url')
      .eq('id', id)
      .single()) as { data: Pick<Store, 'id' | 'owner_id' | 'avatar_url'> | null; error: unknown }

    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    if (store.owner_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 JPG / PNG / WebP 格式' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: '圖片大小不能超過 2MB' }, { status: 400 })
    }

    // Delete old avatar if exists
    if (store.avatar_url) {
      const oldPath = store.avatar_url.split(`/${AVATAR_BUCKET}/`)[1]
      if (oldPath) {
        await serviceClient.storage.from(AVATAR_BUCKET).remove([oldPath])
      }
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const filePath = `${id}/avatar-${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await serviceClient.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, arrayBuffer, { contentType: file.type, upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const {
      data: { publicUrl },
    } = serviceClient.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (serviceClient.from('stores') as any)
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ success: true, data: { avatar_url: publicUrl } })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({ error: 'Internal server error', detail }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthContext, isNextResponse } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const productId = formData.get('productId') as string | null

    if (!file) return NextResponse.json({ error: '圖片為必填' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '不支援的圖片格式' }, { status: 400 })
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: '圖片大小不能超過 2MB' }, { status: 400 })
    }

    const timestamp = Date.now()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const folder = productId ?? 'temp'
    const path = `${ctx.storeId}/${folder}/${timestamp}.${ext}`

    const serviceClient = createServiceClient()
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await serviceClient.storage
      .from('product-images')
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) throw new Error(uploadError.message)

    const { data: urlData } = serviceClient.storage.from('product-images').getPublicUrl(path)

    return NextResponse.json({ success: true, data: { url: urlData.publicUrl, path } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

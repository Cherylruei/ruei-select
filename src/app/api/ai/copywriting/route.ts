import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isNextResponse } from '@/lib/api-helpers'
import { optimizeCopywriting } from '@/lib/ai/copywriting'

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const body = (await request.json()) as { originalText?: string }
    const originalText = body.originalText?.trim() ?? ''

    if (!originalText) {
      return NextResponse.json({ error: '原始商品文為必填' }, { status: 400 })
    }
    if (originalText.length > 5000) {
      return NextResponse.json({ error: '原始商品文超過字數上限（5000字）' }, { status: 400 })
    }

    const result = await optimizeCopywriting(originalText)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 優化失敗'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

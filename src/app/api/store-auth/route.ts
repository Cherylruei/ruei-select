import { NextRequest, NextResponse } from 'next/server'
import { verifyStoreAccess } from '@/lib/store-auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Missing LIFF token' }, { status: 401 })
    }

    const outcome = await verifyStoreAccess(token, slug)

    if ('error' in outcome) {
      if (outcome.error === 'INVALID_TOKEN') {
        return NextResponse.json({ error: 'Invalid LIFF token' }, { status: 401 })
      }
      return NextResponse.json({ error: 'Store not found' }, { status: 404 })
    }

    return NextResponse.json(outcome.result)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

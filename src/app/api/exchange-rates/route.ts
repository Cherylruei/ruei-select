import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isNextResponse } from '@/lib/api-helpers'
import { getExchangeRate } from '@/lib/exchange-rates'
import type { Currency } from '@/types'

const SUPPORTED_CURRENCIES: Exclude<Currency, 'TWD'>[] = ['JPY', 'KRW', 'GBP', 'USD', 'HKD']

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext()
    if (isNextResponse(ctx)) return ctx

    const { searchParams } = new URL(request.url)
    const currency = searchParams.get('currency')?.toUpperCase() as Exclude<Currency, 'TWD'> | null

    if (!currency || !SUPPORTED_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        { error: `currency 必須為 ${SUPPORTED_CURRENCIES.join(' / ')} 之一` },
        { status: 400 }
      )
    }

    const result = await getExchangeRate(currency)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : '匯率查詢失敗'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

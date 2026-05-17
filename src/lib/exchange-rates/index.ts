import { createServiceClient } from '@/lib/supabase/server'
import type { Currency } from '@/types'

type SupportedForeignCurrency = Exclude<Currency, 'TWD'>

export interface ExchangeRateResult {
  currency: string
  rate: number // 1 外幣 = rate TWD
  warning?: string // 若使用舊快取則帶此訊息
}

async function fetchFromExternalApi(currency: SupportedForeignCurrency): Promise<number> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY
  if (!apiKey) throw new Error('EXCHANGE_RATE_API_KEY not configured')

  const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${currency}/TWD`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`ExchangeRate-API error: ${res.status}`)

  const data = (await res.json()) as { conversion_rate?: number; result?: string }
  if (data.result !== 'success' || typeof data.conversion_rate !== 'number') {
    throw new Error('ExchangeRate-API 回傳格式異常')
  }
  return data.conversion_rate
}

export async function getExchangeRate(
  currency: SupportedForeignCurrency
): Promise<ExchangeRateResult> {
  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  // 查詢今日快取
  const { data: cached } = (await supabase
    .from('exchange_rates')
    .select('rate')
    .eq('base_currency', 'TWD')
    .eq('target_currency', currency)
    .eq('fetched_at', today)
    .maybeSingle()) as { data: { rate: number } | null; error: unknown }

  if (cached) return { currency, rate: cached.rate }

  if (!process.env.EXCHANGE_RATE_API_KEY) throw new Error('EXCHANGE_RATE_API_KEY not configured')

  // 嘗試呼叫外部 API
  try {
    const rate = await fetchFromExternalApi(currency)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('exchange_rates')
      .upsert(
        { base_currency: 'TWD', target_currency: currency, rate, fetched_at: today },
        { onConflict: 'base_currency,target_currency,fetched_at' }
      )

    return { currency, rate }
  } catch {
    // 外部 API 失敗：回傳最後一筆快取
    const { data: lastCached } = (await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('base_currency', 'TWD')
      .eq('target_currency', currency)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: { rate: number } | null; error: unknown }

    if (lastCached) {
      return { currency, rate: lastCached.rate, warning: '匯率暫時無法更新，顯示最後快取值' }
    }
    throw new Error('匯率暫時無法取得')
  }
}

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  // reset env
  process.env.EXCHANGE_RATE_API_KEY = 'test-key'
})

// ── Helper: build chain mock ──────────────────────────────────────────────────

function buildChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {}
  ;['select', 'eq', 'order', 'limit', 'upsert', 'maybeSingle'].forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  ;(chain as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    Promise.resolve(resolve(resolveValue))
  return chain
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('getExchangeRate', () => {
  it('有今日快取時直接回傳快取值', async () => {
    const cachedData = { rate: 0.22 }
    mockFrom.mockReturnValue(buildChain({ data: cachedData, error: null }))

    const { getExchangeRate } = await import('../index')
    const result = await getExchangeRate('JPY')

    expect(result.rate).toBe(0.22)
    expect(result.currency).toBe('JPY')
    expect(result.warning).toBeUndefined()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('無快取時呼叫外部 API 並更新 DB', async () => {
    // 第一次查詢（今日）：null
    // 第二次 upsert：成功
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return buildChain({ data: null, error: null }) // no today cache
      return buildChain({ data: null, error: null }) // upsert
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'success', conversion_rate: 0.23 }),
    })

    const { getExchangeRate } = await import('../index')
    const result = await getExchangeRate('JPY')

    expect(result.rate).toBe(0.23)
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('外部 API 失敗時使用最後一筆快取並帶 warning', async () => {
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return buildChain({ data: null, error: null }) // no today cache
      return buildChain({ data: { rate: 0.21 }, error: null }) // last cached (API failed, no upsert)
    })

    mockFetch.mockResolvedValue({ ok: false, status: 429 })

    const { getExchangeRate } = await import('../index')
    const result = await getExchangeRate('JPY')

    expect(result.rate).toBe(0.21)
    expect(result.warning).toContain('快取')
  })

  it('外部 API 失敗且無任何快取時拋出錯誤', async () => {
    mockFrom.mockImplementation(() => buildChain({ data: null, error: null }))
    mockFetch.mockResolvedValue({ ok: false, status: 500 })

    const { getExchangeRate } = await import('../index')
    await expect(getExchangeRate('JPY')).rejects.toThrow('匯率暫時無法取得')
  })

  it('缺少 API key 時拋出錯誤', async () => {
    delete process.env.EXCHANGE_RATE_API_KEY
    mockFrom.mockImplementation(() => buildChain({ data: null, error: null }))

    const { getExchangeRate } = await import('../index')
    await expect(getExchangeRate('USD')).rejects.toThrow('EXCHANGE_RATE_API_KEY')
  })
})

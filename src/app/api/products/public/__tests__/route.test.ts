// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockServiceFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockServiceFrom })),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_STORE_PUBLIC = {
  id: 'store-1',
  name: '芮選測試賣場',
  avatar_url: null,
  allow_public_products: true,
}

const MOCK_PRODUCT_ACTIVE = {
  id: 'prod-1',
  store_id: 'store-1',
  name: '日系手提包',
  description: '高品質日本進口包款',
  is_public: true,
  status: 'active',
  variants: [{ id: 'var-1', price: 2500 }],
  product_images: [{ url: 'https://example.com/img.jpg', sort_order: 0 }],
}

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/products/public')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString())
}

function buildMaybeSingle(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: value, error: null }),
  }
}

function buildList(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: value, error: null }),
    then: (fn: (v: unknown) => unknown) => Promise.resolve(fn({ data: value, error: null })),
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('GET /api/products/public', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('slug 缺少時回傳 400', async () => {
    const { GET } = await import('../route')
    const res = await GET(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('賣場不存在時回傳 404', async () => {
    mockServiceFrom.mockReturnValue(buildMaybeSingle(null))

    const { GET } = await import('../route')
    const res = await GET(makeRequest({ slug: 'nonexistent' }))
    expect(res.status).toBe(404)
  })

  it('賣場未開放公開商品（allow_public_products=false）時回傳 404', async () => {
    mockServiceFrom.mockReturnValue(
      buildMaybeSingle({ ...MOCK_STORE_PUBLIC, allow_public_products: false })
    )

    const { GET } = await import('../route')
    const res = await GET(makeRequest({ slug: 'test-store' }))
    expect(res.status).toBe(404)
  })

  it('allow_public_products=true 時回傳公開商品列表', async () => {
    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return buildMaybeSingle(MOCK_STORE_PUBLIC) // stores query
      return buildList([MOCK_PRODUCT_ACTIVE]) // products query
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest({ slug: 'test-store' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.products)).toBe(true)
    expect(body.data.store.id).toBe('store-1')
  })

  it('查詢單一商品（有 id 參數）時回傳商品詳細', async () => {
    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return buildMaybeSingle(MOCK_STORE_PUBLIC) // stores query
      return buildMaybeSingle(MOCK_PRODUCT_ACTIVE) // product query
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest({ slug: 'test-store', id: 'prod-1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.product.id).toBe('prod-1')
  })

  it('查詢的商品不存在時回傳 404', async () => {
    let callCount = 0
    mockServiceFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return buildMaybeSingle(MOCK_STORE_PUBLIC)
      return buildMaybeSingle(null) // product not found
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest({ slug: 'test-store', id: 'nonexistent-id' }))
    expect(res.status).toBe(404)
  })
})

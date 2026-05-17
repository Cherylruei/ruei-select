// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}))

const mockGetAuthContext = vi.fn()
const mockIsNextResponse = (v: unknown): v is NextResponse => v instanceof NextResponse

vi.mock('@/lib/api-helpers', () => ({
  getAuthContext: mockGetAuthContext,
  isNextResponse: mockIsNextResponse,
}))

const mockServiceFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockServiceFrom })),
  createRouteHandlerClient: vi.fn(async () => ({ auth: { getUser: vi.fn() } })),
}))

const AUTH_CTX = { storeId: 'store-1', userId: 'user-1' }

const MOCK_PRODUCT = {
  id: 'prod-1',
  store_id: 'store-1',
  supplier_id: 'supplier-1',
  name: '日系手提包',
  description: '高品質日本進口包款',
  description_raw: null,
  images: [],
  sell_price: null,
  is_public: false,
  status: 'active',
  view_count: 0,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  supplier: { id: 'supplier-1', name: '日本廠商' },
  variants: [
    {
      id: 'var-1',
      product_id: 'prod-1',
      specs: {},
      price: 2500,
      cost: null,
      cost_currency: 'TWD',
      created_at: '2026-05-01T00:00:00Z',
    },
  ],
  product_images: [],
}

function buildChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {}
  ;[
    'select',
    'insert',
    'update',
    'upsert',
    'eq',
    'order',
    'single',
    'limit',
    'in',
    'maybeSingle',
  ].forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  ;(chain as { then: (fn: (v: unknown) => unknown) => Promise<unknown> }).then = (fn) =>
    Promise.resolve(fn(resolveValue))
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuthContext.mockResolvedValue(AUTH_CTX)
})

// ── GET /api/products ──────────────────────────────────────────────────────────

describe('GET /api/products', () => {
  it('未登入時回傳 401', async () => {
    mockGetAuthContext.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const { GET } = await import('../route')
    const req = new NextRequest('http://localhost/api/products')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('成功回傳商品列表', async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'products') return buildChain({ data: [MOCK_PRODUCT], error: null })
      return buildChain({ data: [], error: null })
    })

    const { GET } = await import('../route')
    const req = new NextRequest('http://localhost/api/products')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data)).toBe(true)
  })

  it('supplier_id 篩選條件正確傳遞', async () => {
    const productsChain = buildChain({ data: [MOCK_PRODUCT], error: null })
    mockServiceFrom.mockImplementation(() => productsChain)

    const { GET } = await import('../route')
    const req = new NextRequest('http://localhost/api/products?supplier_id=supplier-1')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })

  it('status 篩選條件正確傳遞', async () => {
    mockServiceFrom.mockImplementation(() => buildChain({ data: [], error: null }))

    const { GET } = await import('../route')
    const req = new NextRequest('http://localhost/api/products?status=active')
    const res = await GET(req)

    expect(res.status).toBe(200)
  })
})

// ── POST /api/products ──────────────────────────────────────────────────────────

describe('POST /api/products', () => {
  it('缺少商品名稱時回傳 400', async () => {
    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ supplier_id: 'supplier-1' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('名稱')
  })

  it('缺少廠商時回傳 400', async () => {
    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ name: '測試商品' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('廠商')
  })

  it('未登入時回傳 401', async () => {
    mockGetAuthContext.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({ supplier_id: 'supplier-1', name: '測試' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('建立商品成功回傳 201', async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'products') return buildChain({ data: MOCK_PRODUCT, error: null })
      if (table === 'product_variants') return buildChain({ data: [], error: null })
      return buildChain({ data: [], error: null })
    })

    const { POST } = await import('../route')
    const req = new NextRequest('http://localhost/api/products', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: 'supplier-1',
        name: '日系手提包',
        variants: [{ specs: {}, price: 2500, cost: null, cost_currency: 'TWD' }],
      }),
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

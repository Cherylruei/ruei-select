// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/store-auth', () => ({
  verifyStoreAccess: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

import { verifyStoreAccess } from '@/lib/store-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { GET } from '../route'

const mockVerify = vi.mocked(verifyStoreAccess)
const mockCreateServiceClient = vi.mocked(createServiceClient)

const mockStore = {
  id: 'store-1',
  name: '測試賣場',
  avatar_url: null,
  slug: 'test-store',
  line_official_account_url: null,
}

const mockMember = {
  id: 'member-1',
  name: '王小明',
  phone: '0912345678',
  line_id: 'U_test',
  created_at: '2026-01-01T00:00:00Z',
}

const mockProductRow = {
  id: 'prod-1',
  name: '日本面膜',
  description: '保濕效果佳',
  category_id: 'cat-1',
  product_categories: { name: '保養品' },
  status: 'active',
  store_id: 'store-1',
  product_images: [
    { url: 'https://example.com/img2.jpg', sort_order: 2 },
    { url: 'https://example.com/img1.jpg', sort_order: 1 },
  ],
  product_variants: [
    { id: 'var-1', specs: { 顏色: '紅', 尺寸: 'M' }, price: 299 },
    { id: 'var-2', specs: { 顏色: '藍', 尺寸: 'L' }, price: 399 },
  ],
}

function makeMockDb(row: typeof mockProductRow | null, error?: { message: string } | null) {
  const queryBuilder = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: error ?? null }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return queryBuilder as any
}

function makeRequest(id: string, slug?: string, token?: string) {
  const url = slug
    ? `http://localhost:3000/api/store-products/${id}?slug=${slug}`
    : `http://localhost:3000/api/store-products/${id}`
  const req = new NextRequest(url)
  if (token) req.headers.set('authorization', `Bearer ${token}`)
  return req
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/store-products/[id]', () => {
  it('回傳商品詳細（含 variants, images 依 sort_order 排序）', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'approved', store: mockStore, member: mockMember },
    })
    mockCreateServiceClient.mockReturnValue(makeMockDb(mockProductRow))

    const res = await GET(makeRequest('prod-1', 'test-store', 'valid-token'), makeParams('prod-1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.product.id).toBe('prod-1')
    expect(json.product.name).toBe('日本面膜')
    expect(json.product.category).toBe('保養品')
    expect(json.product.images[0].url).toBe('https://example.com/img1.jpg')
    expect(json.product.images[0].sort_order).toBe(1)
    expect(json.product.variants).toHaveLength(2)
    expect(json.product.variants[0]).toMatchObject({
      id: 'var-1',
      specs: { 顏色: '紅', 尺寸: 'M' },
      price: 299,
    })
  })

  it('inactive 商品 → 404', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'approved', store: mockStore, member: mockMember },
    })
    mockCreateServiceClient.mockReturnValue(makeMockDb({ ...mockProductRow, status: 'inactive' }))

    const res = await GET(makeRequest('prod-1', 'test-store', 'valid-token'), makeParams('prod-1'))
    expect(res.status).toBe(404)
  })

  it('商品不屬於此賣場 → 404', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'approved', store: mockStore, member: mockMember },
    })
    mockCreateServiceClient.mockReturnValue(
      makeMockDb({ ...mockProductRow, store_id: 'other-store' })
    )

    const res = await GET(makeRequest('prod-1', 'test-store', 'valid-token'), makeParams('prod-1'))
    expect(res.status).toBe(404)
  })

  it('商品不存在 → 404', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'approved', store: mockStore, member: mockMember },
    })
    mockCreateServiceClient.mockReturnValue(makeMockDb(null))

    const res = await GET(
      makeRequest('nonexistent', 'test-store', 'valid-token'),
      makeParams('nonexistent')
    )
    expect(res.status).toBe(404)
  })

  it('非 approved 顧客 → 403', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'pending', store: mockStore },
    })

    const res = await GET(makeRequest('prod-1', 'test-store', 'valid-token'), makeParams('prod-1'))
    expect(res.status).toBe(403)
  })

  it('未登入 → 401', async () => {
    const res = await GET(makeRequest('prod-1', 'test-store'), makeParams('prod-1'))
    expect(res.status).toBe(401)
  })

  it('LIFF token 無效 → 401', async () => {
    mockVerify.mockResolvedValue({ error: 'INVALID_TOKEN' })
    const res = await GET(makeRequest('prod-1', 'test-store', 'bad-token'), makeParams('prod-1'))
    expect(res.status).toBe(401)
  })
})

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
  applied_at: '2026-01-01T00:00:00Z',
}

interface MockProductRow {
  id: string
  name: string
  description: string | null
  category_id: string | null
  product_categories: { name: string } | null
  product_images: { url: string; sort_order: number }[]
  product_variants: { price: number }[]
}

const mockProductRows: MockProductRow[] = [
  {
    id: 'prod-1',
    name: '日本面膜',
    description: '保濕效果佳',
    category_id: 'cat-1',
    product_categories: { name: '保養品' },
    product_images: [
      { url: 'https://example.com/img1.jpg', sort_order: 1 },
      { url: 'https://example.com/img2.jpg', sort_order: 2 },
    ],
    product_variants: [{ price: 299 }, { price: 399 }],
  },
  {
    id: 'prod-2',
    name: '韓國眼霜',
    description: null,
    category_id: null,
    product_categories: null,
    product_images: [],
    product_variants: [{ price: 599 }],
  },
]

function makeMockDb(products: MockProductRow[] | null, error?: { message: string } | null) {
  const queryBuilder = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: products, error: error ?? null }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return queryBuilder as any
}

function makeRequest(slug?: string, token?: string) {
  const url = slug
    ? `http://localhost:3000/api/store-products?slug=${slug}`
    : 'http://localhost:3000/api/store-products'
  const req = new NextRequest(url)
  if (token) req.headers.set('authorization', `Bearer ${token}`)
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/store-products', () => {
  it('approved 顧客 → 200 回傳 active 商品列表（含 primaryImage 和 priceRange）', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'approved', store: mockStore, member: mockMember },
    })
    mockCreateServiceClient.mockReturnValue(makeMockDb(mockProductRows))

    const res = await GET(makeRequest('test-store', 'valid-token'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.products).toHaveLength(2)

    const prod1 = json.products[0]
    expect(prod1.id).toBe('prod-1')
    expect(prod1.name).toBe('日本面膜')
    expect(prod1.category).toBe('保養品')
    expect(prod1.primaryImage).toBe('https://example.com/img1.jpg')
    expect(prod1.priceRange).toEqual({ min: 299, max: 399 })

    const prod2 = json.products[1]
    expect(prod2.category).toBeNull()
    expect(prod2.primaryImage).toBeNull()
    expect(prod2.priceRange).toEqual({ min: 599, max: 599 })
  })

  it('pending 顧客 → 403', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'pending', store: mockStore },
    })

    const res = await GET(makeRequest('test-store', 'valid-token'))
    expect(res.status).toBe(403)
  })

  it('未登入（無 token） → 401', async () => {
    const res = await GET(makeRequest('test-store'))
    expect(res.status).toBe(401)
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('LIFF token 無效 → 401', async () => {
    mockVerify.mockResolvedValue({ error: 'INVALID_TOKEN' })
    const res = await GET(makeRequest('test-store', 'bad-token'))
    expect(res.status).toBe(401)
  })

  it('slug 不存在 → 404', async () => {
    mockVerify.mockResolvedValue({ error: 'STORE_NOT_FOUND' })
    const res = await GET(makeRequest('unknown', 'valid-token'))
    expect(res.status).toBe(404)
  })

  it('缺少 slug → 400', async () => {
    const res = await GET(makeRequest(undefined, 'valid-token'))
    expect(res.status).toBe(400)
  })

  it('商品圖片依 sort_order 排序，primaryImage 取最小的', async () => {
    const unorderedImages = [
      { url: 'https://example.com/second.jpg', sort_order: 2 },
      { url: 'https://example.com/first.jpg', sort_order: 1 },
    ]
    mockVerify.mockResolvedValue({
      result: { status: 'approved', store: mockStore, member: mockMember },
    })
    const row = {
      ...mockProductRows[0],
      product_images: unorderedImages,
    }
    mockCreateServiceClient.mockReturnValue(makeMockDb([row]))

    const res = await GET(makeRequest('test-store', 'valid-token'))
    const json = await res.json()
    expect(json.products[0].primaryImage).toBe('https://example.com/first.jpg')
  })
})

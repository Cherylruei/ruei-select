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
import { POST, GET } from '../route'

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

const approvedResult = {
  result: { status: 'approved' as const, store: mockStore, member: mockMember },
}

function makePostRequest(body: object, token?: string) {
  const req = new NextRequest('http://localhost:3000/api/orders', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
  if (token) req.headers.set('authorization', `Bearer ${token}`)
  return req
}

function makeGetRequest(storeSlug?: string, token?: string) {
  const url = storeSlug
    ? `http://localhost:3000/api/orders?storeSlug=${storeSlug}`
    : 'http://localhost:3000/api/orders'
  const req = new NextRequest(url)
  if (token) req.headers.set('authorization', `Bearer ${token}`)
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/orders', () => {
  it('成功下單 → 201 回傳 orderId', async () => {
    mockVerify.mockResolvedValue(approvedResult)

    let fromCount = 0
    const mockProductSingle = vi.fn().mockResolvedValue({
      data: { id: 'prod-1', store_id: 'store-1', status: 'active' },
      error: null,
    })
    const mockVariantSingle = vi.fn().mockResolvedValue({
      data: { id: 'var-1', product_id: 'prod-1', price: 299 },
      error: null,
    })
    const mockOrderSingle = vi.fn().mockResolvedValue({
      data: { id: 'order-new' },
      error: null,
    })
    const mockItemInsertResult = { data: null, error: null }

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        if (fromCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: mockProductSingle,
          }
        }
        if (fromCount === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: mockVariantSingle,
          }
        }
        if (fromCount === 3) {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: mockOrderSingle,
            }),
          }
        }
        return {
          insert: vi.fn().mockResolvedValue(mockItemInsertResult),
        }
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const res = await POST(
      makePostRequest(
        { storeSlug: 'test-store', productId: 'prod-1', variantId: 'var-1', quantity: 2 },
        'valid-token'
      )
    )
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.orderId).toBe('order-new')
  })

  it('未登入 → 401', async () => {
    const res = await POST(
      makePostRequest({
        storeSlug: 'test-store',
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 1,
      })
    )
    expect(res.status).toBe(401)
  })

  it('LIFF token 無效 → 401', async () => {
    mockVerify.mockResolvedValue({ error: 'INVALID_TOKEN' })
    const res = await POST(
      makePostRequest(
        { storeSlug: 'test-store', productId: 'prod-1', variantId: 'var-1', quantity: 1 },
        'bad-token'
      )
    )
    expect(res.status).toBe(401)
  })

  it('非 approved member → 403', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'pending', store: mockStore },
    })
    const res = await POST(
      makePostRequest(
        { storeSlug: 'test-store', productId: 'prod-1', variantId: 'var-1', quantity: 1 },
        'valid-token'
      )
    )
    expect(res.status).toBe(403)
  })

  it('quantity < 1 → 400', async () => {
    mockVerify.mockResolvedValue(approvedResult)
    const res = await POST(
      makePostRequest(
        { storeSlug: 'test-store', productId: 'prod-1', variantId: 'var-1', quantity: 0 },
        'valid-token'
      )
    )
    expect(res.status).toBe(400)
  })

  it('variant 不屬於此商品 → 400', async () => {
    mockVerify.mockResolvedValue(approvedResult)

    let fromCount = 0
    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        fromCount++
        if (fromCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'prod-1', store_id: 'store-1', status: 'active' },
              error: null,
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'var-1', product_id: 'other-product', price: 299 },
            error: null,
          }),
        }
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const res = await POST(
      makePostRequest(
        { storeSlug: 'test-store', productId: 'prod-1', variantId: 'var-1', quantity: 1 },
        'valid-token'
      )
    )
    expect(res.status).toBe(400)
  })
})

describe('GET /api/orders', () => {
  it('回傳當前顧客的訂單列表（含 displayStatus）', async () => {
    mockVerify.mockResolvedValue(approvedResult)

    const mockOrderRows = [
      {
        id: 'order-1',
        status: 'pending_purchase',
        ordered_at: '2026-05-01T10:00:00Z',
        order_items: [
          {
            id: 'item-1',
            quantity: 2,
            unit_price: 299,
            product_id: 'prod-1',
            variant_id: 'var-1',
            products: {
              id: 'prod-1',
              name: '日本面膜',
              product_images: [{ url: 'https://example.com/img.jpg', sort_order: 1 }],
            },
            product_variants: { id: 'var-1', specs: { 顏色: '紅' } },
          },
        ],
      },
    ]

    mockCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockOrderRows, error: null }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const res = await GET(makeGetRequest('test-store', 'valid-token'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.orders).toHaveLength(1)
    expect(json.orders[0].displayStatus).toBe('已訂購')
    expect(json.orders[0].items[0].product.name).toBe('日本面膜')
    expect(json.orders[0].items[0].product.primaryImage).toBe('https://example.com/img.jpg')
    expect(json.orders[0].items[0].variant?.specs).toEqual({ 顏色: '紅' })
  })

  it('未登入 → 401', async () => {
    const res = await GET(makeGetRequest('test-store'))
    expect(res.status).toBe(401)
  })

  it('非 approved member → 403', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'pending', store: mockStore },
    })
    const res = await GET(makeGetRequest('test-store', 'valid-token'))
    expect(res.status).toBe(403)
  })

  it('缺少 storeSlug → 400', async () => {
    mockVerify.mockResolvedValue(approvedResult)
    const res = await GET(makeGetRequest(undefined, 'valid-token'))
    expect(res.status).toBe(400)
  })
})

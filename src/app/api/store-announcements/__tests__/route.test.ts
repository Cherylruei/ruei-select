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
const mockCreateService = vi.mocked(createServiceClient)

const mockStore = {
  id: 'store-1',
  name: '測試賣場',
  avatar_url: null,
  slug: 'test-store',
  line_official_account_url: null,
}
const mockMember = {
  id: 'm-1',
  name: '王小明',
  phone: null,
  line_id: 'U_test',
  applied_at: '2026-01-01T00:00:00Z',
}

function makeDb(rows: unknown[]) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: vi.fn().mockReturnValue(builder) } as any
}

function makeReq(slug?: string, token?: string) {
  const params = new URLSearchParams()
  if (slug) params.set('slug', slug)
  const req = new NextRequest(`http://localhost/api/store-announcements?${params.toString()}`)
  if (token) req.headers.set('authorization', `Bearer ${token}`)
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/store-announcements', () => {
  it('缺 slug → 400', async () => {
    const res = await GET(makeReq(undefined, 'tok'))
    expect(res.status).toBe(400)
  })

  it('無 token → 401', async () => {
    const res = await GET(makeReq('test-store'))
    expect(res.status).toBe(401)
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('token 無效 → 401', async () => {
    mockVerify.mockResolvedValue({ error: 'INVALID_TOKEN' })
    const res = await GET(makeReq('test-store', 'bad'))
    expect(res.status).toBe(401)
  })

  it('非 approved member → 403', async () => {
    mockVerify.mockResolvedValue({ result: { status: 'pending', store: mockStore } })
    const res = await GET(makeReq('test-store', 'tok'))
    expect(res.status).toBe(403)
  })

  it('approved → 只回傳發布中且未到期的公告，不外洩 is_active/expires_at', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'approved', store: mockStore, member: mockMember },
    })
    const future = new Date(Date.now() + 86400000).toISOString()
    const past = new Date(Date.now() - 86400000).toISOString()
    const rows = [
      {
        id: 'a1',
        title: '永久',
        content: 'c1',
        type: 'info',
        is_active: true,
        expires_at: null,
        created_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 'a2',
        title: '未到期',
        content: 'c2',
        type: 'promo',
        is_active: true,
        expires_at: future,
        created_at: '2026-06-02T00:00:00Z',
      },
      {
        id: 'a3',
        title: '已到期',
        content: 'c3',
        type: 'warning',
        is_active: true,
        expires_at: past,
        created_at: '2026-06-03T00:00:00Z',
      },
    ]
    mockCreateService.mockReturnValue(makeDb(rows))

    const res = await GET(makeReq('test-store', 'tok'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.map((a: { id: string }) => a.id)).toEqual(['a1', 'a2'])
    expect(json.data[0]).not.toHaveProperty('is_active')
  })
})

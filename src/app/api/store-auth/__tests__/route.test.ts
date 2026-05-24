// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock verifyStoreAccess
vi.mock('@/lib/store-auth', () => ({
  verifyStoreAccess: vi.fn(),
}))

import { verifyStoreAccess } from '@/lib/store-auth'
import { GET } from '../route'

const mockVerify = vi.mocked(verifyStoreAccess)

function makeRequest(slug?: string, token?: string) {
  const url = slug
    ? `http://localhost:3000/api/store-auth?slug=${slug}`
    : 'http://localhost:3000/api/store-auth'
  const req = new NextRequest(url)
  if (token) req.headers.set('authorization', `Bearer ${token}`)
  return req
}

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/store-auth', () => {
  it('LIFF token 有效 + approved → 200 帶 member', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'approved', store: mockStore, member: mockMember },
    })

    const res = await GET(makeRequest('test-store', 'valid-token'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('approved')
    expect(json.member).toMatchObject({
      id: 'member-1',
      name: '王小明',
      phone: '0912345678',
      line_id: 'U_test',
      applied_at: '2026-01-01T00:00:00Z',
    })
    expect(json.store.slug).toBe('test-store')
  })

  it('LIFF token 有效 + pending → 200 status: pending', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'pending', store: mockStore },
    })

    const res = await GET(makeRequest('test-store', 'valid-token'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('pending')
    expect(json.member).toBeUndefined()
  })

  it('LIFF token 有效 + 無申請記錄 → 200 status: none', async () => {
    mockVerify.mockResolvedValue({
      result: { status: 'none', store: mockStore },
    })

    const res = await GET(makeRequest('test-store', 'valid-token'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('none')
  })

  it('LIFF token 無效 → 401', async () => {
    mockVerify.mockResolvedValue({ error: 'INVALID_TOKEN' })

    const res = await GET(makeRequest('test-store', 'bad-token'))

    expect(res.status).toBe(401)
  })

  it('slug 不存在 → 404', async () => {
    mockVerify.mockResolvedValue({ error: 'STORE_NOT_FOUND' })

    const res = await GET(makeRequest('unknown-store', 'valid-token'))

    expect(res.status).toBe(404)
  })

  it('缺少 Authorization header → 401', async () => {
    const res = await GET(makeRequest('test-store'))

    expect(res.status).toBe(401)
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('缺少 slug → 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/store-auth')
    req.headers.set('authorization', 'Bearer some-token')
    const res = await GET(req)

    expect(res.status).toBe(400)
  })
})

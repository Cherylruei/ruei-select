// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}))

const mockServiceFrom = vi.fn()
const mockRhcAuth = { getUser: vi.fn() }

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockServiceFrom })),
  createRouteHandlerClient: vi.fn(async () => ({ auth: mockRhcAuth })),
}))

const MOCK_USER = { id: 'auth-123', email: 'line_U123@internal.rueiselect.local' }
const MOCK_STORE = { id: 'store-1', owner_id: 'user-1' }
const MOCK_PENDING_MEMBER = {
  id: 'member-1',
  store_id: 'store-1',
  user_id: 'user-cust-1',
  name: '王小明',
  phone: '0912345678',
  line_id: 'U_customer1',
  status: 'pending',
  applied_at: '2026-05-01T00:00:00Z',
  reviewed_at: null,
}
const MOCK_APPROVED_MEMBER = {
  id: 'member-2',
  store_id: 'store-1',
  user_id: 'user-cust-2',
  name: '李小花',
  phone: '0987654321',
  line_id: 'U_customer2',
  status: 'approved',
  applied_at: '2026-04-01T00:00:00Z',
  reviewed_at: '2026-04-02T00:00:00Z',
}

function makeRequest(params?: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/customers')
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url.toString(), { method: 'GET' })
}

function setupUserAndStore() {
  mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })
  mockServiceFrom.mockImplementation((table: string) => {
    if (table === 'users')
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: { id: 'user-1', role: 'merchant' }, error: null }),
      }
    if (table === 'stores')
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
      }
    return {}
  })
}

// ── GET /api/customers ────────────────────────────────────────────────────────

describe('GET /api/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a merchant', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'user-1', role: 'customer' }, error: null }),
        }
      return {}
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })

  it('returns 404 when merchant has no store', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'user-1', role: 'merchant' }, error: null }),
        }
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      return {}
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(404)
  })

  it('returns empty array for pending status when no pending members', async () => {
    setupUserAndStore()
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'user-1', role: 'merchant' }, error: null }),
        }
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'store_members')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      return {}
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest({ status: 'pending' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  it('returns empty array for approved status when no approved members', async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'user-1', role: 'merchant' }, error: null }),
        }
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'store_members')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      return {}
    })
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

    const { GET } = await import('../route')
    const res = await GET(makeRequest({ status: 'approved' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  it('returns pending members when status=pending', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'user-1', role: 'merchant' }, error: null }),
        }
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'store_members')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [MOCK_PENDING_MEMBER], error: null }),
        }
      return {}
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest({ status: 'pending' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].status).toBe('pending')
  })

  it('returns all members when no status filter', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi
            .fn()
            .mockResolvedValue({ data: { id: 'user-1', role: 'merchant' }, error: null }),
        }
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'store_members')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi
            .fn()
            .mockResolvedValue({ data: [MOCK_PENDING_MEMBER, MOCK_APPROVED_MEMBER], error: null }),
        }
      return {}
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(2)
  })
})

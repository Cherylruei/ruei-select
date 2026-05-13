// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}))

const mockServiceFrom = vi.fn()
const mockRhcFrom = vi.fn()
const mockRhcAuth = { getUser: vi.fn() }

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockServiceFrom })),
  createRouteHandlerClient: vi.fn(async () => ({
    from: mockRhcFrom,
    auth: mockRhcAuth,
  })),
}))

vi.mock('@/lib/slug', () => ({
  generateSlug: vi.fn().mockReturnValue('test-slug-a1b2'),
}))

function makeRequest(method: string, body?: unknown) {
  return new NextRequest('http://localhost:3000/api/store', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { GET } = await import('../route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('returns store data when authenticated and store exists', async () => {
    const mockUser = { id: 'auth-123', email: 'line_U123@internal.rueiselect.local' }
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const mockStore = {
      id: 'store-1',
      owner_id: 'user-1',
      name: '芮選小舖',
      description: null,
      avatar_url: null,
      slug: 'ruixuanxiaopu-a3f2',
      invite_token: 'token-abc',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    const mockUsersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
    }
    const mockStoresQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockStore, error: null }),
    }
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') return mockUsersQuery
      if (table === 'stores') return mockStoresQuery
      return {}
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('芮選小舖')
  })

  it('returns null data when store does not exist', async () => {
    const mockUser = { id: 'auth-123', email: 'line_U123@internal.rueiselect.local' }
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const mockUsersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
    }
    const mockStoresQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') return mockUsersQuery
      if (table === 'stores') return mockStoresQuery
      return {}
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeNull()
  })
})

describe('POST /api/store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { POST } = await import('../route')
    const res = await POST(makeRequest('POST', { name: '芮選' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is shorter than 2 chars', async () => {
    const mockUser = { id: 'auth-123', email: 'line_U123@internal.rueiselect.local' }
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const mockUsersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
    }
    mockServiceFrom.mockImplementation(() => mockUsersQuery)

    const { POST } = await import('../route')
    const res = await POST(makeRequest('POST', { name: '芮' }))
    expect(res.status).toBe(400)
  })

  it('creates store and returns 201 on valid input', async () => {
    const mockUser = { id: 'auth-123', email: 'line_U123@internal.rueiselect.local' }
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

    const newStore = {
      id: 'store-new',
      owner_id: 'user-1',
      name: '芮選小舖',
      description: null,
      avatar_url: null,
      slug: 'test-slug-a1b2',
      invite_token: 'new-token',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    const mockUsersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
    }
    const mockInsertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newStore, error: null }),
    }
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') return mockUsersQuery
      if (table === 'stores') return mockInsertQuery
      return {}
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest('POST', { name: '芮選小舖', description: '日韓代購' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.slug).toBe('test-slug-a1b2')
  })
})

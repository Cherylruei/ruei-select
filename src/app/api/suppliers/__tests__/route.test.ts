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
const MOCK_SUPPLIERS = [
  {
    id: 'sup-2',
    store_id: 'store-1',
    name: '日本廠商B',
    note: null,
    created_at: '2026-01-02T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
  },
  {
    id: 'sup-1',
    store_id: 'store-1',
    name: '日本廠商A',
    note: '品質好',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

function makeRequest(method: string, body?: unknown) {
  return new NextRequest('http://localhost:3000/api/suppliers', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function setupUserAndStore() {
  mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

  const mockUsersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
  }
  const mockStoresQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
  }

  mockServiceFrom.mockImplementation((table: string) => {
    if (table === 'users') return mockUsersQuery
    if (table === 'stores') return mockStoresQuery
    return {}
  })
}

// ── GET /api/suppliers ────────────────────────────────────────────────────────

describe('GET /api/suppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { GET } = await import('../route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('returns 404 when user has no store', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

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
    expect(res.status).toBe(404)
  })

  it('returns suppliers sorted by created_at DESC', async () => {
    setupUserAndStore()

    const mockSuppliersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: MOCK_SUPPLIERS, error: null }),
    }
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
        }
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'suppliers') return mockSuppliersQuery
      return {}
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(2)
    expect(body.data[0].name).toBe('日本廠商B')
  })

  it('returns empty array when no suppliers exist', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

    const mockSuppliersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
        }
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'suppliers') return mockSuppliersQuery
      return {}
    })

    const { GET } = await import('../route')
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual([])
  })
})

// ── POST /api/suppliers ───────────────────────────────────────────────────────

describe('POST /api/suppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { POST } = await import('../route')
    const res = await POST(makeRequest('POST', { name: '廠商A' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is empty', async () => {
    setupUserAndStore()

    const { POST } = await import('../route')
    const res = await POST(makeRequest('POST', { name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when name exceeds 30 chars', async () => {
    setupUserAndStore()

    const { POST } = await import('../route')
    const res = await POST(makeRequest('POST', { name: 'a'.repeat(31) }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when note exceeds 100 chars', async () => {
    setupUserAndStore()

    const { POST } = await import('../route')
    const res = await POST(makeRequest('POST', { name: '廠商A', note: 'n'.repeat(101) }))
    expect(res.status).toBe(400)
  })

  it('creates supplier and returns 201 on valid input', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

    const newSupplier = {
      id: 'sup-new',
      store_id: 'store-1',
      name: '廠商A',
      note: '備註',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const mockInsertQuery = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newSupplier, error: null }),
    }

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
        }
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'suppliers') return mockInsertQuery
      return {}
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest('POST', { name: '廠商A', note: '備註' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('廠商A')
  })
})

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
const MOCK_STORE = {
  id: 'store-1',
  owner_id: 'user-1',
  name: '芮選小舖',
  description: null,
  avatar_url: null,
  slug: 'ruixuan-a3f2',
  invite_token: 'token-abc',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function makeRequest(method: string, id: string, body?: unknown) {
  return new NextRequest(`http://localhost:3000/api/store/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function setupUserAndStore(store: typeof MOCK_STORE | null = MOCK_STORE) {
  mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

  const mockUsersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
  }
  const mockStoresSelectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: store, error: null }),
  }
  const mockUpdateQuery = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { ...MOCK_STORE, ...{ name: '新名稱' } },
      error: null,
    }),
  }

  mockServiceFrom.mockImplementation((table: string) => {
    if (table === 'users') return mockUsersQuery
    if (table === 'stores')
      return {
        ...mockStoresSelectQuery,
        ...mockUpdateQuery,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: store, error: null }),
        update: mockUpdateQuery.update,
      }
    return {}
  })

  return { mockUsersQuery, mockStoresSelectQuery, mockUpdateQuery }
}

// ── PATCH /api/store/[id] ──────────────────────────────────────────────────────

describe('PATCH /api/store/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('PATCH', 'store-1', { name: '新名稱' }), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is shorter than 2 chars', async () => {
    setupUserAndStore()

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('PATCH', 'store-1', { name: '芮' }), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is longer than 30 chars', async () => {
    setupUserAndStore()

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('PATCH', 'store-1', { name: 'a'.repeat(31) }), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when description exceeds 200 chars', async () => {
    setupUserAndStore()

    const { PATCH } = await import('../route')
    const res = await PATCH(
      makeRequest('PATCH', 'store-1', { name: '芮選小舖', description: 'a'.repeat(201) }),
      { params: Promise.resolve({ id: 'store-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 403 when store belongs to another user', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

    const mockUsersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'other-user' }, error: null }),
    }
    const mockStoresQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...MOCK_STORE, owner_id: 'someone-else' },
        error: null,
      }),
    }
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') return mockUsersQuery
      if (table === 'stores') return mockStoresQuery
      return {}
    })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('PATCH', 'store-1', { name: '芮選小舖' }), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(403)
  })
})

// ── POST /api/store/[id]/invite-token ─────────────────────────────────────────

describe('POST /api/store/[id]/invite-token', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { POST: postInviteToken } = await import('../invite-token/route')
    const req = new NextRequest('http://localhost:3000/api/store/store-1/invite-token', {
      method: 'POST',
    })
    const res = await postInviteToken(req, { params: Promise.resolve({ id: 'store-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when store belongs to another user', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

    const mockUsersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'other-user' }, error: null }),
    }
    const mockStoresQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...MOCK_STORE, owner_id: 'someone-else' },
        error: null,
      }),
    }
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') return mockUsersQuery
      if (table === 'stores') return mockStoresQuery
      return {}
    })

    const { POST: postInviteToken } = await import('../invite-token/route')
    const req = new NextRequest('http://localhost:3000/api/store/store-1/invite-token', {
      method: 'POST',
    })
    const res = await postInviteToken(req, { params: Promise.resolve({ id: 'store-1' }) })
    expect(res.status).toBe(403)
  })

  it('updates invite_token and returns 200', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

    const mockUsersQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
    }

    // update chain: update().eq().select().single()
    const updateSingle = vi.fn().mockResolvedValue({
      data: { invite_token: 'new-token-uuid' },
      error: null,
    })
    const updateSelectChain = { select: vi.fn().mockReturnValue({ single: updateSingle }) }
    const updateEqChain = { eq: vi.fn().mockReturnValue(updateSelectChain) }
    const updateFn = vi.fn().mockReturnValue(updateEqChain)

    // select chain: select().eq().single()
    const selectSingle = vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null })
    const selectEqChain = { eq: vi.fn().mockReturnValue({ single: selectSingle }) }
    const selectFn = vi.fn().mockReturnValue(selectEqChain)

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') return mockUsersQuery
      if (table === 'stores') return { select: selectFn, update: updateFn }
      return {}
    })

    const { POST: postInviteToken } = await import('../invite-token/route')
    const req = new NextRequest('http://localhost:3000/api/store/store-1/invite-token', {
      method: 'POST',
    })
    const res = await postInviteToken(req, { params: Promise.resolve({ id: 'store-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.invite_token).toBe('new-token-uuid')
  })
})

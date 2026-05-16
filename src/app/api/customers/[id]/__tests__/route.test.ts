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
  source: 'invite_link',
  referring_product_id: null,
  note: null,
  applied_at: '2026-05-01T00:00:00Z',
  reviewed_at: null,
}

function makeRequest(id: string, body: Record<string, unknown>) {
  const url = new URL(`http://localhost:3000/api/customers/${id}`)
  return new NextRequest(url.toString(), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setupAuth() {
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

// ── PATCH /api/customers/[id] ─────────────────────────────────────────────────

describe('PATCH /api/customers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('member-1', { action: 'approve' }), {
      params: Promise.resolve({ id: 'member-1' }),
    })
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

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('member-1', { action: 'approve' }), {
      params: Promise.resolve({ id: 'member-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 when action is invalid', async () => {
    setupAuth()
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

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('member-1', { action: 'invalid' }), {
      params: Promise.resolve({ id: 'member-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 403 when member does not belong to this store', async () => {
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
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      return {}
    })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('member-other', { action: 'approve' }), {
      params: Promise.resolve({ id: 'member-other' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 409 when member is already reviewed', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })
    const alreadyApproved = {
      ...MOCK_PENDING_MEMBER,
      status: 'approved',
      reviewed_at: '2026-05-10T00:00:00Z',
    }
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
          maybeSingle: vi.fn().mockResolvedValue({ data: alreadyApproved, error: null }),
        }
      return {}
    })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('member-1', { action: 'approve' }), {
      params: Promise.resolve({ id: 'member-1' }),
    })
    expect(res.status).toBe(409)
  })

  it('successfully approves a pending member', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })
    const updatedMember = {
      ...MOCK_PENDING_MEMBER,
      status: 'approved',
      reviewed_at: '2026-05-16T00:00:00Z',
    }
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
      if (table === 'store_members') {
        const selectMock = vi.fn().mockReturnThis()
        const eqMock = vi.fn().mockReturnThis()
        const maybeSingleMock = vi
          .fn()
          .mockResolvedValue({ data: MOCK_PENDING_MEMBER, error: null })
        const updateMock = vi.fn().mockReturnThis()
        const updateEqMock = vi.fn().mockReturnThis()
        const selectAfterUpdate = vi.fn().mockReturnThis()
        const singleAfterUpdate = vi.fn().mockResolvedValue({ data: updatedMember, error: null })

        return {
          select: selectMock,
          eq: eqMock,
          maybeSingle: maybeSingleMock,
          update: updateMock.mockReturnValue({
            eq: updateEqMock.mockReturnValue({
              select: selectAfterUpdate.mockReturnValue({
                single: singleAfterUpdate,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('member-1', { action: 'approve' }), {
      params: Promise.resolve({ id: 'member-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('approved')
  })

  it('successfully rejects a pending member', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })
    const updatedMember = {
      ...MOCK_PENDING_MEMBER,
      status: 'rejected',
      reviewed_at: '2026-05-16T00:00:00Z',
    }
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
      if (table === 'store_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_PENDING_MEMBER, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: updatedMember, error: null }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('member-1', { action: 'reject' }), {
      params: Promise.resolve({ id: 'member-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('rejected')
  })
})

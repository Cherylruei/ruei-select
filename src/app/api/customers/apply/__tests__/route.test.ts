// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}))

const mockServiceFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({ from: mockServiceFrom })),
}))

const mockVerifyLiffToken = vi.fn()
vi.mock('@/lib/line/verify-token', () => ({
  verifyLiffToken: mockVerifyLiffToken,
}))

const MOCK_STORE = { id: 'store-1', slug: 'test-store', owner_id: 'owner-1' }
const MOCK_USER = { id: 'user-cust-1', line_id: 'U_customer1' }

function makeRequest(body: Record<string, unknown>) {
  const url = new URL('http://localhost:3000/api/customers/apply')
  return new NextRequest(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_BODY = {
  liffToken: 'valid-token',
  slug: 'test-store',
  name: '王小明',
  line_id: 'user_line_id',
  phone: '0912345678',
  bio: '我是一個愛好代購的人',
  source: 'invite_link',
}

// ── POST /api/customers/apply ─────────────────────────────────────────────────

describe('POST /api/customers/apply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when LIFF token is invalid', async () => {
    mockVerifyLiffToken.mockResolvedValue(null)

    const { POST } = await import('../route')
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    mockVerifyLiffToken.mockResolvedValue({ lineId: 'U_customer1', displayName: '王小明' })
    mockServiceFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
    }))

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ ...VALID_BODY, name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is less than 2 characters', async () => {
    mockVerifyLiffToken.mockResolvedValue({ lineId: 'U_customer1', displayName: '王' })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ ...VALID_BODY, name: '王' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when phone format is invalid', async () => {
    mockVerifyLiffToken.mockResolvedValue({ lineId: 'U_customer1', displayName: '王小明' })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ ...VALID_BODY, phone: '1234567890' }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when slug does not exist', async () => {
    mockVerifyLiffToken.mockResolvedValue({ lineId: 'U_customer1', displayName: '王小明' })
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      return {}
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest({ ...VALID_BODY, slug: 'nonexistent' }))
    expect(res.status).toBe(404)
  })

  it('returns 409 with already_pending when duplicate pending application exists', async () => {
    mockVerifyLiffToken.mockResolvedValue({ lineId: 'U_customer1', displayName: '王小明' })
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_USER, error: null }),
        }
      if (table === 'store_members')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: 'member-1', status: 'pending' }, error: null }),
        }
      return {}
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('already_pending')
  })

  it('returns 409 with already_approved when member is already approved', async () => {
    mockVerifyLiffToken.mockResolvedValue({ lineId: 'U_customer1', displayName: '王小明' })
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_USER, error: null }),
        }
      if (table === 'store_members')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { id: 'member-1', status: 'approved' }, error: null }),
        }
      return {}
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('already_approved')
  })

  it('returns 400 when referring_product_id does not belong to the store', async () => {
    mockVerifyLiffToken.mockResolvedValue({ lineId: 'U_customer1', displayName: '王小明' })
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'products')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), // 不屬於此賣場
        }
      return {}
    })

    const { POST } = await import('../route')
    const res = await POST(
      makeRequest({ ...VALID_BODY, source: 'public_page', referring_product_id: 'other-prod-id' })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('賣場')
  })

  it('successfully creates a pending member for public_page source with referring_product_id', async () => {
    mockVerifyLiffToken.mockResolvedValue({ lineId: 'U_customer1', displayName: '王小明' })
    const newMember = {
      id: 'member-new',
      store_id: 'store-1',
      user_id: 'user-cust-1',
      name: '王小明',
      phone: '0912345678',
      line_id: 'user_line_id',
      status: 'pending',
      source: 'public_page',
      referring_product_id: 'prod-1',
      note: '我是一個愛好代購的人',
      applied_at: '2026-05-16T00:00:00Z',
      reviewed_at: null,
    }
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'products')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'prod-1' }, error: null }),
        }
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_USER, error: null }),
          upsert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_USER, error: null }),
        }
      if (table === 'store_members')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: newMember, error: null }),
        }
      return {}
    })

    const { POST } = await import('../route')
    const res = await POST(
      makeRequest({ ...VALID_BODY, source: 'public_page', referring_product_id: 'prod-1' })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.source).toBe('public_page')
    expect(body.data.referring_product_id).toBe('prod-1')
  })

  it('successfully creates a pending member for invite_link source', async () => {
    mockVerifyLiffToken.mockResolvedValue({ lineId: 'U_customer1', displayName: '王小明' })
    const newMember = {
      id: 'member-new',
      store_id: 'store-1',
      user_id: 'user-cust-1',
      name: '王小明',
      phone: '0912345678',
      line_id: 'user_line_id',
      status: 'pending',
      source: 'invite_link',
      referring_product_id: null,
      note: '我是一個愛好代購的人',
      applied_at: '2026-05-16T00:00:00Z',
      reviewed_at: null,
    }
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'stores')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_STORE, error: null }),
        }
      if (table === 'users')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_USER, error: null }),
          upsert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_USER, error: null }),
        }
      if (table === 'store_members')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: newMember, error: null }),
        }
      return {}
    })

    const { POST } = await import('../route')
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('pending')
    expect(body.data.source).toBe('invite_link')
  })
})

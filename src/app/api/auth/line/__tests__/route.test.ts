// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
}
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}))

const mockServiceFrom = vi.fn()
const mockServiceAuth = {
  admin: {
    createUser: vi.fn(),
    listUsers: vi.fn(),
  },
}
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
    auth: mockServiceAuth,
  })),
  createRouteHandlerClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: {} }, error: null }),
    },
  })),
}))

// ── Fetch mock helpers ────────────────────────────────────────────────────────

function mockLineToken(
  ok: boolean,
  body: Record<string, unknown> = { access_token: 'mock-access-token' }
) {
  return { ok, json: vi.fn().mockResolvedValue(body), status: ok ? 200 : 400 }
}

function mockLineProfile(
  ok: boolean,
  body = {
    userId: 'U123',
    displayName: '芮選測試',
    pictureUrl: 'https://pic.example.com/avatar.jpg',
  }
) {
  return { ok, json: vi.fn().mockResolvedValue(body), status: ok ? 200 : 401 }
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/auth/line', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/line', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieStore.getAll.mockReturnValue([])
    mockCookieStore.set.mockReset()
  })

  describe('input validation', () => {
    it('returns 400 when both code and accessToken are missing', async () => {
      const { POST } = await import('../route')
      const res = await POST(makeRequest({}))
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/missing/i)
    })

    it('returns 400 when code is provided but redirectUri is missing', async () => {
      const { POST } = await import('../route')
      const res = await POST(makeRequest({ code: 'abc123' }))
      expect(res.status).toBe(400)
    })
  })

  describe('LINE code exchange flow', () => {
    it('returns 401 when LINE token exchange fails (invalid code)', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(mockLineToken(false, { error: 'invalid_grant' }))
      const { POST } = await import('../route')
      const res = await POST(
        makeRequest({ code: 'bad-code', redirectUri: 'http://localhost:3000/admin/login' })
      )
      expect(res.status).toBe(401)
    })

    it('returns 503 when LINE API is unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('fetch failed'))
      const { POST } = await import('../route')
      const res = await POST(
        makeRequest({ code: 'any', redirectUri: 'http://localhost:3000/admin/login' })
      )
      expect(res.status).toBe(503)
    })
  })

  describe('accessToken flow (LIFF)', () => {
    it('returns 401 when access token is invalid (LINE profile fails)', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(mockLineProfile(false))
      const { POST } = await import('../route')
      const res = await POST(makeRequest({ accessToken: 'bad-token' }))
      expect(res.status).toBe(401)
    })

    it('upserts user in users table and returns 200 on valid access token', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(mockLineProfile(true))

      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      mockServiceFrom.mockReturnValue({ upsert: mockUpsert })
      mockServiceAuth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null })
      mockServiceAuth.admin.createUser.mockResolvedValue({
        data: { user: { id: 'sup-123' } },
        error: null,
      })

      const { POST } = await import('../route')
      const res = await POST(makeRequest({ accessToken: 'valid-token' }))

      expect(res.status).toBe(200)
      expect(mockServiceFrom).toHaveBeenCalledWith('users')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ line_id: 'U123', role: 'merchant' }),
        expect.objectContaining({ onConflict: 'line_id' })
      )
    })

    it('skips createUser if Supabase auth user already exists', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(mockLineProfile(true))

      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      mockServiceFrom.mockReturnValue({ upsert: mockUpsert })
      mockServiceAuth.admin.listUsers.mockResolvedValue({
        data: { users: [{ id: 'existing-sup-id', email: 'line_U123@internal.rueiselect.local' }] },
        error: null,
      })

      const { POST } = await import('../route')
      const res = await POST(makeRequest({ accessToken: 'valid-token' }))

      expect(res.status).toBe(200)
      expect(mockServiceAuth.admin.createUser).not.toHaveBeenCalled()
    })
  })
})

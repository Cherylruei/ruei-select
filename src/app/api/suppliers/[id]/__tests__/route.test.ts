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
const MOCK_SUPPLIER = {
  id: 'sup-1',
  store_id: 'store-1',
  name: '日本廠商A',
  note: '品質好',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function makeRequest(method: string, id: string, body?: unknown) {
  return new NextRequest(`http://localhost:3000/api/suppliers/${id}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function setupUserStoreAndSupplier(supplierOverride?: Partial<typeof MOCK_SUPPLIER> | null) {
  mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

  const supplier = supplierOverride === null ? null : { ...MOCK_SUPPLIER, ...supplierOverride }

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
  const mockSuppliersSelectQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: supplier, error: null }),
  }

  mockServiceFrom.mockImplementation((table: string) => {
    if (table === 'users') return mockUsersQuery
    if (table === 'stores') return mockStoresQuery
    if (table === 'suppliers') return mockSuppliersSelectQuery
    return {}
  })
}

// ── PATCH /api/suppliers/[id] ─────────────────────────────────────────────────

describe('PATCH /api/suppliers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('PATCH', 'sup-1', { name: '新廠商名' }), {
      params: Promise.resolve({ id: 'sup-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is empty', async () => {
    setupUserStoreAndSupplier()

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('PATCH', 'sup-1', { name: '' }), {
      params: Promise.resolve({ id: 'sup-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when name exceeds 30 chars', async () => {
    setupUserStoreAndSupplier()

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('PATCH', 'sup-1', { name: 'a'.repeat(31) }), {
      params: Promise.resolve({ id: 'sup-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when note exceeds 100 chars', async () => {
    setupUserStoreAndSupplier()

    const { PATCH } = await import('../route')
    const res = await PATCH(
      makeRequest('PATCH', 'sup-1', { name: '廠商A', note: 'n'.repeat(101) }),
      {
        params: Promise.resolve({ id: 'sup-1' }),
      }
    )
    expect(res.status).toBe(400)
  })

  it('returns 403 when supplier belongs to another store', async () => {
    setupUserStoreAndSupplier({ store_id: 'other-store' })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('PATCH', 'sup-1', { name: '新廠商名' }), {
      params: Promise.resolve({ id: 'sup-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('updates supplier and returns 200', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

    const updatedSupplier = { ...MOCK_SUPPLIER, name: '新廠商名', note: '新備註' }

    const updateSingle = vi.fn().mockResolvedValue({ data: updatedSupplier, error: null })
    const updateSelectChain = { select: vi.fn().mockReturnValue({ single: updateSingle }) }
    const updateEqChain = { eq: vi.fn().mockReturnValue(updateSelectChain) }
    const updateFn = vi.fn().mockReturnValue(updateEqChain)

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
      if (table === 'suppliers')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_SUPPLIER, error: null }),
          update: updateFn,
        }
      return {}
    })

    const { PATCH } = await import('../route')
    const res = await PATCH(makeRequest('PATCH', 'sup-1', { name: '新廠商名', note: '新備註' }), {
      params: Promise.resolve({ id: 'sup-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('新廠商名')
  })
})

// ── DELETE /api/suppliers/[id] ────────────────────────────────────────────────

describe('DELETE /api/suppliers/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { DELETE } = await import('../route')
    const res = await DELETE(makeRequest('DELETE', 'sup-1'), {
      params: Promise.resolve({ id: 'sup-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when supplier belongs to another store', async () => {
    setupUserStoreAndSupplier({ store_id: 'other-store' })

    const { DELETE } = await import('../route')
    const res = await DELETE(makeRequest('DELETE', 'sup-1'), {
      params: Promise.resolve({ id: 'sup-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 409 when supplier has associated products', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

    const mockProductsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 'prod-1' }, { id: 'prod-2' }], error: null }),
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
      if (table === 'suppliers')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_SUPPLIER, error: null }),
        }
      if (table === 'products') return mockProductsQuery
      return {}
    })

    const { DELETE } = await import('../route')
    const res = await DELETE(makeRequest('DELETE', 'sup-1'), {
      params: Promise.resolve({ id: 'sup-1' }),
    })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('2')
  })

  it('deletes supplier and returns 200 when no associated products', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

    const deleteSingle = vi.fn().mockResolvedValue({ error: null })
    const deleteEqChain = {
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(deleteSingle) }),
    }
    const deleteFn = vi.fn().mockReturnValue(deleteEqChain)

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
      if (table === 'suppliers')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: MOCK_SUPPLIER, error: null }),
          delete: deleteFn,
        }
      if (table === 'products')
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      return {}
    })

    const { DELETE } = await import('../route')
    const res = await DELETE(makeRequest('DELETE', 'sup-1'), {
      params: Promise.resolve({ id: 'sup-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

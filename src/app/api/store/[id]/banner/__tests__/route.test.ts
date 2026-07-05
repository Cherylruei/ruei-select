// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: vi.fn().mockReturnValue([]), set: vi.fn() }),
}))

const mockServiceFrom = vi.fn()
const mockRhcAuth = { getUser: vi.fn() }
const mockStorageRemove = vi.fn().mockResolvedValue({ data: null, error: null })
const mockStorageUpload = vi.fn().mockResolvedValue({ data: {}, error: null })
const mockStorageGetPublicUrl = vi.fn().mockReturnValue({
  data: { publicUrl: 'https://cdn.example.com/store-banners/store-1/banner-123.jpg' },
})

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
    storage: {
      from: vi.fn(() => ({
        remove: mockStorageRemove,
        upload: mockStorageUpload,
        getPublicUrl: mockStorageGetPublicUrl,
      })),
    },
  })),
  createRouteHandlerClient: vi.fn(async () => ({ auth: mockRhcAuth })),
}))

const MOCK_USER = { id: 'auth-123', email: 'line_U123@internal.rueiselect.local' }
const MOCK_STORE = {
  id: 'store-1',
  owner_id: 'user-1',
  banner_image_url: null as string | null,
}

function setupUserAndStore(store: typeof MOCK_STORE | null = MOCK_STORE) {
  mockRhcAuth.getUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null })

  const mockUsersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
  }
  const mockStoresQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: store, error: null }),
  }
  const updateSingle = vi.fn().mockResolvedValue({ data: store, error: null })
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis() })

  mockServiceFrom.mockImplementation((table: string) => {
    if (table === 'users') return mockUsersQuery
    if (table === 'stores')
      return {
        select: mockStoresQuery.select,
        eq: mockStoresQuery.eq,
        single: mockStoresQuery.single,
        update: updateFn,
      }
    return {}
  })

  return { updateFn, updateSingle }
}

function makeUploadRequest(id: string, file?: File) {
  const formData = new FormData()
  if (file) formData.append('banner', file)
  return new NextRequest(`http://localhost:3000/api/store/${id}/banner`, {
    method: 'POST',
    body: formData,
  })
}

function makeDeleteRequest(id: string) {
  return new NextRequest(`http://localhost:3000/api/store/${id}/banner`, { method: 'DELETE' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/store/[id]/banner', () => {
  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { POST } = await import('../route')
    const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' })
    const res = await POST(makeUploadRequest('store-1', file), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when store belongs to another user', async () => {
    setupUserAndStore({ ...MOCK_STORE, owner_id: 'someone-else' })

    const { POST } = await import('../route')
    const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' })
    const res = await POST(makeUploadRequest('store-1', file), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 when no file provided', async () => {
    setupUserAndStore()

    const { POST } = await import('../route')
    const res = await POST(makeUploadRequest('store-1'), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for unsupported file type', async () => {
    setupUserAndStore()

    const { POST } = await import('../route')
    const file = new File(['x'], 'banner.gif', { type: 'image/gif' })
    const res = await POST(makeUploadRequest('store-1', file), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 when file exceeds 5MB', async () => {
    setupUserAndStore()

    const { POST } = await import('../route')
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'banner.jpg', {
      type: 'image/jpeg',
    })
    const res = await POST(makeUploadRequest('store-1', oversized), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(400)
  })

  it('uploads image, updates store, and returns 200', async () => {
    setupUserAndStore()

    const { POST } = await import('../route')
    const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' })
    const res = await POST(makeUploadRequest('store-1', file), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.banner_image_url).toBe(
      'https://cdn.example.com/store-banners/store-1/banner-123.jpg'
    )
    expect(mockStorageUpload).toHaveBeenCalled()
  })

  it('removes old banner image before uploading new one', async () => {
    setupUserAndStore({
      ...MOCK_STORE,
      banner_image_url: 'https://cdn.example.com/store-banners/store-1/banner-old.jpg',
    })

    const { POST } = await import('../route')
    const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' })
    const res = await POST(makeUploadRequest('store-1', file), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(200)
    expect(mockStorageRemove).toHaveBeenCalledWith(['store-1/banner-old.jpg'])
  })
})

describe('DELETE /api/store/[id]/banner', () => {
  it('returns 401 when not authenticated', async () => {
    mockRhcAuth.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const { DELETE } = await import('../route')
    const res = await DELETE(makeDeleteRequest('store-1'), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when store belongs to another user', async () => {
    setupUserAndStore({ ...MOCK_STORE, owner_id: 'someone-else' })

    const { DELETE } = await import('../route')
    const res = await DELETE(makeDeleteRequest('store-1'), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(403)
  })

  it('clears banner image and returns 200', async () => {
    setupUserAndStore({
      ...MOCK_STORE,
      banner_image_url: 'https://cdn.example.com/store-banners/store-1/banner-old.jpg',
    })

    const { DELETE } = await import('../route')
    const res = await DELETE(makeDeleteRequest('store-1'), {
      params: Promise.resolve({ id: 'store-1' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.banner_image_url).toBeNull()
    expect(mockStorageRemove).toHaveBeenCalledWith(['store-1/banner-old.jpg'])
  })
})

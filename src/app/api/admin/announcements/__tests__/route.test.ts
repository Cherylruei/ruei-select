// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/admin-auth', () => ({
  resolveMerchantStore: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

import { resolveMerchantStore } from '@/lib/admin-auth'
import { createServiceClient } from '@/lib/supabase/server'

const mockResolve = vi.mocked(resolveMerchantStore)
const mockCreateService = vi.mocked(createServiceClient)

const OK_STORE = { ok: true as const, storeId: 'store-1', userId: 'user-1' }

interface DbOptions {
  list?: unknown[]
  owned?: { id: string; store_id: string } | null
  insertId?: string
}

function makeDb({ list = [], owned = null, insertId = 'ann-new' }: DbOptions = {}) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: list, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: owned, error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: insertId }, error: null }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: vi.fn().mockReturnValue(builder) } as any
}

function jsonReq(url: string, method: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/admin/announcements', () => {
  it('未登入商家 → 401', async () => {
    mockResolve.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const { GET } = await import('../route')
    const res = await GET(jsonReq('http://localhost/api/admin/announcements', 'GET'))
    expect(res.status).toBe(401)
  })

  it('商家 → 回傳全部公告 + active_count', async () => {
    mockResolve.mockResolvedValue(OK_STORE)
    const future = new Date(Date.now() + 86400000).toISOString()
    const rows = [
      { id: 'a1', is_active: true, expires_at: null, title: 't1' },
      { id: 'a2', is_active: true, expires_at: future, title: 't2' },
      { id: 'a3', is_active: false, expires_at: null, title: 't3' }, // 未發布
      {
        id: 'a4',
        is_active: true,
        expires_at: new Date(Date.now() - 86400000).toISOString(),
        title: 't4',
      }, // 已到期
    ]
    mockCreateService.mockReturnValue(makeDb({ list: rows }))

    const { GET } = await import('../route')
    const res = await GET(jsonReq('http://localhost/api/admin/announcements', 'GET'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(4)
    expect(json.active_count).toBe(2) // a1, a2
  })
})

describe('POST /api/admin/announcements', () => {
  it('建立公告 → 201', async () => {
    mockResolve.mockResolvedValue(OK_STORE)
    mockCreateService.mockReturnValue(makeDb({ insertId: 'ann-9' }))

    const { POST } = await import('../route')
    const res = await POST(
      jsonReq('http://localhost/api/admin/announcements', 'POST', {
        title: '到貨通知',
        content: '本週商品已到貨',
        type: 'info',
      })
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.id).toBe('ann-9')
  })

  it('缺標題 → 400', async () => {
    mockResolve.mockResolvedValue(OK_STORE)
    mockCreateService.mockReturnValue(makeDb())

    const { POST } = await import('../route')
    const res = await POST(
      jsonReq('http://localhost/api/admin/announcements', 'POST', { content: '內容' })
    )
    expect(res.status).toBe(400)
  })

  it('標題超過 60 字 → 400', async () => {
    mockResolve.mockResolvedValue(OK_STORE)
    mockCreateService.mockReturnValue(makeDb())

    const { POST } = await import('../route')
    const res = await POST(
      jsonReq('http://localhost/api/admin/announcements', 'POST', {
        title: '超'.repeat(61),
        content: '內容',
      })
    )
    expect(res.status).toBe(400)
  })
})

describe('PATCH /api/admin/announcements/[id]', () => {
  it('更新自己賣場的公告 → 200', async () => {
    mockResolve.mockResolvedValue(OK_STORE)
    mockCreateService.mockReturnValue(makeDb({ owned: { id: 'a1', store_id: 'store-1' } }))

    const { PATCH } = await import('../[id]/route')
    const res = await PATCH(
      jsonReq('http://localhost/api/admin/announcements/a1', 'PATCH', { is_active: false }),
      { params: Promise.resolve({ id: 'a1' }) }
    )
    expect(res.status).toBe(200)
  })

  it('公告不屬於此賣場 → 404', async () => {
    mockResolve.mockResolvedValue(OK_STORE)
    mockCreateService.mockReturnValue(makeDb({ owned: { id: 'a1', store_id: 'other-store' } }))

    const { PATCH } = await import('../[id]/route')
    const res = await PATCH(
      jsonReq('http://localhost/api/admin/announcements/a1', 'PATCH', { is_active: false }),
      { params: Promise.resolve({ id: 'a1' }) }
    )
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/admin/announcements/[id]', () => {
  it('刪除自己賣場的公告 → 200', async () => {
    mockResolve.mockResolvedValue(OK_STORE)
    mockCreateService.mockReturnValue(makeDb({ owned: { id: 'a1', store_id: 'store-1' } }))

    const { DELETE } = await import('../[id]/route')
    const res = await DELETE(jsonReq('http://localhost/api/admin/announcements/a1', 'DELETE'), {
      params: Promise.resolve({ id: 'a1' }),
    })
    expect(res.status).toBe(200)
  })

  it('公告不存在 → 404', async () => {
    mockResolve.mockResolvedValue(OK_STORE)
    mockCreateService.mockReturnValue(makeDb({ owned: null }))

    const { DELETE } = await import('../[id]/route')
    const res = await DELETE(jsonReq('http://localhost/api/admin/announcements/a1', 'DELETE'), {
      params: Promise.resolve({ id: 'a1' }),
    })
    expect(res.status).toBe(404)
  })
})

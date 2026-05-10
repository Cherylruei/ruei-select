import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock @supabase/ssr createServerClient
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from '@supabase/ssr'

function makeSupabaseMock(isAuthenticated: boolean) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: isAuthenticated ? { id: 'user-123', email: 'test@example.com' } : null,
        },
        error: null,
      }),
    },
  }
}

function mockNextResponse() {
  const headers = new Map<string, string>()
  return {
    cookies: {
      set: vi.fn(),
    },
    headers: {
      get: (name: string) => headers.get(name) ?? null,
      set: (name: string, value: string) => headers.set(name, value),
    },
  }
}

async function runMiddleware(url: string, isAuthenticated: boolean) {
  vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(isAuthenticated) as never)

  const { proxy: middleware } = await import('../proxy')

  const request = new NextRequest(new URL(url, 'http://localhost:3000'))
  return middleware(request)
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

describe('middleware route protection', () => {
  describe('/admin/* protected routes', () => {
    it('redirects unauthenticated user from /admin to /admin/login', async () => {
      const response = await runMiddleware('/admin', false)
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin/login')
    })

    it('redirects unauthenticated user from /admin/store to /admin/login', async () => {
      const response = await runMiddleware('/admin/store', false)
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin/login')
    })

    it('redirects unauthenticated user from /admin/suppliers to /admin/login', async () => {
      const response = await runMiddleware('/admin/suppliers', false)
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin/login')
    })

    it('allows authenticated user to access /admin', async () => {
      const response = await runMiddleware('/admin', true)
      expect(response.status).not.toBe(307)
    })

    it('allows authenticated user to access /admin/store', async () => {
      const response = await runMiddleware('/admin/store', true)
      expect(response.status).not.toBe(307)
    })
  })

  describe('/admin/login public route', () => {
    it('allows unauthenticated access to /admin/login', async () => {
      const response = await runMiddleware('/admin/login', false)
      expect(response.status).not.toBe(307)
    })

    it('redirects authenticated user from /admin/login to /admin', async () => {
      const response = await runMiddleware('/admin/login', true)
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin')
    })
  })

  describe('/store/[slug]/* protected routes', () => {
    it('redirects unauthenticated user from /store/test-shop to /store/test-shop/login', async () => {
      const response = await runMiddleware('/store/test-shop', false)
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/store/test-shop/login')
    })

    it('redirects unauthenticated user from /store/test-shop/orders to /store/test-shop/login', async () => {
      const response = await runMiddleware('/store/test-shop/orders', false)
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/store/test-shop/login')
    })

    it('allows authenticated user to access /store/test-shop', async () => {
      const response = await runMiddleware('/store/test-shop', true)
      expect(response.status).not.toBe(307)
    })
  })

  describe('/store/[slug]/login public route', () => {
    it('allows unauthenticated access to /store/test-shop/login', async () => {
      const response = await runMiddleware('/store/test-shop/login', false)
      expect(response.status).not.toBe(307)
    })
  })

  describe('unprotected routes', () => {
    it('allows access to /', async () => {
      const response = await runMiddleware('/', false)
      expect(response.status).not.toBe(307)
    })

    it('allows access to /api/auth/line', async () => {
      const response = await runMiddleware('/api/auth/line', false)
      expect(response.status).not.toBe(307)
    })
  })
})

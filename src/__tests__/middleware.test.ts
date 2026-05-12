// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from '@supabase/ssr'
import { authMiddleware as middleware } from '../lib/auth-middleware'

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

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('middleware route protection', () => {
  describe('/admin/* protected routes', () => {
    it('redirects unauthenticated user from /admin to /admin/login', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(false) as never)
      const response = await middleware(makeRequest('/admin'))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin/login')
    })

    it('redirects unauthenticated user from /admin/store to /admin/login', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(false) as never)
      const response = await middleware(makeRequest('/admin/store'))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin/login')
    })

    it('redirects unauthenticated user from /admin/suppliers to /admin/login', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(false) as never)
      const response = await middleware(makeRequest('/admin/suppliers'))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin/login')
    })

    it('allows authenticated user to access /admin', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(true) as never)
      const response = await middleware(makeRequest('/admin'))
      expect(response.status).not.toBe(307)
    })

    it('allows authenticated user to access /admin/store', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(true) as never)
      const response = await middleware(makeRequest('/admin/store'))
      expect(response.status).not.toBe(307)
    })
  })

  describe('/admin/login public route', () => {
    it('allows unauthenticated access to /admin/login', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(false) as never)
      const response = await middleware(makeRequest('/admin/login'))
      expect(response.status).not.toBe(307)
    })

    it('redirects authenticated user from /admin/login to /admin', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(true) as never)
      const response = await middleware(makeRequest('/admin/login'))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/admin')
    })
  })

  describe('/store/[slug]/* protected routes', () => {
    it('redirects unauthenticated user from /store/test-shop to /store/test-shop/login', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(false) as never)
      const response = await middleware(makeRequest('/store/test-shop'))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/store/test-shop/login')
    })

    it('redirects unauthenticated user from /store/test-shop/orders to /store/test-shop/login', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(false) as never)
      const response = await middleware(makeRequest('/store/test-shop/orders'))
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/store/test-shop/login')
    })

    it('allows authenticated user to access /store/test-shop', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(true) as never)
      const response = await middleware(makeRequest('/store/test-shop'))
      expect(response.status).not.toBe(307)
    })
  })

  describe('/store/[slug]/login public route', () => {
    it('allows unauthenticated access to /store/test-shop/login', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(false) as never)
      const response = await middleware(makeRequest('/store/test-shop/login'))
      expect(response.status).not.toBe(307)
    })
  })

  describe('unprotected routes', () => {
    it('allows access to /', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(false) as never)
      const response = await middleware(makeRequest('/'))
      expect(response.status).not.toBe(307)
    })

    it('allows access to /api/auth/line', async () => {
      vi.mocked(createServerClient).mockReturnValue(makeSupabaseMock(false) as never)
      const response = await middleware(makeRequest('/api/auth/line'))
      expect(response.status).not.toBe(307)
    })
  })
})

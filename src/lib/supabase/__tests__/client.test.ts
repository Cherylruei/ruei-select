// @vitest-environment node
import { describe, it, expect } from 'vitest'

describe('Supabase environment variables', () => {
  it('NEXT_PUBLIC_SUPABASE_URL is defined', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).not.toBe('')
  })

  it('NEXT_PUBLIC_SUPABASE_ANON_KEY is defined', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).not.toBe('')
  })

  it('SUPABASE_SERVICE_ROLE_KEY is defined', () => {
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined()
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).not.toBe('')
  })

  it('SUPABASE_SERVICE_ROLE_KEY is not prefixed with NEXT_PUBLIC (must stay server-side)', () => {
    const key = 'SUPABASE_SERVICE_ROLE_KEY'
    expect(key.startsWith('NEXT_PUBLIC')).toBe(false)
  })
})

describe('createBrowserClient', () => {
  it('creates a client without throwing', async () => {
    const { createBrowserClient } = await import('../client')
    expect(() => createBrowserClient()).not.toThrow()
  })

  it('returns an object with from() method (SupabaseClient interface)', async () => {
    const { createBrowserClient } = await import('../client')
    const client = createBrowserClient()
    expect(typeof client.from).toBe('function')
  })
})

describe('createServiceClient', () => {
  it('creates a service client without throwing', async () => {
    const { createServiceClient } = await import('../server')
    expect(() => createServiceClient()).not.toThrow()
  })

  it('returns an object with from() method (SupabaseClient interface)', async () => {
    const { createServiceClient } = await import('../server')
    const client = createServiceClient()
    expect(typeof client.from).toBe('function')
  })
})

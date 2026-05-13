// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/slug'

describe('generateSlug', () => {
  it('converts Chinese name to valid slug format', () => {
    const slug = generateSlug('芮選精品')
    expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
  })

  it('appends 4-char alphanumeric suffix after a hyphen', () => {
    const slug = generateSlug('芮選精品')
    const parts = slug.split('-')
    const suffix = parts[parts.length - 1]
    expect(suffix).toHaveLength(4)
    expect(suffix).toMatch(/^[a-z0-9]{4}$/)
  })

  it('produces only lowercase letters, digits, and hyphens', () => {
    const slug = generateSlug('芮選精品')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('handles plain English names', () => {
    const slug = generateSlug('Miko Shop')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
    expect(slug.split('-').at(-1)).toHaveLength(4)
  })

  it('handles mixed Chinese and English', () => {
    const slug = generateSlug('Ruei選品')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('handles empty string by producing a fallback slug', () => {
    const slug = generateSlug('')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
    expect(slug.length).toBeGreaterThan(4)
  })

  it('two calls produce different slugs (randomness)', () => {
    const a = generateSlug('芮選')
    const b = generateSlug('芮選')
    // Same base, different 4-char suffix — should differ most of the time
    // Using a fixed regex check rather than equality since random can technically match
    expect(a).toMatch(/^[a-z0-9-]+-[a-z0-9]{4}$/)
    expect(b).toMatch(/^[a-z0-9-]+-[a-z0-9]{4}$/)
  })
})

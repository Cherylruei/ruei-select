import { pinyin } from 'pinyin-pro'

function randomAlphanumeric(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export function generateSlug(name: string): string {
  const pinyinStr = pinyin(name, { toneType: 'none', type: 'string', separator: '' })
  const base = (pinyinStr || name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 24)
    .replace(/-$/, '')

  const suffix = randomAlphanumeric(4)
  return base ? `${base}-${suffix}` : `store-${suffix}`
}

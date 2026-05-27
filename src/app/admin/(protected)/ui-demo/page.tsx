import { cookies } from 'next/headers'
import UiDemoClient from './UiDemoClient'

/**
 * Server Component — 從 cookie 讀初始 variant，傳給 Client Component。
 * 這樣 SSR 就帶著正確的 data-variant 渲染，不會有 FOUC。
 */
export default async function UiDemoPage() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('ruei-variant')?.value
  const initialVariant: 'forest' | 'candy' = raw === 'candy' ? 'candy' : 'forest'
  return <UiDemoClient initialVariant={initialVariant} />
}

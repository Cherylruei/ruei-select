// Browser-only LIFF utilities — always lazy-import to avoid SSR issues

export async function initLiff(): Promise<typeof import('@line/liff').default> {
  const liff = (await import('@line/liff')).default
  await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })
  return liff
}

export function isInLineClient(): boolean {
  if (typeof window === 'undefined') return false
  return /Line\//i.test(window.navigator.userAgent)
}

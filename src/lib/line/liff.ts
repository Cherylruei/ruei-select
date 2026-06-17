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

// 登出後導向 redirectTo。
// dev 無真實 LIFF session（使用 dev-mock-token），直接導頁即可；
// prod 才呼叫 liff.logout() 清掉 LINE 登入狀態。
export async function logoutLiff(redirectTo: string): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    try {
      const liff = await initLiff()
      if (liff.isLoggedIn()) liff.logout()
    } catch {
      // 即使 LIFF 失敗仍要導頁，避免卡在原頁
    }
  }
  if (typeof window !== 'undefined') {
    window.location.href = redirectTo
  }
}

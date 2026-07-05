import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// ── mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/lib/line/liff', () => ({
  initLiff: vi.fn().mockResolvedValue({
    isLoggedIn: vi.fn().mockReturnValue(true),
    getAccessToken: vi.fn().mockReturnValue('mock-liff-token'),
    getProfile: vi.fn().mockResolvedValue({ displayName: 'LINE 測試名稱' }),
    login: vi.fn(),
  }),
}))

// ── helpers ────────────────────────────────────────────────────────────────

function mockFetch(data: object, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response)
}

function storeAuth(status: string) {
  return {
    status,
    store: {
      id: 's1',
      name: '芮芮代購',
      avatar_url: null,
      slug: 'test-store',
      line_official_account_url: null,
    },
  }
}

// ── import component after mocks ──────────────────────────────────────────
import JoinClient from '../JoinClient'

beforeEach(() => {
  vi.clearAllMocks()
  // window.location.replace 在 jsdom 未實作導航，改用可監聽的 stub
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: 'http://localhost/store/test-store/join', replace: vi.fn() },
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// ── tests ──────────────────────────────────────────────────────────────────
//
// 回歸測試：dev 與 prod 兩條路徑必須「會員檢查行為一致」。
// 歷史 bug：dev 分支直接顯示申請表單、跳過 approved 檢查，導致已是會員的
// 顧客從 /login 進來仍被丟到 /join 表單。詳見 JoinClient 的 initAndLogin。

describe('JoinClient — 會員狀態導向', () => {
  it('dev 模式 + 已 approved 會員 → 自動導回賣場，不顯示申請表單', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    mockFetch(storeAuth('approved'))

    render(<JoinClient slug='test-store' storeName='芮芮代購' />)

    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledWith('/store/test-store')
    })
    expect(screen.queryByText('申請加入賣場')).not.toBeInTheDocument()
  })

  it('dev 模式 + 非會員（none） → 顯示申請表單，不導向', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    mockFetch(storeAuth('none'))

    render(<JoinClient slug='test-store' storeName='芮芮代購' />)

    await waitFor(() => {
      expect(screen.getByText('申請加入賣場')).toBeInTheDocument()
    })
    expect(window.location.replace).not.toHaveBeenCalled()
  })

  it('prod 模式 + 已 approved 會員 → 一樣自動導回賣場（dev/prod 行為一致）', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    mockFetch(storeAuth('approved'))

    render(<JoinClient slug='test-store' storeName='芮芮代購' />)

    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledWith('/store/test-store')
    })
    expect(screen.queryByText('申請加入賣場')).not.toBeInTheDocument()
  })

  it('prod 模式 + 非會員（none） → 顯示申請表單，不導向', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    mockFetch(storeAuth('none'))

    render(<JoinClient slug='test-store' storeName='芮芮代購' />)

    await waitFor(() => {
      expect(screen.getByText('申請加入賣場')).toBeInTheDocument()
    })
    expect(window.location.replace).not.toHaveBeenCalled()
  })
})

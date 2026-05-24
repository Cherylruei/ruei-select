import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// ── mocks ──────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ slug: 'test-store' }),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

vi.mock('@/lib/line/liff', () => ({
  initLiff: vi.fn().mockResolvedValue({
    isLoggedIn: vi.fn().mockReturnValue(true),
    getAccessToken: vi.fn().mockReturnValue('mock-liff-token'),
    getProfile: vi.fn().mockResolvedValue({
      displayName: 'LINE 測試名稱',
      pictureUrl: 'https://example.com/avatar.png',
    }),
    login: vi.fn(),
  }),
}))

// ── helpers ────────────────────────────────────────────────────────────────

function makeAuthResponse(overrides = {}) {
  return {
    status: 'approved',
    store: {
      id: 'store-1',
      name: '芮選測試賣場',
      avatar_url: null,
      slug: 'test-store',
      line_official_account_url: 'https://line.me/ti/p/@test',
    },
    member: {
      id: 'member-1',
      name: '王小明',
      phone: '0912345678',
      line_id: 'U_test_001',
      applied_at: '2026-03-15T10:00:00Z',
    },
    ...overrides,
  }
}

function mockFetch(data: object, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  } as Response)
}

// ── import component after mocks ──────────────────────────────────────────
import AccountPage from '../page'

beforeEach(() => {
  vi.clearAllMocks()
})

// ── tests ──────────────────────────────────────────────────────────────────

describe('AccountPage', () => {
  it('載入中時顯示骨架畫面', () => {
    // fetch 永遠不 resolve → 保持 loading 狀態
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))

    render(<AccountPage />)

    // 骨架 animate-pulse 元素應存在
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('approved member：顯示 LINE 顯示名稱', async () => {
    mockFetch(makeAuthResponse())
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.getByText('LINE 測試名稱')).toBeInTheDocument()
    })
  })

  it('approved member：顯示姓名', async () => {
    mockFetch(makeAuthResponse())
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.getByText('王小明')).toBeInTheDocument()
    })
  })

  it('approved member：顯示手機號碼', async () => {
    mockFetch(makeAuthResponse())
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.getByText('0912345678')).toBeInTheDocument()
    })
  })

  it('approved member：顯示 LINE ID', async () => {
    mockFetch(makeAuthResponse())
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.getByText('U_test_001')).toBeInTheDocument()
    })
  })

  it('approved member：加入日期格式化為 YYYY/MM/DD', async () => {
    mockFetch(makeAuthResponse())
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.getByText('2026/03/15')).toBeInTheDocument()
    })
  })

  it('phone 為 null 時顯示「未設定」', async () => {
    mockFetch(
      makeAuthResponse({
        member: {
          id: 'member-1',
          name: '李小花',
          phone: null,
          line_id: 'U_x',
          applied_at: '2026-01-01T00:00:00Z',
        },
      })
    )
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.getByText('未設定')).toBeInTheDocument()
    })
  })

  it('有 line_official_account_url 時顯示「聯繫商家」按鈕', async () => {
    mockFetch(makeAuthResponse())
    render(<AccountPage />)

    await waitFor(() => {
      const btn = screen.getByText('聯繫商家')
      expect(btn).toBeInTheDocument()
      expect(btn.closest('a')).toHaveAttribute('href', 'https://line.me/ti/p/@test')
    })
  })

  it('line_official_account_url 為 null 時不顯示「聯繫商家」按鈕', async () => {
    mockFetch(
      makeAuthResponse({
        store: {
          id: 'store-1',
          name: '測試',
          avatar_url: null,
          slug: 'test-store',
          line_official_account_url: null,
        },
      })
    )
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.queryByText('聯繫商家')).not.toBeInTheDocument()
    })
  })

  it('API 回傳非 approved 時顯示錯誤訊息', async () => {
    mockFetch(makeAuthResponse({ status: 'pending', member: undefined }))
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.getByText(/帳戶資料載入失敗/)).toBeInTheDocument()
    })
  })

  it('fetch 失敗時顯示錯誤訊息', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'))
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.getByText(/帳戶資料載入失敗/)).toBeInTheDocument()
    })
  })

  it('有 pictureUrl 時顯示 LINE 頭貼圖片', async () => {
    mockFetch(makeAuthResponse())
    render(<AccountPage />)

    await waitFor(() => {
      const img = screen.getByAltText('LINE 測試名稱')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
    })
  })

  it('無 pictureUrl 時顯示預設頭像（SVG fallback）', async () => {
    const { initLiff } = await import('@/lib/line/liff')
    vi.mocked(initLiff).mockResolvedValueOnce({
      isLoggedIn: vi.fn().mockReturnValue(true),
      getAccessToken: vi.fn().mockReturnValue('mock-token'),
      getProfile: vi.fn().mockResolvedValue({ displayName: '無頭貼用戶', pictureUrl: undefined }),
      login: vi.fn(),
    } as never)

    mockFetch(makeAuthResponse())
    render(<AccountPage />)

    await waitFor(() => {
      expect(screen.getByText('無頭貼用戶')).toBeInTheDocument()
      // pictureUrl 為 undefined → 不應有 img 標籤（改顯示 SVG fallback）
      expect(screen.queryByRole('img', { name: '無頭貼用戶' })).not.toBeInTheDocument()
    })
  })
})

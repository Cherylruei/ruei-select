// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('groq-sdk', () => ({
  default: class MockGroq {
    chat = { completions: { create: mockCreate } }
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.GROQ_API_KEY = 'test-key'
})

// ── Helpers ────────────────────────────────────────────────────────────────────

function groqResponse(text: string) {
  return { choices: [{ message: { content: text } }] }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('optimizeCopywriting', () => {
  it('正確解析 AI 回傳的 JSON 並回傳結構化結果', async () => {
    const mockResult = {
      name: '日系手提包',
      description: '來自日本的高品質手提包，多色可選',
      detectedVariants: [{ dimension: '顏色', options: ['黑', '棕', '米白'] }],
    }
    mockCreate.mockResolvedValue(groqResponse(JSON.stringify(mockResult)))

    const { optimizeCopywriting } = await import('../copywriting')
    const result = await optimizeCopywriting('日系手提包 黑棕米白三色可選 高品質')

    expect(result.name).toBe('日系手提包')
    expect(result.description).toBe('來自日本的高品質手提包，多色可選')
    expect(result.detectedVariants).toHaveLength(1)
    expect(result.detectedVariants[0].dimension).toBe('顏色')
    expect(result.detectedVariants[0].options).toContain('黑')
  })

  it('JSON 前後有 markdown code fence 及多餘文字時仍正確解析', async () => {
    const mockResult = {
      name: '測試商品',
      description: '商品描述',
      detectedVariants: [],
    }
    const withFenceAndTrailing = `以下是優化結果：\n\`\`\`json\n${JSON.stringify(mockResult)}\n\`\`\`\n希望對你有幫助！`
    mockCreate.mockResolvedValue(groqResponse(withFenceAndTrailing))

    const { optimizeCopywriting } = await import('../copywriting')
    const result = await optimizeCopywriting('測試商品文字')

    expect(result.name).toBe('測試商品')
    expect(result.detectedVariants).toEqual([])
  })

  it('JSON 後有多餘文字（無 code fence）時仍正確解析', async () => {
    const mockResult = {
      name: '測試商品2',
      description: '無語言標記描述',
      detectedVariants: [{ dimension: '尺寸', options: ['S', 'M', 'L'] }],
    }
    mockCreate.mockResolvedValue(groqResponse(`${JSON.stringify(mockResult)}\n\n以上為優化建議。`))

    const { optimizeCopywriting } = await import('../copywriting')
    const result = await optimizeCopywriting('測試商品文字')

    expect(result.name).toBe('測試商品2')
    expect(result.detectedVariants[0].options).toContain('M')
  })

  it('AI 未回傳文字時拋出錯誤', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: '' } }] })

    const { optimizeCopywriting } = await import('../copywriting')
    await expect(optimizeCopywriting('商品')).rejects.toThrow('AI 未回傳文字內容')
  })

  it('detectedVariants 缺失時回傳空陣列', async () => {
    mockCreate.mockResolvedValue(
      groqResponse(JSON.stringify({ name: '商品', description: '描述' }))
    )

    const { optimizeCopywriting } = await import('../copywriting')
    const result = await optimizeCopywriting('商品')

    expect(result.detectedVariants).toEqual([])
  })

  it('API 呼叫失敗時拋出錯誤', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limit exceeded'))

    const { optimizeCopywriting } = await import('../copywriting')
    await expect(optimizeCopywriting('商品')).rejects.toThrow('API rate limit exceeded')
  })
})

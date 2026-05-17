import Anthropic from '@anthropic-ai/sdk'
import type { CopywritingResult } from '@/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `你是台灣代購賣場的商品文案優化助手。

規則：
1. 只能使用原文中出現的資訊，絕不添加原文沒有提及的規格或功能
2. 輸出繁體中文，語氣親切、符合台灣代購賣場風格
3. 商品名稱簡潔有力（20字以內）
4. 描述清楚實用，保留重要規格但去除廣告語氣
5. 從文字中偵測規格維度（如顏色、尺寸、口味等）和各維度的選項
6. 輸出必須是嚴格的 JSON 格式，不加任何其他文字

輸出格式：
{
  "name": "商品名稱",
  "description": "優化後的商品描述",
  "detectedVariants": [
    { "dimension": "維度名稱", "options": ["選項1", "選項2"] }
  ]
}`

export async function optimizeCopywriting(originalText: string): Promise<CopywritingResult> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `請優化以下商品文字：\n\n${originalText}` }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('AI 未回傳文字內容')
  }

  const raw = textBlock.text.trim()
  // 去除可能的 markdown code fence
  const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '')
  const result = JSON.parse(jsonStr) as CopywritingResult

  return {
    name: result.name ?? '',
    description: result.description ?? '',
    detectedVariants: Array.isArray(result.detectedVariants) ? result.detectedVariants : [],
  }
}

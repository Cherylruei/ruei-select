import Groq from 'groq-sdk'
import type { CopywritingResult } from '@/types'

function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY 未設定，請在 .env.local 填入 Groq API Key')
  return new Groq({ apiKey })
}

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

export async function optimizeCopywriting(
  originalText: string,
  templateInstruction?: string
): Promise<CopywritingResult> {
  const hasText = originalText.trim().length > 0
  const baseContent = hasText
    ? `請優化以下商品文字：\n\n${originalText}`
    : '請生成一份基本的商品文案範例，包含商品名稱、描述和常見規格維度。'
  const userContent = templateInstruction
    ? `${baseContent}\n\n額外要求：${templateInstruction}`
    : baseContent

  const client = getClient()
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim() ?? ''
  if (!raw) throw new Error('AI 未回傳文字內容')

  // 從回傳內容中提取 JSON 物件（容忍 code fence、前後多餘文字）
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('AI 回傳格式錯誤：找不到 JSON 物件')
  const result = JSON.parse(raw.slice(start, end + 1)) as CopywritingResult

  return {
    name: result.name ?? '',
    description: result.description ?? '',
    detectedVariants: Array.isArray(result.detectedVariants) ? result.detectedVariants : [],
  }
}

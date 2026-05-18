import Groq from 'groq-sdk'
import type { CopywritingResult } from '@/types'

function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY 未設定，請在 .env.local 填入 Groq API Key')
  return new Groq({ apiKey })
}

const SYSTEM_PROMPT = `你是台灣代購賣場的專業商品文案撰寫師。

任務：根據提供的原始商品資訊，撰寫吸引人的台灣代購賣場文案。

規則：
1. 只能使用原文中出現的資訊，絕不添加原文沒有提及的規格或功能
2. 輸出繁體中文
3. 若有提供「風格範本」，description 的整體結構、排版格式、語氣、表情符號密度與使用位置，都必須嚴格模仿該範本——這是最高優先規則
4. 若無風格範本，文案應活潑有感染力，善用表情符號，符合台灣代購賣場的促銷語氣
5. 商品名稱簡潔有力（30字以內）

規格偵測規則（非常重要）：
6. 「規格維度」只能是買家「選哪個」才需要下單的欄位，例如：顏色、尺寸、口味、款式
7. 若原文有「第1款/第2款」或「1. 商品A  2. 商品B」的多品項清單，這些品項就是「款式」維度的選項，請把它們整理進同一個 dimension
8. 「主成分」、「核心邏輯」、「適合對象」、「注意事項」等是商品說明，不是規格維度，一律不放進 detectedVariants
9. 若原文的某個維度（例如款式）有對應的價格，把每個選項的數字售價填入 prices 陣列，順序需與 options 完全對齊；若無價格資訊則省略 prices

輸出格式（嚴格 JSON，不加任何其他文字）：
{
  "name": "商品名稱",
  "description": "依照風格範本撰寫的完整商品文案（保留換行與表情符號）",
  "detectedVariants": [
    { "dimension": "款式", "options": ["選項A", "選項B"], "prices": [350, 450] }
  ]
}`

export async function optimizeCopywriting(
  originalText: string,
  templateInstruction?: string
): Promise<CopywritingResult> {
  const hasText = originalText.trim().length > 0
  const baseContent = hasText
    ? `請依照風格範本，將以下原始商品文字改寫成吸引人的代購文案：\n\n${originalText}`
    : '請生成一份基本的商品文案範例，包含商品名稱、描述和常見規格維度。'
  const userContent = templateInstruction
    ? `【風格範本】請嚴格模仿以下範本的結構、語氣、表情符號用法：\n\n${templateInstruction}\n\n---\n\n【原始商品文字】\n${baseContent}`
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

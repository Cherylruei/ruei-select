import { test, expect } from '@playwright/test'

// 公開商品頁 E2E 測試
// 假設測試資料：賣場 slug=test-store，已開啟 allow_public_products
// 在 CI 環境中可搭配 seed data 或 mock server 使用

const TEST_SLUG = process.env.E2E_TEST_SLUG ?? 'test-store'
const TEST_PRODUCT_ID = process.env.E2E_TEST_PRODUCT_ID ?? 'test-product-id'

test.describe('公開商品列表頁 /p/[slug]', () => {
  test('應顯示賣場資訊與商品卡片', async ({ page }) => {
    const res = await page.goto(`/p/${TEST_SLUG}`)

    // 若賣場不存在或未開啟公開，頁面可能是 404 — 跳過內容驗證
    if (res?.status() === 404) {
      test.skip()
      return
    }

    await expect(page).toHaveTitle(/商品目錄|芮選/)
    // 至少有一個商品卡片或空狀態
    const productCards = page.locator('[data-testid="product-card"], .product-card')
    const emptyState = page.locator('text=尚無公開商品')
    await expect(productCards.or(emptyState)).toBeVisible({ timeout: 10_000 })
  })

  test('底部應有 CTA 申請按鈕', async ({ page }) => {
    const res = await page.goto(`/p/${TEST_SLUG}`)
    if (res?.status() === 404) {
      test.skip()
      return
    }

    const ctaButton = page.locator('button:has-text("申請加入"), a:has-text("申請加入")')
    await expect(ctaButton.first()).toBeVisible({ timeout: 10_000 })
  })

  test('robots meta 應為 index, follow', async ({ page }) => {
    const res = await page.goto(`/p/${TEST_SLUG}`)
    if (res?.status() === 404) {
      test.skip()
      return
    }

    const robots = await page.locator('meta[name="robots"]').getAttribute('content')
    expect(robots).toMatch(/index/i)
  })
})

test.describe('公開商品詳細頁 /p/[slug]/[id]', () => {
  test('應包含 JSON-LD Product schema', async ({ page }) => {
    const res = await page.goto(`/p/${TEST_SLUG}/${TEST_PRODUCT_ID}`)
    if (res?.status() === 404) {
      test.skip()
      return
    }

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
    expect(jsonLd).toBeTruthy()

    const schema = JSON.parse(jsonLd!)
    expect(schema['@type']).toBe('Product')
    expect(schema.name).toBeTruthy()
  })

  test('應顯示「我要下單」按鈕', async ({ page }) => {
    const res = await page.goto(`/p/${TEST_SLUG}/${TEST_PRODUCT_ID}`)
    if (res?.status() === 404) {
      test.skip()
      return
    }

    await expect(page.locator('button:has-text("我要下單")')).toBeVisible({ timeout: 10_000 })
  })

  test('點擊「我要下單」應開啟申請 modal', async ({ page }) => {
    const res = await page.goto(`/p/${TEST_SLUG}/${TEST_PRODUCT_ID}`)
    if (res?.status() === 404) {
      test.skip()
      return
    }

    await page.locator('button:has-text("我要下單")').first().click()
    // Modal Step 1 應顯示 LINE 登入按鈕
    const lineLoginBtn = page.locator('button:has-text("LINE"), button:has-text("登入")')
    await expect(lineLoginBtn.first()).toBeVisible({ timeout: 5_000 })
  })

  test('下架商品應回傳 404', async ({ page }) => {
    // 使用一個明確不存在的 ID 來模擬下架商品的 404 行為
    const res = await page.goto(`/p/${TEST_SLUG}/nonexistent-product-id-12345`)
    expect(res?.status()).toBe(404)
  })
})

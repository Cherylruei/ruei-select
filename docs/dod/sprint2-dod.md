# Sprint 2 — Definition of Done (DoD)

**版本：** v1.0
**建立日期：** 2026-05-16
**Sprint 目標：** 顧客能申請加入賣場；商家能上架商品；公開商品頁讓陌生客透過 SEO/AEO 搜到後可申請加入
**關聯文件：** docs/dor/sprint2-dor.md · docs/sdd/sprint2-delta.md

---

## 全域完成標準（每個 US 都必須符合）

```
□ TypeScript 無 error（npm run type-check 通過）
□ ESLint 無 error（npm run lint 通過）
□ 無 console.log 殘留（production build）
□ 環境變數未 hardcode（全部從 process.env 讀取）
□ 所有 API route 有 try/catch，error 回傳適當的 HTTP status code
□ 所有頁面有 loading 狀態、error 狀態、empty 狀態
□ Mobile 375px 和 Desktop 1280px 皆正常顯示（RWD）
□ 使用 design-tokens.css 的 CSS variables（不使用硬編碼顏色）
□ 單元測試覆蓋率 ≥ 80%（vitest）
□ E2E 測試涵蓋 happy path（playwright）
```

---

## US-6：顧客透過邀請連結申請加入賣場

### 功能完成標準

- [ ] **AC-6.1** `/store/[slug]/join` 頁面存在；未 LIFF 登入時自動觸發 `liff.login()`，授權後回到申請表
- [ ] **AC-6.2** 申請表欄位正確顯示並驗證：
  - 姓名（必填，2–20 字，即時 inline 錯誤）
  - LINE ID（必填，不可空白）
  - 手機號碼（選填，填入時驗證 `09xxxxxxxx` 格式）
  - 自我介紹（選填，100 字上限，即時字數計算）
- [ ] **AC-6.3** 送出後 `store_members` 新增一筆：`status='pending'`、`source='invite_link'`、`referring_product_id=null`
- [ ] **AC-6.4** 送出成功：頁面替換為「申請已送出，商家審核後會通知您」靜態訊息（不跳轉）
- [ ] **AC-6.5** 同顧客重複申請：
  - 已有 pending → 顯示「您的申請正在審核中，請耐心等候」
  - 已 approved → 顯示「您已是本賣場會員」（引導進入賣場的連結留 Sprint 3）
- [ ] **AC-6.6** `slug` 不存在：回傳 404 頁面

### 測試完成標準

```
單元測試（vitest）：
□ POST /api/customers/apply — 邀請連結申請：新增 store_members 成功
□ POST /api/customers/apply — LIFF token 無效：回傳 401
□ POST /api/customers/apply — slug 不存在：回傳 404
□ POST /api/customers/apply — 同顧客重複申請（pending）：回傳 409 { code: 'already_pending' }
□ POST /api/customers/apply — 同顧客已 approved：回傳 409 { code: 'already_approved' }
□ POST /api/customers/apply — 姓名少於 2 字：回傳 400
□ POST /api/customers/apply — 手機格式錯誤（填入時）：回傳 400

E2E 測試（playwright）：
□ Happy path：打開 /store/test-store/join → mock LIFF 登入 → 填表 → 送出 → 看到成功訊息
□ 重複申請（pending）：送出後顯示「申請正在審核中」
□ 必填欄位空白：不能送出，顯示 inline 錯誤
□ 手機格式錯誤：顯示 inline 錯誤
```

### 技術驗收標準

- [ ] middleware 不攔截 `/store/[slug]/join`（此路由公開，LIFF 自己處理登入）
- [ ] LIFF token 在 server 端驗證（`POST /api/customers/apply` 收到 token 後向 LINE 驗證，不信任 client 傳來的 lineId）
- [ ] `store_members` UNIQUE constraint `(store_id, user_id)` 確保 DB 層防重複
- [ ] RLS policy 通過驗證：商家只能讀自己賣場的申請記錄

---

## US-7：商家在後台審核顧客申請

### 功能完成標準

- [ ] **AC-7.1** 「顧客管理」待審核 Tab 顯示所有 `status='pending'` 申請，依 `applied_at` 倒序
- [ ] **AC-7.2** 每筆申請顯示：姓名、手機（空白時顯示「未填寫」）、LINE ID、申請時間、來源 badge
  - 邀請連結：Forest Green badge「邀請連結」
  - 公開申請：Sakura Pink badge「公開申請」+ 商品名稱（referring_product 的 name）
- [ ] **AC-7.3** 點擊「通過」：`status → 'approved'`、`reviewed_at = now()`；該筆從待審核移至會員名單
- [ ] **AC-7.4** 點擊「拒絕」：`status → 'rejected'`、`reviewed_at = now()`；從待審核移除（不進會員名單）
- [ ] **AC-7.5** 審核動作期間按鈕 disabled + loading spinner，防止重複點擊
- [ ] **AC-7.6** 審核成功顯示 Toast；失敗顯示錯誤 Toast
- [ ] **AC-7.7** 「會員名單」Tab 顯示所有 `status='approved'` 顧客，欄位：姓名、手機、LINE ID、加入時間
- [ ] **AC-7.8** 待審核為空：顯示「目前沒有待審核申請」空狀態

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/customers?status=pending — 回傳待審核列表（含 referring_product 名稱）
□ GET /api/customers?status=approved — 回傳會員列表
□ PATCH /api/customers/[id] { action: 'approve' } — 成功通過
□ PATCH /api/customers/[id] { action: 'reject' } — 成功拒絕
□ PATCH /api/customers/[id] — 非此賣場的申請：回傳 403
□ PATCH /api/customers/[id] — 已審核的申請再次操作：回傳 409

E2E 測試（playwright）：
□ Happy path：待審核列表有申請 → 點通過 → 移至會員名單
□ 拒絕：點拒絕 → 從待審核移除
□ 來源 badge：邀請連結申請顯示綠色 badge；公開申請顯示粉色 badge + 商品名稱
□ 空狀態：待審核為空時顯示空狀態
```

### 技術驗收標準

- [ ] referring_product 名稱透過 JOIN 查詢帶出，不做多次獨立查詢
- [ ] RLS policy 確保商家只能審核自己賣場的申請

---

## US-8：商家建立與管理商品

### 功能完成標準

**商品列表**
- [ ] **AC-8.1** `/admin/products` 顯示商品列表：商品縮圖、名稱、廠商、售價範圍、狀態 badge、是否公開 badge
- [ ] **AC-8.2** 廠商篩選下拉、建立時間排序（預設最新在上）
- [ ] **AC-8.3** 列表為空：「尚未新增商品，點擊新增商品開始上架」空狀態

**新增商品**
- [ ] **AC-8.4** 廠商下拉必填（來自 suppliers table）
- [ ] **AC-8.5** 原始商品文 textarea（必填）+ 「AI 優化文案」按鈕
- [ ] **AC-8.6** 點擊 AI 優化：呈現 loading 狀態（按鈕 disabled + spinner）→ 成功後帶入商品名稱與描述，顯示偵測到的規格建議
- [ ] **AC-8.7** Claude API 失敗時：顯示「AI 優化暫時無法使用，請手動填寫」錯誤訊息，不阻擋儲存
- [ ] **AC-8.8** 商品名稱（必填）、描述（選填）可手動修改 AI 帶入的內容
- [ ] **AC-8.9** 儲存成功：Toast「商品已建立」，導回商品列表

**多維度規格**
- [ ] **AC-8.10** 可手動新增規格維度與選項
- [ ] **AC-8.11** AI 偵測到規格時自動預填，商家可新增/刪除/修改
- [ ] **AC-8.12** 每個規格組合獨立顯示：售價（必填）、成本（選填）、成本幣別
- [ ] **AC-8.13** 成本填入後，幣別非 TWD 時即時顯示「今日匯率 {rate}，約 NT$ {amount}」
- [ ] **AC-8.14** 匯率 API 失敗時：顯示「匯率暫時無法取得」，不阻擋儲存

**圖片上傳**
- [ ] **AC-8.15** 支援多張圖片上傳（最多 10 張），可拖曳排序
- [ ] **AC-8.16** 前端壓縮至 1200px 以內、2MB 以下後上傳至 `product-images` bucket
- [ ] **AC-8.17** 上傳中顯示進度 + 防重複點擊

**編輯與下架**
- [ ] **AC-8.18** 編輯頁面預填所有已儲存欄位
- [ ] **AC-8.19** 可將商品狀態切換為「下架」，下架商品不顯示於顧客前台與公開頁
- [ ] **AC-8.20** 下架商品詳細頁 `/p/[slug]/[id]` 回傳 404

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/products — 回傳此賣場的商品列表（含 supplier 名稱）
□ POST /api/products — 成功新增商品（含 variants、images）
□ POST /api/products — 名稱為空：回傳 400
□ POST /api/products — 無廠商：回傳 400
□ PATCH /api/products/[id] — 成功更新
□ PATCH /api/products/[id] — 下架：status → 'inactive'
□ PATCH /api/products/[id] — 其他賣場的商品：回傳 403
□ POST /api/ai/copywriting — 回傳 name、description、detectedVariants
□ POST /api/ai/copywriting — originalText 為空：回傳 400
□ GET /api/exchange-rates?currency=JPY — 今日有快取：直接回傳，不呼叫外部 API
□ GET /api/exchange-rates?currency=JPY — 無快取：呼叫外部 API 並存入 DB

E2E 測試（playwright）：
□ Happy path：新增商品 → 貼原文 → AI 優化 → 確認規格 → 上傳圖片 → 儲存 → 列表出現
□ 無 AI 優化：跳過 AI 直接手動填寫 → 儲存成功
□ 下架：點擊下架 → 商品狀態變為「下架」
□ 編輯：進入編輯頁 → 修改名稱 → 儲存 → 列表更新
□ 匯率換算：選 JPY → 輸入成本 → 即時顯示台幣換算
```

### 技術驗收標準

- [ ] Claude API Key 存於 `ANTHROPIC_API_KEY` 環境變數，不暴露前端
- [ ] `POST /api/ai/copywriting` 只在 server 端呼叫 Claude API（Route Handler，非 Client Component）
- [ ] 匯率快取：同一天第二次呼叫不重複打 ExchangeRate-API（查 DB `fetched_at` 判斷）
- [ ] 圖片刪除舊檔：編輯商品移除圖片時，從 Supabase Storage 刪除對應檔案
- [ ] `products` 和 `product_variants` RLS policy 通過驗證

---

## US-9：商家開啟賣場公開商品功能

### 功能完成標準

- [ ] **AC-9.1** 「賣場設定」頁底部新增「公開商品功能」區塊，toggle 開關（預設關閉）
- [ ] **AC-9.2** toggle 旁有說明文字：「開啟後，設為公開的商品可被 Google 等搜尋引擎索引，陌生客可透過搜尋找到賣場」
- [ ] **AC-9.3** 儲存後 `stores.allow_public_products` 更新
- [ ] **AC-9.4** 賣場關閉此功能時，`/p/[slug]` 回傳 404（即使商品設為 is_public）

### 測試完成標準

```
單元測試（vitest）：
□ PATCH /api/store — allow_public_products: true → 更新成功
□ GET /api/products/public?slug=xxx — allow_public_products=false → 回傳 404
□ GET /api/products/public?slug=xxx — allow_public_products=true → 回傳公開商品列表
```

---

## US-10：公開商品頁（SEO/AEO 可索引）

### 功能完成標準

**公開商品列表頁** `/p/[slug]`
- [ ] **AC-10.1** 顯示所有 `is_public=true` 且 `status='active'` 的商品：縮圖、名稱、售價範圍
- [ ] **AC-10.2** 頁面頂部：賣場頭像 + 賣場名稱
- [ ] **AC-10.3** 底部固定 CTA：「想看更多商品？申請加入 {賣場名稱}」+ 「申請加入」按鈕（觸發 ApplyModal）
- [ ] **AC-10.4** `<meta name="robots" content="index, follow">` 存在
- [ ] **AC-10.5** Open Graph 標籤完整：og:title、og:description、og:image

**公開商品詳細頁** `/p/[slug]/[id]`
- [ ] **AC-10.6** 顯示：商品圖輪播、名稱、描述、規格選擇（含售價）
- [ ] **AC-10.7** 底部「更多公開商品」：最多顯示 4 個同賣場其他公開商品卡片
- [ ] **AC-10.8** 「我要下單」按鈕觸發 ApplyModal
- [ ] **AC-10.9** JSON-LD Product schema 正確插入（`<script type="application/ld+json">`）
- [ ] **AC-10.10** `status='inactive'` 的商品：回傳 404，`<meta name="robots" content="noindex">`
- [ ] **AC-10.11** ISR revalidate = 3600（每小時重新生成）

### 測試完成標準

```
單元測試（vitest）：
□ getPublicProducts(slug) — allow_public_products=true：回傳公開商品
□ getPublicProducts(slug) — allow_public_products=false：回傳空陣列（或 404）
□ getPublicProduct(slug, id) — status='inactive'：回傳 null（觸發 notFound()）

E2E 測試（playwright）：
□ 公開列表頁載入：顯示商品卡片 + 賣場資訊 + 底部 CTA
□ 點擊商品卡片：進入商品詳細頁
□ 商品詳細頁：JSON-LD 存在於 DOM
□ 下架商品詳細頁：回傳 404
□ Lighthouse SEO 分數 ≥ 90（CI 可選）
```

### 技術驗收標準

- [ ] 公開頁路由 `/p/*` 不在 middleware auth 保護範圍內
- [ ] `generateStaticParams` 存在，至多預先生成 100 個賣場
- [ ] `revalidate = 3600` 已設定
- [ ] anon role RLS policy 允許讀取公開商品（`products`、`product_variants`、`product_images`）

---

## US-11：陌生客透過公開商品頁申請加入賣場

### 功能完成標準

- [ ] **AC-11.1** 點擊「我要下單」或「申請加入」→ ApplyModal 開啟（Step 1）
- [ ] **AC-11.2** Step 1：說明文字「申請加入 {賣場名稱} 才能下單」+ LINE 登入按鈕
- [ ] **AC-11.3** LINE LIFF 授權後：modal 切換 Step 2，LINE 顯示名稱自動帶入（不可修改）；申請表與 US-6 相同欄位規則
- [ ] **AC-11.4** 送出後 `store_members` 新增：`source='public_page'`、`referring_product_id={productId}`
- [ ] **AC-11.5** Step 3：「申請已送出，商家審核後會通知您」+ 關閉按鈕
- [ ] **AC-11.6** 已有 pending 申請 → Step 3 顯示「您的申請正在審核中」
- [ ] **AC-11.7** 已 approved → Step 3 顯示「您已是本賣場會員」

### 測試完成標準

```
單元測試（vitest）：
□ POST /api/customers/apply — 公開申請：source='public_page'、referring_product_id 正確存入
□ POST /api/customers/apply — productId 不屬於此賣場：回傳 400

E2E 測試（playwright）：
□ Happy path：公開商品詳細頁 → 點「我要下單」→ mock LIFF 登入 → 填表 → 送出 → Step 3 成功訊息
□ 後台：審核列表出現來源「公開申請」badge + 觸發商品名稱
```

---

## US-12：訂單管理資料模型

### 功能完成標準

- [ ] **AC-12.1** `orders` table 建立完成，含所有欄位、CHECK constraint、RLS
- [ ] **AC-12.2** `order_items` table 建立完成，含所有欄位、CHECK constraint、RLS
- [ ] **AC-12.3** 所有 index 建立完成（見 sprint2-delta.md 第 2.3 節）
- [ ] **AC-12.4** Sprint 2 **不實作任何下單 UI**（無 `/api/orders` endpoint）

### 測試完成標準

```
單元測試（vitest）：
□ migration 驗證：orders table 存在，欄位正確
□ migration 驗證：order_items table 存在，欄位正確
□ RLS 驗證：商家 A 無法讀取商家 B 的訂單
□ RLS 驗證：未登入用戶無法讀取 orders
```

---

## 資料庫完成標準

```
□ 以下 tables 在 Sprint 2 新增完成：
  □ products（含 RLS）
  □ product_variants（含 RLS）
  □ product_images（含 RLS）
  □ exchange_rates（含 RLS）
  □ orders（含 RLS）
  □ order_items（含 RLS）

□ 以下 tables 有 ALTER 新增欄位：
  □ stores.allow_public_products
  □ store_members.source
  □ store_members.referring_product_id
  □ store_members.note

□ 所有新增 table 啟用 RLS
□ anon role 可讀取 is_public=true 的商品（含 variants、images）
□ Migration 檔案：supabase/migrations/0002_sprint2.sql
□ migration SQL 可在乾淨 DB 重新執行成功（冪等性）
□ 所有 index 建立完成
```

---

## Verify 執行清單

Sprint 完成前，Claude Code 必須依序執行並全部通過：

```bash
# 1. 單元測試
npm run test
# → 預期：全部通過，覆蓋率 ≥ 80%

# 2. E2E 測試
npm run test:e2e
# → 預期：所有 happy path 通過

# 3. TypeScript
npm run type-check
# → 預期：0 errors

# 4. ESLint
npm run lint
# → 預期：0 errors, 0 warnings

# 5. Build 確認（含 SSG 公開頁）
npm run build
# → 預期：build 成功，/p/* 路由靜態生成無錯誤

# 6. 產出 UI 截圖（供 Cheryl 視覺驗收）
# □ /store/[slug]/join（申請表頁面）
# □ /admin/customers（待審核 Tab，有資料）
# □ /admin/customers（待審核 Tab，含「公開申請」badge）
# □ /admin/products（商品列表，有資料）
# □ /admin/products/new（新增商品表單）
# □ /admin/products/new（AI 優化後狀態）
# □ /p/[slug]（公開商品列表頁）
# □ /p/[slug]/[id]（公開商品詳細頁）
# □ /p/[slug]/[id]（ApplyModal Step 1）
# □ /p/[slug]/[id]（ApplyModal Step 2，申請表）
```

---

## Sprint 2 完成後的人工驗收流程

Cheryl 親自走過以下流程，無需任何 workaround：

```
商家側：
□ 1. 後台「賣場設定」→ 開啟「公開商品功能」
□ 2. 進入「商品管理」→ 新增商品 → 貼廠商原文 → AI 優化 → 確認規格（含日幣換算）→ 上傳圖片 → 儲存
□ 3. 編輯該商品 → 開啟「設為公開」→ 儲存
□ 4. 確認 /p/{slug} 可看到該商品
□ 5. 確認 /p/{slug}/{id} 商品詳細頁正常顯示
□ 6. 後台「顧客管理」→ 看到兩種來源的待審核申請 → 通過其中一筆 → 移至會員名單

陌生客側：
□ 7. 打開 /p/{slug}/{id} → 點「我要下單」→ LINE 登入 → 填申請表 → 送出 → 看到成功訊息
□ 8. 後台確認出現來源「公開申請」的申請記錄，含商品名稱

邀請連結側：
□ 9. 打開 /store/{slug}/join → LINE 登入 → 填申請表 → 送出 → 看到成功訊息
□ 10. 後台確認出現來源「邀請連結」的申請記錄

SEO 驗收：
□ 11. 在瀏覽器開發工具確認 /p/{slug}/{id} 有 JSON-LD script tag
□ 12. 確認 og:title、og:image 存在於 <head>
```

---

## 不在 DoD 範圍內（Sprint 2 明確排除）

```
✗ 顧客前台商品瀏覽（/store/[slug]/products）→ Sprint 3
✗ 顧客下單 UI → Sprint 3
✗ 審核通過後自動通知顧客（LINE Messaging API）→ Sprint 4
✗ 商家配貨流程 → Sprint 5
✗ 訂單管理 UI → Sprint 3
```

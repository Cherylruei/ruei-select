# Sprint 3 — Definition of Done (DoD)

**版本：** v1.0
**建立日期：** 2026-05-19
**Sprint 目標：** 顧客能登入賣場前台、瀏覽商品、下單，並查詢自己的訂單狀態
**關聯文件：** docs/dor/sprint3-dor.md · docs/sdd/sprint3-delta.md

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

## US-13：顧客前台身份驗證與賣場入口

### 功能完成標準

- [ ] **AC-13.1** `/store/[slug]` 是顧客前台入口；未 LIFF 登入時自動觸發 `liff.login()`，授權後回到原頁面
- [ ] **AC-13.2** LIFF 登入後依 `store_members.status` 決定渲染：
  - `approved` → 顯示商品列表頁內容（US-14）
  - `pending` → 顯示「申請正在審核中，商家審核通過後即可進入賣場」靜態訊息
  - `rejected` / 無記錄 → 顯示「您尚未加入此賣場」+ 「前往申請加入」按鈕（`/store/[slug]/join`）
- [ ] **AC-13.3** `slug` 不存在 → Next.js `notFound()` 回傳 404
- [ ] **AC-13.4** 顧客前台 layout（`/store/[slug]/layout.tsx`）顯示：
  - 頂部：賣場頭像（圓形）+ 賣場名稱
  - 底部固定導覽列：**我的帳戶**（`/store/[slug]/account`）/ **商品**（`/store/[slug]`）/ **我的訂單**（`/store/[slug]/orders`），共三個 tab
  - 目前頁面 active 狀態明確標示（icon + label 均反映 active 色）
- [ ] **AC-13.5** `/store/[slug]/join` 路由不受此 auth guard 影響（公開路由）
- [ ] **AC-13.6** `/store/[slug]/account` 路由顯示顧客帳戶頁（見 US-17）

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/store-auth?slug=xxx — LIFF token 有效 + approved → 200 { member }
□ GET /api/store-auth?slug=xxx — LIFF token 有效 + pending → 200 { status: 'pending' }
□ GET /api/store-auth?slug=xxx — LIFF token 有效 + 無申請記錄 → 200 { status: 'none' }
□ GET /api/store-auth?slug=xxx — LIFF token 無效 → 401
□ GET /api/store-auth?slug=xxx — slug 不存在 → 404

E2E 測試（playwright）：
□ Happy path：打開 /store/test-store → mock LIFF 登入（approved） → 顯示商品列表
□ Pending 狀態：mock LIFF 登入（pending） → 顯示「審核中」頁面
□ 無申請：mock LIFF 登入（無記錄） → 顯示「未加入」+ 申請按鈕
□ 底部導覽：點「我的訂單」→ 跳至 /store/test-store/orders
□ 底部導覽：點「我的帳戶」→ 跳至 /store/test-store/account
□ 底部導覽三個 tab 均可正常切換，active 狀態正確
```

### 技術驗收標準

- [ ] LIFF token 在 server 端驗證（API route 向 LINE 驗證，不信任 client 傳來的 lineId）
- [ ] `store_members` 查詢限定 `store_id = 此賣場 id`（不同賣場的審核狀態不互通）
- [ ] auth guard 邏輯集中於 `/store/[slug]/layout.tsx` 或 dedicated hook，不重複於每個子頁面

---

## US-14：顧客前台商品列表頁

### 功能完成標準

- [ ] **AC-14.1** `/store/[slug]` 顯示該賣場所有 `status = 'active'` 的商品，已登入且 approved 才可見
- [ ] **AC-14.2** 商品卡顯示：商品主圖（product_images 中 sort_order 最小的）、商品名稱、售價範圍（`NT$ {min} ~ {max}` 或單價格）
- [ ] **AC-14.3** 商品依 `category` 分組顯示：有 category 的商品顯示於對應分組；`category` 為 null 或空字串的商品歸入「其他」
- [ ] **AC-14.4** 頂部搜尋欄：輸入關鍵字即時篩選商品名稱（大小寫不分，無需按 Enter 或打 API）
- [ ] **AC-14.5** 點擊商品卡 → 導向 `/store/[slug]/products/[id]`
- [ ] **AC-14.6** 無商品時顯示「賣場商品即將上架，敬請期待」空狀態
- [ ] **AC-14.7** 搜尋無結果時顯示「找不到「{keyword}」相關商品」空狀態

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/store-products?slug=xxx — approved 顧客 → 回傳 active 商品列表（含 images, variants 售價範圍）
□ GET /api/store-products?slug=xxx — pending 顧客 → 回傳 403
□ GET /api/store-products?slug=xxx — 未登入 → 回傳 401
□ GET /api/store-products?slug=xxx — inactive 商品不出現在回傳列表中

E2E 測試（playwright）：
□ Happy path：登入後看到商品列表（至少一個商品分組）
□ 搜尋：輸入商品名稱關鍵字 → 商品列表即時篩選
□ 搜尋無結果：顯示空狀態
□ 點擊商品 → 進入商品詳細頁
```

### 技術驗收標準

- [ ] 商品列表 API 驗證顧客是此賣場的 approved member（不可透過 slug 看到其他賣場商品）
- [ ] 商品列表包含 `product_images` 的第一張圖（JOIN 查詢，不做多次獨立查詢）
- [ ] 商品列表包含 `product_variants` 的最低/最高售價（GROUP BY 計算，不回傳全部 variants）

---

## US-15：顧客前台商品詳細頁與下單

### 功能完成標準

**商品詳細頁**
- [ ] **AC-15.1** `/store/[slug]/products/[id]` 顯示商品圖片輪播（僅 sort_order 排序，支援滑動）、商品名稱、商品描述
- [ ] **AC-15.2** 依 `product_variants` 的 specs 建立規格選擇器：
  - 若所有 variant 的 specs 只有一個維度（如只有顏色）→ 顯示一組選項
  - 若有多個維度 → 每個維度獨立顯示，已選的選項 active 狀態明確
- [ ] **AC-15.3** 規格全部選定後顯示對應 variant 售價；未完全選定時顯示「— —」
- [ ] **AC-15.4** 未選完規格時「立即下單」按鈕 disabled，hover 提示「請先選擇所有規格」
- [ ] **AC-15.5** 數量選擇器：`-` / 數量顯示 / `+`；最小值 1；數字可直接輸入
- [ ] **AC-15.6** 商品 `status = 'inactive'` → `notFound()` 回傳 404
- [ ] **AC-15.7** 商品 id 不屬於此賣場 → 404

**下單確認彈窗**
- [ ] **AC-15.8** 點擊「立即下單」→ 開啟確認彈窗，內容：
  - 商品名稱（截長名至 2 行）
  - 已選規格文字（如「顏色：紅｜尺寸：M」）
  - 數量 × 單價 = 小計（格式：NT$ {amount}）
  - 說明文字：「下單即購買，確認後商家會開始採買此商品。」
- [ ] **AC-15.9** 彈窗有「取消」和「確認下單」按鈕；點「取消」關閉彈窗，不建立訂單

**訂單建立**
- [ ] **AC-15.10** 點「確認下單」→ 按鈕立即 disabled 防重複 → 呼叫 `POST /api/orders`：
  - 建立 `orders`：store_id、member_id（當前顧客）、status = 'pending_purchase'
  - 建立 `order_items`：product_id、variant_id、quantity、unit_price = variant.price
- [ ] **AC-15.11** 下單成功 → 關閉彈窗 → 顯示 Toast「下單成功！」（3 秒自動消失）→ 自動導向 `/store/[slug]/orders`
- [ ] **AC-15.12** 下單失敗 → 顯示錯誤 Toast「下單失敗，請稍後再試」→ 彈窗保持開啟，按鈕重新 enabled

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/store-products/[id]?slug=xxx — 回傳商品詳細（含 variants, images）
□ GET /api/store-products/[id]?slug=xxx — inactive 商品 → 404
□ GET /api/store-products/[id]?slug=xxx — 商品不屬於此賣場 → 404
□ POST /api/orders — 成功：建立 orders + order_items，回傳 201 { orderId }
□ POST /api/orders — variantId 不屬於此商品 → 400
□ POST /api/orders — 顧客非此賣場 approved member → 403
□ POST /api/orders — quantity < 1 → 400
□ POST /api/orders — 未登入 → 401

E2E 測試（playwright）：
□ Happy path：商品詳細頁 → 選規格 → 選數量 → 立即下單 → 確認彈窗顯示正確內容 → 確認 → 成功 Toast → 跳至訂單頁
□ 未選規格：「立即下單」disabled
□ 取消：開啟彈窗 → 點取消 → 彈窗關閉，無訂單建立
□ 下架商品頁：回傳 404
```

### 技術驗收標準

- [ ] `POST /api/orders` 驗證 variant 屬於指定 product，product 屬於指定賣場
- [ ] `POST /api/orders` 使用 DB transaction：orders + order_items 一起建立或一起失敗
- [ ] `unit_price` 在 server 端從 `product_variants.price` 取得，不信任 client 傳來的價格
- [ ] RLS policy 確保顧客只能建立自己的訂單

---

## US-16：顧客訂單查詢

### 功能完成標準

- [ ] **AC-16.1** `/store/[slug]/orders` 顯示當前顧客在此賣場的所有訂單，依 `ordered_at` 倒序
- [ ] **AC-16.2** 每筆訂單顯示：
  - 商品圖（第一張）
  - 商品名稱 + 規格文字
  - 數量 × 單價 = 小計
  - 訂單狀態 badge（依 AC-16.3 顏色）
  - 下單時間（格式：YYYY/MM/DD HH:mm）
- [ ] **AC-16.3** 訂單狀態 badge 文字與顏色（**顧客端顯示 5 種狀態**，由 API 回傳 `displayStatus` 欄位）：

  | DB status（後台） | 顧客端顯示 | 顏色 token |
  |-------------------|------------|------------|
  | pending_purchase, ordered | 已訂購 | `--color-info`（藍） |
  | allocated, settled | 已到貨 | `--color-success`（綠） |
  | shipped | 已出貨 | `--color-success-dark`（深綠） |
  | completed | 已完成 | `--color-neutral`（灰） |
  | cancelled | 已取消 | `--color-danger`（紅） |

- [ ] **AC-16.4** 訂單頁頂部提供下拉式篩選選單，選項：全部 / 已訂購 / 已到貨 / 已出貨 / 已完成 / 已取消；預設「全部」；選擇後即時篩選顯示的訂單列表（client-side filtering，不重新打 API）
- [ ] **AC-16.5** 無訂單時顯示：「目前尚無訂單，快去選購吧！」+ 「去逛商品」按鈕（返回商品列表）

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/orders?storeSlug=xxx — 回傳當前顧客的訂單列表（含 order_items + product 資訊）
□ GET /api/orders?storeSlug=xxx — 不包含其他顧客的訂單（RLS 隔離）
□ GET /api/orders?storeSlug=xxx — 未登入 → 401
□ GET /api/orders?storeSlug=xxx — 顧客非此賣場 approved member → 403

E2E 測試（playwright）：
□ Happy path：下單後導向訂單頁 → 看到剛建立的訂單，顯示狀態「已訂購」
□ 狀態 badge：各 displayStatus 對應正確顏色（以 data-testid 或 class 驗證）
□ 下拉篩選：選「已到貨」→ 只顯示已到貨訂單；選「全部」→ 顯示全部
□ 空狀態：無訂單時顯示空狀態 + 按鈕
□ 點「去逛商品」→ 返回 /store/{slug}
```

### 技術驗收標準

- [ ] 訂單查詢 JOIN `order_items` → `products` → `product_images`（一次查詢取得全部資料）
- [ ] API 回傳 `displayStatus` 欄位（server 端依 DB status 對應顧客顯示文字）
- [ ] 下拉篩選於 client-side 執行，不重複呼叫 API
- [ ] RLS policy 確保顧客只能看到自己的訂單（不可透過修改 query params 看到他人訂單）

---

## US-17：顧客帳戶頁

### 功能完成標準

- [ ] **AC-17.1** `/store/[slug]/account` 顯示顧客的 LINE 個人資料：
  - LINE 大頭照（圓形）
  - 顯示名稱（`liff.getProfile().displayName`）
- [ ] **AC-17.2** 顯示顧客在此賣場的 member 資料：
  - 電話號碼（`store_members.phone`）
  - LINE ID（`store_members.line_id`，若無則顯示「—」）
  - 加入日期（`store_members.created_at`，格式：YYYY/MM/DD）
- [ ] **AC-17.3** 提供「聯絡商家」按鈕（LINE 官方帳號連結，從 `stores.line_official_account_url` 取得；若無則不顯示按鈕）
- [ ] **AC-17.4** 頁面受 auth guard 保護（同 US-13，未登入或非 approved member 不可進入）
- [ ] **AC-17.5** 底部導覽列「我的帳戶」tab 在此頁呈現 active 狀態

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/store-auth?slug=xxx — approved → 回傳包含 member 的 phone / line_id / created_at
□ 帳戶頁元件：正確顯示 LINE 大頭照、顯示名稱、電話、LINE ID、加入日期

E2E 測試（playwright）：
□ 點底部導覽「我的帳戶」→ 跳至帳戶頁，顯示 LINE 名稱
□ 帳戶頁 active tab 正確標示
```

### 技術驗收標準

- [ ] LINE 大頭照和顯示名稱從 `liff.getProfile()` 取得（client-side，不存入 DB）
- [ ] `store_members` 的 phone / line_id / created_at 從 `/api/store-auth` 回傳（已 approved 才有）

---

## 資料庫完成標準

```
□ orders table 新增 RLS policy：
  □ "顧客可新增自己的訂單"（INSERT）
  □ "顧客可讀取自己的訂單"（SELECT）
□ order_items table 新增 RLS policy：
  □ "顧客可新增自己訂單的明細"（INSERT）
  □ "顧客可讀取自己訂單的明細"（SELECT）
□ Migration 檔案：supabase/migrations/0003_sprint3.sql
□ migration SQL 可在乾淨 DB 重新執行成功（冪等性）
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

# 5. Build 確認
npm run build
# → 預期：build 成功，無 error

# 6. 產出 UI 截圖（供 Cheryl 視覺驗收）
# □ /store/{slug}（approved 顧客 — 商品列表，有分組）
# □ /store/{slug}（搜尋有結果）
# □ /store/{slug}（搜尋無結果空狀態）
# □ /store/{slug}（pending 顧客 — 審核中頁面）
# □ /store/{slug}（未加入顧客 — 未加入頁面）
# □ /store/{slug}/products/{id}（商品詳細頁，未選規格）
# □ /store/{slug}/products/{id}（商品詳細頁，已選規格顯示售價）
# □ /store/{slug}/products/{id}（下單確認彈窗）
# □ /store/{slug}/orders（有訂單列表，顯示顧客端 5 種狀態）
# □ /store/{slug}/orders（下拉篩選展開狀態）
# □ /store/{slug}/orders（空狀態）
# □ /store/{slug}/account（帳戶頁，顯示 LINE 大頭照、名稱、電話等）
```

---

## Sprint 3 完成後的人工驗收流程

Cheryl 親自走過以下流程，無需任何 workaround：

```
顧客側（approved 會員）：
□ 1. LINE 開啟 /store/{slug} → 自動登入 → 看到商品列表（含分組）
□ 2. 搜尋框輸入關鍵字 → 商品即時篩選
□ 3. 點擊商品 → 詳細頁顯示圖片輪播、描述、規格選擇
□ 4. 選規格 + 選數量 → 售價顯示 → 立即下單
□ 5. 確認彈窗顯示：商品名、規格、數量 × 售價
□ 6. 確認下單 → Toast「下單成功！」→ 自動跳至訂單頁
□ 7. 訂單頁顯示剛建立的訂單，顧客顯示狀態「已訂購」
□ 8. 訂單頁下拉篩選：切換「已到貨」→ 只顯示已到貨訂單
□ 9. 底部導覽點「我的帳戶」→ 顯示 LINE 大頭照、顯示名稱、電話、加入日期
□ 10. 底部導覽三個 tab（我的帳戶/商品/我的訂單）active 狀態正確切換

顧客側（pending 狀態）：
□ 11. LINE 開啟 /store/{slug} → 看到「申請正在審核中」頁面

顧客側（未加入）：
□ 12. LINE 開啟 /store/{slug} → 看到「未加入」頁面 + 申請按鈕
```

---

## 不在 DoD 範圍內（Sprint 3 明確排除）

```
✗ 顧客結單流程（物流資訊）→ Sprint 4
✗ 商家訂單管理 UI（/admin/orders）→ Sprint 4
✗ LINE Messaging API 通知 → Sprint 4
✗ 商家配貨流程 → Sprint 5
✗ 顧客取消訂單 → Sprint 4
```

# Sprint 1 — Definition of Done (DoD)

**版本：** v1.0
**建立日期：** 2026-05-05
**Sprint 目標：** 商家能夠建立賣場、設定基本資訊、管理供應商、生成顧客邀請連結，並能在後台看到待審核顧客名單框架
**關聯文件：** docs/dor/sprint1-dor.md · docs/sdd/system-sdd.md

---

## 全域完成標準（每個 US 都必須符合）

以下是所有 User Story 共用的完成門檻，不另外在每個 US 重複列出：

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

## US-1：商家以 LINE 登入後台

### 功能完成標準

- [ ] **AC-1.1** `/admin/login` 頁面顯示 LINE 登入按鈕，樣式符合設計稿 `docs/design/admin-login-final.html`
- [ ] **AC-1.2** 點擊按鈕後正確觸發 LINE OAuth 授權流程，callback URL 為 `/admin/login`
- [ ] **AC-1.3** 授權完成後，`POST /api/auth/line` 成功呼叫 LINE Profile API，取得 `displayName` 和 `pictureUrl`
- [ ] **AC-1.4** 首次登入：在 `users` table 建立新記錄（`role = 'merchant'`）
- [ ] **AC-1.5** 再次登入：`users` table upsert（更新 `display_name` 和 `avatar_url`）
- [ ] **AC-1.6** 登入成功後自動 redirect 到 `/admin`
- [ ] **AC-1.7** 已登入狀態重新進入 `/admin/login` → 自動 redirect 到 `/admin`（不顯示登入頁）
- [ ] **AC-1.8** 登入失敗（LINE 授權被拒 / API 錯誤）→ 顯示錯誤提示，提供「重新登入」按鈕
- [ ] **AC-1.9** 在一般瀏覽器（非 LINE 內）可正常使用 LINE Login redirect 方式登入

### 測試完成標準

```
單元測試（vitest）：
□ POST /api/auth/line — 正常流程：收到 code → 回傳 session
□ POST /api/auth/line — code 無效：回傳 401
□ POST /api/auth/line — LINE API 逾時：回傳 503
□ generateSlug() 函數：中文名稱正確轉換為合法 slug
□ generateSlug() 函數：碰撞時重試並產生不同 slug

E2E 測試（playwright）：
□ Happy path：點擊登入 → mock LINE OAuth → 成功進入 /admin
□ 已登入狀態：直接訪問 /admin/login → 自動跳轉 /admin
□ 未登入狀態：直接訪問 /admin → 跳轉 /admin/login
```

### 技術驗收標準

- [ ] `src/middleware.ts` 正確保護 `/admin/*`（未登入跳轉 `/admin/login`）
- [ ] Supabase session cookie 正確設定（httpOnly, secure）
- [ ] `users` table RLS policy 通過驗證（用戶只能讀取自己的資料）
- [ ] LINE Channel Secret 未暴露在前端（只在 server 使用）

---

## US-2：商家建立賣場基本資訊

### 功能完成標準

- [ ] **AC-2.1** 賣場名稱欄位必填，2–30 字，超出限制顯示 inline 錯誤訊息
- [ ] **AC-2.2** 賣場介紹選填，即時顯示已輸入字數（如「45 / 200」）
- [ ] **AC-2.3** 圖片上傳：接受 jpg / png / webp，前端使用 `browser-image-compression` 壓縮至 800px 以內、2MB 以下後再上傳至 Supabase Storage `store-avatars` bucket
- [ ] **AC-2.4** 未上傳頭像：顯示賣場名稱第一個字，背景色為 `--forest-base`（Design System token）
- [ ] **AC-2.5** 儲存成功：顯示 Toast「賣場資訊已更新」，3 秒後自動消失
- [ ] **AC-2.6** 儲存失敗：顯示具體錯誤原因（網路錯誤 / 格式錯誤 / 超出大小限制）
- [ ] **AC-2.7** 頁面載入時自動帶入已儲存的賣場資訊（edit mode）
- [ ] **AC-2.8** 圖片上傳中顯示 loading 狀態，防止重複點擊

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/store — 登入商家取得自己的賣場資訊
□ POST /api/store — 建立新賣場，slug 自動產生
□ PATCH /api/store/[id] — 更新名稱成功
□ PATCH /api/store/[id] — 名稱少於 2 字：回傳 400
□ PATCH /api/store/[id] — 介紹超過 200 字：回傳 400
□ PATCH /api/store/[id] — 其他商家的賣場：回傳 403（RLS 測試）

E2E 測試（playwright）：
□ Happy path：填入名稱 + 介紹 → 儲存 → Toast 顯示 → 重新整理後資料保留
□ 圖片上傳：選擇圖片 → 上傳成功 → 預覽更新
□ 空名稱送出：顯示 inline 錯誤，不送出 API
```

### 技術驗收標準

- [ ] Supabase Storage `store-avatars` bucket 已建立（public read）
- [ ] 圖片 URL 存入 `stores.avatar_url`（Supabase Storage 公開 URL）
- [ ] `stores` table RLS policy 通過驗證：商家只能讀/改自己的賣場
- [ ] 舊頭像上傳新頭像時，舊檔案從 Storage 刪除（避免孤立檔案）

---

## US-3：商家建立供應商資訊

### 功能完成標準

- [ ] **AC-3.1** 新增供應商表單：名稱必填（1–30 字），備註選填（上限 100 字）
- [ ] **AC-3.2** 編輯：點擊供應商項目展開 inline 編輯，儲存後即時更新列表
- [ ] **AC-3.3** 刪除：點擊刪除按鈕跳出確認 Modal（「確定刪除廠商「{name}」？此動作無法復原。」）
- [ ] **AC-3.4** 有關聯商品時阻止刪除：回傳 409，顯示「此廠商有 {n} 件商品，請先移除商品再刪除廠商」
- [ ] **AC-3.5** 供應商列表依 `created_at` 倒序排列（最新在上方）
- [ ] **AC-3.6** 列表為空時：顯示空狀態圖示 + 文字「尚未新增廠商，點擊上方按鈕新增」

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/suppliers — 回傳目前賣場的供應商列表（倒序）
□ POST /api/suppliers — 成功新增
□ POST /api/suppliers — 名稱為空：回傳 400
□ POST /api/suppliers — 名稱超過 30 字：回傳 400
□ PATCH /api/suppliers/[id] — 成功更新
□ DELETE /api/suppliers/[id] — 無關聯商品：成功刪除
□ DELETE /api/suppliers/[id] — 有關聯商品：回傳 409
□ DELETE /api/suppliers/[id] — 其他賣場的供應商：回傳 403（RLS 測試）

E2E 測試（playwright）：
□ Happy path：新增廠商 → 列表出現 → 編輯名稱 → 刪除（確認 modal → 確定）
□ 空狀態：列表為空時顯示空狀態
□ 刪除確認：點取消 → 供應商未刪除
```

### 技術驗收標準

- [ ] `suppliers` table RLS policy 通過驗證：只有賣場 owner 可以操作
- [ ] DELETE 時先查詢 `products` table 確認無關聯（查詢用 `service_role` 或在 server 端執行）

---

## US-4：商家生成顧客邀請連結

### 功能完成標準

- [ ] **AC-4.1** 賣場建立時自動產生 `slug`（格式：賣場名稱拼音 + `-` + 4 碼隨機英數）
- [ ] **AC-4.2** 邀請連結顯示為完整 URL（`{NEXT_PUBLIC_APP_URL}/store/{slug}`）
- [ ] **AC-4.3** 一鍵複製按鈕：複製後顯示「已複製 ✓」，2 秒後恢復原文字
- [ ] **AC-4.4** 重新產生連結：顯示確認 Modal（「舊連結將立即失效，使用舊連結的顧客將需要重新點擊新連結。確定重新產生？」）→ 確認後更新 `invite_token`
- [ ] **AC-4.5** `/store/{slug}/login` 靜態佔位頁已建立（Sprint 3 前只顯示「賣場建置中」或基本登入框架）

### 測試完成標準

```
單元測試（vitest）：
□ generateSlug('芮選精品') → 符合格式（拼音-英數）
□ generateSlug() → 產生的 slug 全部小寫、只含英數和 -
□ POST /api/store/[id]/invite-token — 成功更新 invite_token
□ POST /api/store/[id]/invite-token — 非 owner 呼叫：回傳 403

E2E 測試（playwright）：
□ Happy path：進入賣場設定 → 看到邀請連結 → 點擊複製 → 按鈕文字變為「已複製 ✓」
□ 重新產生：點擊重新產生 → Modal 出現 → 確認 → 連結更新
□ 重新產生：點擊取消 → 連結不變
```

### 技術驗收標準

- [ ] `slug` 和 `invite_token` 都有 UNIQUE constraint（DB 層保證）
- [ ] slug 碰撞時有重試機制（最多 3 次，仍碰撞則回傳 500）
- [ ] Clipboard API 使用 `navigator.clipboard.writeText()`，無 HTTPS 時 fallback 到 `document.execCommand('copy')`

---

## US-5：商家後台顧客審核名單框架

### 功能完成標準

- [ ] **AC-5.1** 後台 Sidebar 有「顧客管理」導覽項目，點擊進入 `/admin/customers`
- [ ] **AC-5.2** 頁面頂部有兩個 Tab：「待審核」和「會員名單」
- [ ] **AC-5.3** 兩個 Tab 皆顯示正確空狀態：
  - 待審核 Tab：「目前沒有待審核申請」
  - 會員名單 Tab：「尚未有會員，分享邀請連結讓顧客申請加入」
- [ ] **AC-5.4** `store_members` table 已在 DB 建立，包含所有欄位和 RLS policy

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/customers?status=pending — 回傳空陣列（無資料時）
□ GET /api/customers?status=approved — 回傳空陣列（無資料時）
□ GET /api/customers — 非商家身份呼叫：回傳 403

E2E 測試（playwright）：
□ 進入顧客管理頁面 → 看到兩個 Tab → 切換 Tab → 空狀態正確顯示
```

### 技術驗收標準

- [ ] `store_members` table 建立完成，含 UNIQUE constraint `(store_id, user_id)`
- [ ] RLS policy 通過驗證：商家只能看自己賣場的申請記錄
- [ ] Tab 切換時 URL query string 更新（`?tab=pending` / `?tab=approved`），支援直接連結

---

## 資料庫完成標準（所有 US 共用）

```
□ 以下 tables 在 Supabase 建立完成：
  □ users
  □ stores
  □ suppliers
  □ store_members
  □ customer_shipping_profiles（Sprint 4 使用，但 Sprint 1 先建）
  □ exchange_rates（Sprint 2 使用，但 Sprint 1 先建）

□ 所有 tables 啟用 RLS（ALTER TABLE ... ENABLE ROW LEVEL SECURITY）

□ 所有 RLS policies 建立完成並通過以下驗證測試：
  □ 商家 A 無法讀取商家 B 的賣場資料
  □ 商家 A 無法讀取商家 B 的供應商資料
  □ 未登入用戶無法存取任何 table

□ Migration 檔案存在：supabase/migrations/0001_initial.sql
□ migration SQL 可以在乾淨的 DB 重新執行成功（冪等性）

□ 所有 Indexes 建立完成（參考 system-sdd.md 第 4.1 節）
```

---

## 後台 UI 框架完成標準

```
□ /admin/layout.tsx：Sidebar 導覽列包含以下項目：
  □ 賣場設定（/admin/store）
  □ 供應商管理（/admin/suppliers）
  □ 顧客管理（/admin/customers）
  □ 商品管理（/admin/products）← 連結存在但功能 Sprint 2 實作
  □ 訂單管理（/admin/orders）← 連結存在但功能 Sprint 3 實作
  □ 登出按鈕

□ 目前登入的商家名稱和頭像顯示在 Sidebar 頂部
□ 目前所在頁面的導覽項目有 active 樣式
□ Mobile 版 Sidebar 收合為 Hamburger menu
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
# → 預期：build 成功，無任何 error

# 6. 產出 UI 截圖（供 Cheryl 視覺驗收）
# 以下頁面各截一張：
# □ /admin/login
# □ /admin（Dashboard）
# □ /admin/store
# □ /admin/suppliers（有資料狀態）
# □ /admin/suppliers（空狀態）
# □ /admin/customers（待審核 Tab）
# □ /admin/customers（會員名單 Tab）
```

---

## Sprint 1 完成後的人工驗收流程

Cheryl 親自走過以下流程，無需任何 workaround：

```
□ 1. 打開 https://ruei-select.vercel.app/admin/login
□ 2. 點擊「使用 LINE 登入」→ LINE 授權 → 成功進入後台
□ 3. Sidebar 正常顯示，所有導覽項目可以點擊
□ 4. 進入「賣場設定」→ 填寫賣場名稱 + 介紹 → 上傳頭像 → 儲存 → Toast 出現
□ 5. 重新整理頁面 → 資料保留
□ 6. 進入「供應商管理」→ 新增 2 個供應商 → 編輯其中一個 → 刪除另一個（確認 Modal）
□ 7. 回到「賣場設定」→ 複製邀請連結 → 在新分頁貼上 → 看到佔位頁面
□ 8. 點擊「重新產生連結」→ 確認 → 連結更新
□ 9. 進入「顧客管理」→ 看到兩個 Tab → 兩個 Tab 都顯示空狀態
□ 10. 關閉瀏覽器 → 重新打開後台網址 → 自動登入，不需要重新點擊 LINE 登入
```

全部 ✓ 後，Claude Code 產出 `docs/sprint-retro/sprint1-retro.md` 草稿。

---

## 不在 DoD 範圍內（Sprint 1 明確排除）

以下項目**不列入**本 Sprint 完成標準：

```
✗ 顧客前台任何功能
✗ 商品上架
✗ 訂單管理
✗ 匯率換算
✗ AI 文案優化
✗ LINE 推播通知
✗ 數據分析 Dashboard
✗ 商家審核顧客的實際操作（只建框架）
```

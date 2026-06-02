# Sprint 5 — Definition of Done (DoD)

**版本：** v0.1 草稿
**建立日期：** 2026-06-02
**Sprint 目標：** 訂單後台 UX 升級、商品詳細頁重建、規格庫存管理、許願池、快速上架、Banner + 公告管理
**關聯文件：** docs/dor/sprint5-dor.md · docs/sdd/sprint5-delta.md

> ⚠️ 本文件為草稿。帶有「（草稿，待 Cheryl 確認）」標記的 US，需在開發前逐一確認 AC。
> Sprint 5 正式開始前，Cheryl 確認後將 ⚠️ 標記移除並更新版本號。

---

## 全域完成標準（每個 US 都必須符合）

```
□ TypeScript 無 error（npm run type-check 通過）
□ ESLint 無 error（npm run lint 通過）
□ 無 console.log 殘留（production build）
□ 環境變數未 hardcode（全部從 process.env 讀取）
□ 所有 API route 有 try/catch，error 回傳適當的 HTTP status code
□ 所有頁面有 loading 狀態、error 狀態、empty 狀態
□ Mobile 375px 正常顯示（前台以 420px 為基準）
□ 使用 design-tokens.css 的 CSS variables（不使用硬編碼顏色）
□ 單元測試覆蓋率 ≥ 80%（vitest）
□ E2E 測試涵蓋 happy path（playwright）
```

---

## US-NEW：前台商品詳細頁重建

### 功能完成標準

**頁面整體結構**

- [ ] **AC-PD1** 移除現有 desktop dual-column layout，改為 mobile-first 單欄；桌面以最大寬 420px 置中顯示
- [ ] **AC-PD2** 移除愛心收藏按鈕（已完成 2026-06-02）

**浮動頂部導航**

- [ ] **AC-PD3** 頂部浮動導航列（`bg-white/90 backdrop-blur`），左側返回 pill 按鈕、右側分享 pill 按鈕
- [ ] **AC-PD4** 分享按鈕呼叫 `navigator.share`；不支援時靜默不處理

**圖片輪播**

- [ ] **AC-PD5** 全寬 scroll-snap 輪播，支援滑動切換；無左右箭頭
- [ ] **AC-PD6** 輪播右下角顯示「{目前}/{總張數}」計數器
- [ ] **AC-PD7** dot 指示器於輪播底部置中，當前 dot 拉長 18px，其餘 6px
- [ ] **AC-PD8** 無圖片時顯示 placeholder 漸層

**商品資訊**

- [ ] **AC-PD9** 標題區：分類 pill → 商品名稱 → 描述（預設展開）→ 售價
- [ ] **AC-PD10** 售價頁面載入後即顯示（區間顯示；選定規格後更新為單一價格）

**購買狀態提示**

- [ ] **AC-PD11** 預購狀態卡片（橘色系）顯示「預購商品 · PRE-ORDER badge + 說明文字」
- [ ] **AC-PD12** 此區塊為 US-NEW-INV 完成後替換的佔位（Sprint 5 庫存 US 完成前先固定顯示預購樣式）

**數量選擇器**

- [ ] **AC-PD13** 數量選擇器改為 pill 按鈕：「-」白底強邊框，「+」primary 色 shadow-pink
- [ ] **AC-PD14** 數量下限 1（disabled 時「-」按鈕），上限 99

**資訊列卡片**

- [ ] **AC-PD15** `bg-surface card-line` 卡片包含兩列 info row（驗貨保證 / 下單即購買）

**你可能還會喜歡**

- [ ] **AC-PD16** 同賣場隨機最多 4 件其他商品（排除當前商品，`status = 'active'`）
- [ ] **AC-PD17** 2×2 grid，卡片樣式與 ProductCard 一致，點擊跳至商品詳細頁
- [ ] **AC-PD18** 無其他商品時省略此區塊
- [ ] **AC-PD19** 相關商品由擴充後的 `GET /api/store-products?exclude=&limit=4` 取得

**許願池引導卡**

- [ ] **AC-PD20** 相關商品下方顯示許願池 nudge 卡片，連結至 `/store/{slug}/wishlist`

**固定底部 CTA**

- [ ] **AC-PD21** 底部列「立即下單 · NT$ {價格}」；未選規格時不顯示價格
- [ ] **AC-PD22** 有規格未選時按鈕 disabled + 提示文字

**下單確認 Bottom Sheet**

- [ ] **AC-PD23** 點擊「立即下單」開啟 bottom sheet（translateY 動畫），取代置中 Modal
- [ ] **AC-PD24** Bottom sheet 頂部拖曳把手；點擊把手或遮罩可關閉
- [ ] **AC-PD25** Sheet 內容：商品摘要 → 價格明細（單價 / 數量 / 小計）→「確認下單」按鈕
- [ ] **AC-PD26** 下單成功顯示 success overlay（✓ icon + 說明 + 「繼續逛」/ 「看訂單」CTA）

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/store-products?slug=X&exclude=Y&limit=4 — 回傳排除指定商品的相關商品，上限 4 件
□ GET /api/store-products?slug=X&exclude=Y&limit=4 — 無其他商品時回傳空陣列
□ POST /api/orders — 現有下單邏輯不受頁面重建影響

E2E 測試（playwright）：
□ 進入商品詳細頁 → 輪播顯示，滑動切換 counter 更新
□ 有規格：未選規格 → disabled → 選規格 → enabled，底部顯示價格
□ 無規格：直接點「立即下單」→ bottom sheet 開啟
□ Bottom sheet 確認下單 → success overlay 出現 → 點「看訂單」導至 /store/{slug}/orders
□ 「你可能還會喜歡」顯示最多 4 件同賣場其他商品
□ 許願池 nudge 點擊導至 /store/{slug}/wishlist
```

### 技術驗收標準

- [ ] 下單 API 邏輯不變，僅改前端頁面結構
- [ ] `GET /api/store-products` 擴充 `exclude`/`limit` 為可選參數，不影響現有呼叫方
- [ ] Bottom sheet 使用純 CSS `translateY` animation，不引入新動畫 library

---

## US-NEW：規格庫存管理（現貨 / 預購雙模式）

> ℹ️ 2026-06-02 Cheryl 確認。此 US 依賴「前台商品詳細頁重建」完成後再執行（庫存 UI 疊加在重建好的頁面上）。

### 功能完成標準

**資料與防超賣**

- [ ] **AC-INV1** `stock_qty = NULL` 的規格維持預購行為，可無限下單
- [ ] **AC-INV2** 下單時 `stock_qty IS NOT NULL`，呼叫 Supabase RPC 原子操作扣減，防並發超賣
- [ ] **AC-INV3** `stock_qty < quantity` 時 API 回傳 `{ error: '庫存不足' }`，前台顯示提示
- [ ] **AC-INV4** migration 新增 `stock_qty` 欄位，原有資料預設 `NULL`

**商家後台 — 規格編輯**

- [ ] **AC-INV5** 每個規格新增「預購 / 現貨」切換：預購不填庫存；現貨填整數（≥ 0，必填）
- [ ] **AC-INV6** 切回預購 → `stock_qty = NULL`；填數字 → 現貨模式
- [ ] **AC-INV7** 商品列表顯示規格庫存狀態（有 N 件 / 售完）
- [ ] **AC-INV8** 商家可在規格編輯頁直接調整庫存數量（補貨更新）

**顧客前台 — 商品詳情頁**

- [ ] **AC-INV9** `stock_qty = 0` 的規格顯示「售完」badge，disabled，無法選取
- [ ] **AC-INV10** 輸入數量超過 `stock_qty` 時自動 cap 並提示「最多 N 件」
- [ ] **AC-INV11** 預購規格旁顯示「預購」label；現貨 ≤ 5 件時顯示「剩 N 件」

**庫存歸還（簡化版）**

- [ ] **AC-INV12** 本 Sprint 不實作取消自動回補庫存
- [ ] **AC-INV13** 商家手動在規格編輯頁調整庫存數量

### 測試完成標準

```
單元測試（vitest）：
□ decrement_stock RPC — 庫存充足：成功扣減，回傳剩餘數量
□ decrement_stock RPC — 庫存不足：rollback，回傳 error
□ decrement_stock RPC — stock_qty = NULL：不執行 RPC，走原本下單流程
□ PATCH /api/admin/products/[id]/variants/[vid] — 更新 stock_qty = 0 → 現貨售完
□ PATCH /api/admin/products/[id]/variants/[vid] — 更新 stock_qty = NULL → 切回預購
□ GET /api/store-products/[id] — 回傳規格 stock_qty，讓前台顯示售完 / 剩 N 件

E2E 測試（playwright）：
□ 商品有現貨規格：選取售完規格 → disabled，無法加入
□ 商品有現貨規格：選取有庫存規格 → 可下單
□ 數量超過庫存 → 自動 cap，顯示「最多 N 件」提示
□ 商家後台規格編輯：切換預購/現貨，填入/清空庫存數量
```

### 技術驗收標準

- [ ] 庫存扣減使用 Supabase RPC（`SELECT decrement_stock(variant_id, qty)`），非直接 UPDATE
- [ ] RPC 函式使用 `FOR UPDATE` row-level lock 防超賣
- [ ] `stock_qty` migration 使用 `IF NOT EXISTS` + `DEFAULT NULL`，冪等安全

---

## US-NEW：訂單管理 UX 升級（B-Light + 批次操作 + AC-18.12）

### 功能完成標準

**AC-18.12：顧客訂單展開（從 Sprint 4 移入）**

- [ ] **AC-18.12a** 已配單 Tab「依顧客分組」視圖中，CustomerCard 可點擊展開，inline 顯示該顧客所有訂單
- [ ] **AC-18.12b** 展開後顯示：`allocated` 訂單前有 checkbox；其他狀態訂單灰色呈現
- [ ] **AC-18.12c** 勾選一筆 allocated 訂單 → 底部顯示「代客結單」按鈕，點擊導至 `/admin/orders/{id}/checkout`
- [ ] **AC-18.12d** 未到貨訂單（pending_purchase / ordered）的 checkbox disabled

**B-Light：依商品分組視圖**

- [ ] **AC-B1** 待採買 Tab 新增「依商品分組」切換（預設為訂單列表視圖）
- [ ] **AC-B2** 依商品分組視圖：供應商 → 商品 → 訂購顧客清單（姓名 + 數量），每組顯示總需求量
- [ ] **AC-B3** 每個商品群組提供「全部標記已訂購」（或部分勾選），批次 `status → ordered`
- [ ] **AC-B4** 已訂購 Tab 同樣提供分組視圖，每組「全部標記已配單」
- [ ] **AC-B5** 批次更新成功顯示 Toast「已更新 N 筆訂單為已訂購/已配單」

**批次勾選出貨**

- [ ] **AC-B6** 已結單 Tab 每列訂單前加 checkbox，可多選
- [ ] **AC-B7** 有勾選時底部浮現 batch action bar「已選 N 筆 [ 確認出貨 ] [ 取消選取 ]」
- [ ] **AC-B8** 批次出貨：共用一組物流商 + 單號，批次更新 `status → shipped`
- [ ] **AC-B9** 新增 `PATCH /api/admin/orders/batch` endpoint 支援批次狀態更新

**已出貨自動完成（14 天）**

- [ ] **AC-B10** `shipped` 超過 14 天的訂單自動更新為 `completed`
- [ ] **AC-B11** 實作方式：Supabase Edge Function cron job（或每次訂單列表載入時 lazy check）

### 測試完成標準

```
單元測試（vitest）：
□ PATCH /api/admin/orders/batch — 合法批次 pending_purchase → ordered → 200，affected count 回傳
□ PATCH /api/admin/orders/batch — 含非法 transition 的訂單 → 400，說明哪些 ID 失敗
□ PATCH /api/admin/orders/batch — 含不屬於此賣場的 orderId → 403
□ PATCH /api/admin/orders/batch — 空 orderIds 陣列 → 400

E2E 測試（playwright）：
□ 待採買 Tab 切換「依商品分組」→ 看到商品群組 + 顧客需求清單
□ 商品群組點「全部標記已訂購」→ Toast 成功，切換已訂購 Tab 訂單狀態更新
□ 已結單 Tab 多選訂單 → batch action bar 出現 → 批次出貨 → Toast 成功
□ 已配單依顧客分組：點顧客卡展開 → 看到全部訂單 → 勾選 allocated 訂單 → 點「代客結單」→ 導至 checkout
```

### 技術驗收標準

- [ ] 批次狀態更新在 server 端驗證每筆 transition 合法性，不允許跳轉
- [ ] 批次操作使用 transaction，任一筆失敗則全部 rollback
- [ ] AC-B10 自動完成：Edge Function 或 lazy check，不在前端 client 端執行時間判斷

---

## US-NEW：顧客管理頁重設計

> ⚠️ AC 草稿，待 Cheryl 提供 mockup 確認後開發。參考設計：`docs/design/mockups/admin-customers.html`

### 功能完成標準

- [ ] **AC-C1** 待審核 Tab 使用設計系統卡片元件，顯示顧客姓名、LINE ID、申請時間、邀請來源
- [ ] **AC-C2** 待審核卡片提供「通過」/「拒絕」按鈕，樣式符合 forest 主題
- [ ] **AC-C3** 會員名單使用 design token 表格，欄位：姓名、手機、LINE ID、加入時間
- [ ] **AC-C4** 兩個 Tab 樣式與訂單管理、商品管理保持一致

### 測試完成標準

```
E2E 測試（playwright）：
□ 顧客管理頁載入 → 待審核 / 會員名單 Tab 正常顯示
□ 通過審核：點「通過」→ 顧客移至會員名單 Tab
□ 拒絕審核：點「拒絕」→ 顧客從待審核列表消失
```

### 技術驗收標準

- [ ] 現有審核 API 邏輯不變，僅改 UI 樣式
- [ ] 使用設計系統 `Card`、`Badge`、`Button` 等共用元件

---

## US-22：顧客許願池

> AC 完整版參見 docs/dor/sprint4-dor.md US-22（AC-22.1～22.7）。

### 功能完成標準

- [ ] **AC-22.1** 底部導覽列新增第四個 Tab「許願池」（順序：商品 / 我的訂單 / 許願池 / 我的帳戶）
- [ ] **AC-22.2** `/store/{slug}/wishlist` 顯示顧客在此賣場的許願清單，依送出時間倒序
- [ ] **AC-22.3** 每筆許願顯示：商品照片 thumbnail、商品名稱、型號（若有填）、狀態 badge（待處理 / 已注意 / 已上架）
- [ ] **AC-22.4** 右下角浮動「＋ 許願」按鈕
- [ ] **AC-22.5** 許願表單：商品名稱（必填）、照片（必填，上傳至 `wishlist-images` bucket）、商品連結（選填，URL 驗證）、型號（選填）
- [ ] **AC-22.6** 送出 → `wishlists` 新增一筆（`status = 'pending'`）→ Toast「許願已送出，等待商家確認」
- [ ] **AC-22.7** 無許願時顯示空狀態 + 送出按鈕

### 測試完成標準

```
單元測試（vitest）：
□ POST /api/store/[slug]/wishlist — approved 顧客 → 201，wishlists 新增一筆
□ POST /api/store/[slug]/wishlist — 未填必填欄位 → 400
□ POST /api/store/[slug]/wishlist — 非 approved member → 403
□ POST /api/store/[slug]/wishlist — product_url 格式錯誤 → 400
□ GET /api/store/[slug]/wishlist — 只回傳此顧客在此賣場的許願

E2E 測試（playwright）：
□ 點底部「許願池」Tab → 空狀態 → 點「＋ 許願」→ 填商品名 + 上傳照片 → 送出 → Toast 成功
□ 許願清單出現新許願（待處理 badge）
□ 商品連結格式錯誤 → 顯示 URL 格式驗證提示
```

### 技術驗收標準

- [ ] 圖片上傳至 `wishlist-images` Supabase Storage bucket（RLS 允許顧客上傳自己路徑下的圖片）
- [ ] `product_url` 在 server 端驗證 URL 格式

---

## US-23：許願池後台（商家）

> AC 完整版參見 docs/dor/sprint4-dor.md US-23（AC-23.1～23.5）。

### 功能完成標準

- [ ] **AC-23.1** 後台側邊欄新增「許願池」→ `/admin/wishlists`
- [ ] **AC-23.2** 顯示此賣場所有顧客許願（顧客姓名、照片、商品名稱、型號、商品連結、狀態、時間）
- [ ] **AC-23.3** 頂部狀態篩選（全部 / 待處理 / 已注意 / 已上架）
- [ ] **AC-23.4** 每筆許願狀態可 inline 下拉更改，選取後即時更新 + Toast
- [ ] **AC-23.5** 無許願時顯示空狀態

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/admin/wishlists — 商家已登入 → 回傳此賣場所有許願
□ GET /api/admin/wishlists?status=pending — 只回傳待處理
□ PATCH /api/admin/wishlists/[id] — 合法狀態更新（pending/noted/listed）→ 200
□ PATCH /api/admin/wishlists/[id] — 許願不屬於此賣場 → 404
□ GET /api/admin/wishlists — 未登入 → 401

E2E 測試（playwright）：
□ 後台側邊欄點「許願池」→ 顯示許願列表（含照片、名稱、狀態）
□ 下拉改「已注意」→ Toast 成功 → 狀態即時更新
□ 篩選「待處理」→ 只顯示待處理許願
```

### 技術驗收標準

- [ ] 後台 API 驗證商家身份（Supabase Auth session）
- [ ] 狀態更新驗證合法值（`'pending' | 'noted' | 'listed'`）
- [ ] 商家只能看到 / 更新自己賣場的許願（store_id 比對）

---

## US-24：現場快速上架

> ⚠️ AC 草稿，待 Cheryl 確認。

### 功能完成標準

- [ ] **AC-24.1** 後台側邊欄或 `/admin/products` 提供「現場快速上架」入口
- [ ] **AC-24.2** 快速上架頁面 `/admin/products/quick`，針對手機優化（大按鈕、少欄位）
- [ ] **AC-24.3** 商品照片（必填，優先開啟相機，也可相簿；上傳至 `product-images` bucket）
- [ ] **AC-24.4** 商品名稱（必填，上限 60 字）
- [ ] **AC-24.5** 售價（必填，數字鍵盤）
- [ ] **AC-24.6** 數量 / 庫存備註（選填，存入商品描述）
- [ ] **AC-24.7** 規格（選填，不填則自動建立預設 variant）
- [ ] **AC-24.8** 商品分類（選填）
- [ ] **AC-24.9** 底部「立即上架」按鈕；必填未填時 disabled
- [ ] **AC-24.10** 點擊「立即上架」→ 確認 dialog
- [ ] **AC-24.11** 確認後建立 `products`（`status = 'active'`）+ `product_variants` + `product_images`
- [ ] **AC-24.12** 成功後 Toast + 顯示「繼續快速上架」/ 「前往商品管理」
- [ ] **AC-24.13** 上架後顧客前台立即可看到（`status = 'active'`）
- [ ] **AC-24.14** 與一般商品共用 `products` table
- [ ] **AC-24.15** 上架後可至 `/admin/products/{id}/edit` 補充完整資料

### 測試完成標準

```
單元測試（vitest）：
□ POST /api/admin/products/quick — 成功上架 → 201，products + variants + images 各建立一筆
□ POST /api/admin/products/quick — 未填必填欄位 → 400
□ POST /api/admin/products/quick — 未登入 → 401

E2E 測試（playwright）：
□ 點快速上架入口 → 進入 /admin/products/quick → 填必填 → 確認 → Toast 成功
□ 上架後在顧客前台商品列表立即可見
□ 未填商品名或售價 → 按鈕 disabled
```

### 技術驗收標準

- [ ] 圖片上傳使用既有 `product-images` bucket（不新建 bucket）
- [ ] 快速上架建立的商品與一般商品在 DB 結構完全相同

---

## US-NEW：顧客個人檔案編輯

> ⚠️ AC 草稿，待確認優先序與實作細節。

### 功能完成標準

- [ ] **AC-PROF1** 顧客前台「帳戶」頁提供「編輯基本資料」入口
- [ ] **AC-PROF2** 可編輯欄位：姓名（必填）、手機（選填）
- [ ] **AC-PROF3** 儲存後更新 `store_members.name` / `store_members.phone`
- [ ] **AC-PROF4** LINE 顯示名稱與大頭貼維持從 LIFF 自動取得，不開放顧客自行修改

### 測試完成標準

```
單元測試（vitest）：
□ PATCH /api/store/[slug]/profile — approved 顧客 → 200，store_members 更新
□ PATCH /api/store/[slug]/profile — 姓名空字串 → 400
□ PATCH /api/store/[slug]/profile — 非 approved → 403

E2E 測試（playwright）：
□ 帳戶頁點「編輯基本資料」→ 修改姓名 → 儲存 → Toast 成功 → 顯示新姓名
```

---

## US-NEW：結單資料預填（localStorage）

> ⚠️ AC 草稿，待確認。

### 功能完成標準

- [ ] **AC-FILL1** 結單頁載入時，若 `localStorage['ruei-checkout-last']` 有資料，自動帶入所有欄位
- [ ] **AC-FILL2** 預填欄位：收件人姓名、手機、地址、出貨方式、超商門市（若適用）
- [ ] **AC-FILL3** 顧客可手動修改預填資料
- [ ] **AC-FILL4** 每次成功提交結單後，更新 `localStorage['ruei-checkout-last']`
- [ ] **AC-FILL5** 不儲存付款方式（每次需主動選擇）

### 技術驗收標準

- [ ] 資料存於 `localStorage['ruei-checkout-last']`，JSON 格式
- [ ] 跨裝置不共享（localStorage 限定，不寫入 DB）

---

## US-NEW：賣場橫幅設定（Banner）

### 功能完成標準

**後台 — 賣場設定 Banner 區塊**

- [ ] **AC-BAN1** `/admin/store` 賣場設定頁新增「橫幅設定」區塊
- [ ] **AC-BAN2** 可編輯欄位：Badge 標籤（≤ 30 字）、主標題第一行（≤ 20 字）、主標題第二行（≤ 20 字）
- [ ] **AC-BAN3** 儲存後更新 `stores.banner_badge`、`stores.banner_title_1`、`stores.banner_title_2`
- [ ] **AC-BAN4** 儲存成功顯示 Toast「橫幅設定已更新」
- [ ] **AC-BAN5** 欄位選填；空值時前台顯示預設文字

**前台 — 首頁橫幅顯示**

- [ ] **AC-BAN6** 桌面版 hero banner 從 `stores` 表讀取 badge / title 顯示
- [ ] **AC-BAN7** 欄位 NULL 時顯示預設文字，不影響現有顯示效果
- [ ] **AC-BAN8** 橫幅漸層背景不隨設定改變

### 測試完成標準

```
單元測試（vitest）：
□ PATCH /api/store/[id] — 更新 banner 欄位 → 200
□ GET /api/store-products — 回傳 store 資料包含 banner 欄位（含 NULL 預設值）

E2E 測試（playwright）：
□ 後台修改 badge 文字 → 儲存 → Toast 成功 → 前台橫幅顯示新文字
□ 清空欄位儲存 → 前台顯示預設文字
```

### 技術驗收標準

- [ ] `stores` 表新增 3 個 `DEFAULT NULL` 欄位，migration 冪等
- [ ] 前台首頁移除所有 banner 文字 hardcode，統一從 API 回傳的 store 物件讀取

---

## US-NEW：商家公告管理 + 前台通知鈴鐺

### 功能完成標準

**後台 — 公告管理（`/admin/announcements`）**

- [ ] **AC-ANN1** Sidebar 新增「公告管理」項目（許願池與顧客管理之間），顯示「發布中」筆數 badge
- [ ] **AC-ANN2** `/admin/announcements` 顯示所有公告（倒序），欄位：標題、類型 badge、狀態、建立時間、到期時間
- [ ] **AC-ANN3** 頂部「新增公告」按鈕
- [ ] **AC-ANN4** 公告表單欄位：標題（必填 ≤ 60 字）、內容（必填 ≤ 300 字）、類型（一般通知 / 促銷活動 / 重要公告）、立即發布 toggle、到期日（選填）
- [ ] **AC-ANN5** 送出建立 `store_announcements` 一筆 → Toast「公告已建立」
- [ ] **AC-ANN6** 發布中公告可切換「下架」；未發布可切換「上架」
- [ ] **AC-ANN7** 可刪除公告 → 確認 dialog → 刪除

**前台 — 通知鈴鐺（StoreHeader）**

- [ ] **AC-ANN8** 有「發布中且未到期」公告時，鈴鐺顯示紅點 badge
- [ ] **AC-ANN9** 顧客查看公告後紅點消失（`localStorage['ruei-ann-seen-{slug}']` 記錄最後查看時間）；有新公告（建立時間晚於最後查看時間）則重新顯示
- [ ] **AC-ANN10** 點擊鈴鐺展開公告 Popover 或導至 `/store/{slug}/announcements`，顯示：類型 icon + 標題 + 日期，點擊展開完整內容
- [ ] **AC-ANN11** 無發布中公告時鈴鐺無紅點；點擊顯示「目前沒有新消息」

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/admin/announcements — 已登入商家 → 回傳此賣場所有公告
□ POST /api/admin/announcements — 建立公告 → 201
□ PATCH /api/admin/announcements/[id] — 更新 is_active / expires_at → 200
□ DELETE /api/admin/announcements/[id] — 公告不屬於此賣場 → 404
□ GET /api/store/[slug]/announcements — 只回傳 is_active = true 且未到期的公告（顧客用）
□ GET /api/store/[slug]/announcements — 未登入或非此賣場成員 → 401/403

E2E 測試（playwright）：
□ 後台新增公告 → 填標題 / 內容 / 類型 → 建立 → 列表出現，狀態「發布中」
□ 公告建立後前台鈴鐺出現紅點
□ 點擊鈴鐺 → 公告列表顯示 → 再次點擊後（localStorage 更新）紅點消失
□ 後台下架公告 → 前台鈴鐺紅點消失（無其他發布中公告時）
```

### 技術驗收標準

- [ ] 新增 `store_announcements` 表（詳見 SDD delta）
- [ ] RLS：商家可讀 / 寫自己賣場；顧客只能讀取 `is_active = true AND (expires_at IS NULL OR expires_at > NOW())`
- [ ] 前台已讀狀態用 `localStorage`，不需後端 `announcement_reads` 表

---

## US-25：自動配單升級版

> ⚠️ AC 待 Sprint 5 Retro 前補完，視 Sprint 5 工作量決定是否同 Sprint 實作。
> 配單邏輯：手動指定優先；未手動指定時，預設 FIFO（依下單時間排序）。

### 功能完成標準

```
⚠️ 此 US 的 AC 尚未定義，待 Cheryl 確認後補充。
開發前必須補完所有 AC。
```

---

## 資料庫完成標準

```
□ product_variants 表補充欄位（migration sprint5_inventory）：
  □ stock_qty  INTEGER CHECK (stock_qty >= 0) DEFAULT NULL
  □ 冪等，IF NOT EXISTS 包覆

□ wishlists 表建立（migration sprint5_wishlist）：
  □ id, store_id (FK), member_id (FK), product_name, image_url
  □ product_url, spec_note, status CHECK (pending, noted, listed)
  □ RLS：商家可讀 / 更新自己賣場的許願；顧客可讀 / 新增自己的許願

□ Supabase Storage bucket：
  □ wishlist-images bucket 建立（public read）
  □ RLS：顧客只能上傳到自己的路徑（`path LIKE '{user_id}/%'`）

□ Supabase RPC 函式（防超賣）：
  □ decrement_stock(p_variant_id uuid, p_qty int) → void
  □ 使用 FOR UPDATE 行鎖 + CHECK stock_qty >= p_qty

□ Edge Function（AC-B10，已出貨自動完成 14 天）：
  □ 或改為訂單列表載入時 lazy check（擇一，Cheryl 確認後決定）

□ Migration SQL 可在乾淨 DB 重新執行成功（冪等性）

□ seed.sql 補充 Sprint 5 測試資料：
  □ 1 筆 active 商品，有規格且 stock_qty > 0（測試現貨扣減）
  □ 1 筆 active 商品，有規格且 stock_qty = 0（測試售完狀態）
  □ 1 筆許願池資料（approved 顧客的 wishlist）
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

# 6. DB Reset 驗證
npx supabase db reset
# → 預期：所有 migration 執行成功，seed 資料正確注入
```

---

## Sprint 5 人工驗收流程

Cheryl 親自走過以下流程，無需任何 workaround：

```
前台商品詳細頁：
□ 1. 進入商品詳細頁 → 輪播滑動正常 → 頂部返回 pill 按鈕正常
□ 2. 有規格商品：選規格 → 底部顯示價格 → 點下單 → bottom sheet 開啟 → 確認下單 → success overlay
□ 3. 「你可能還會喜歡」顯示其他商品，點擊跳至該商品頁
□ 4. 許願池 nudge 點擊導至許願池頁面

規格庫存管理：
□ 5. 商家後台規格編輯：切換「預購 / 現貨」→ 填庫存 → 儲存
□ 6. 顧客前台：現貨規格顯示「剩 N 件」；售完規格 disabled，顯示「售完」badge
□ 7. 顧客下單現貨商品 → 庫存扣減 → 再次下單超過庫存 → 提示「庫存不足」

訂單管理 UX 升級：
□ 8. 待採買 Tab → 切換「依商品分組」→ 看到商品群組 + 顧客需求 → 點「全部標記已訂購」→ Toast 成功
□ 9. 已配單依顧客分組 → 點顧客卡展開 → 勾選 allocated 訂單 → 點「代客結單」→ 進入結單頁
□ 10. 已結單 Tab → 多選訂單 → batch action bar 出現 → 批次確認出貨

許願池：
□ 11. 顧客前台「許願池」Tab → 點「＋ 許願」→ 填資料 + 上傳照片 → 送出 → Toast 成功 → 許願清單出現
□ 12. 商家後台「許願池」→ 看到許願 → 下拉改「已注意」→ Toast 成功

快速上架：
□ 13. 後台點「現場快速上架」→ 拍照上傳 → 填商品名 + 售價 → 確認上架 → Toast 成功
□ 14. 顧客前台商品列表立即出現新上架商品
```

---

## 不在 DoD 範圍內（Sprint 5 明確排除）

```
✗ 顧客取消訂單 → 暫不開放（Cheryl 2026-05-25 決策）
✗ 顧客確認收到（shipped → completed 由顧客觸發）→ 未來版本
✗ 商家取消訂單 → 未來版本
✗ LINE Messaging API 推播通知 → 整個產品完成後再開發
✗ 賣貨便 / 超商 API 串接 → 明確排除（PRD 第十一節）
✗ 庫存取消自動回補 → Sprint 5 不實作（AC-INV12，商家手動調整）
✗ 多筆批次代客結單（CustomerCard 展開目前先支援單筆）→ 未來升級
```

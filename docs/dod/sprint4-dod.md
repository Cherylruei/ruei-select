# Sprint 4 — Definition of Done (DoD)

**版本：** v1.0
**建立日期：** 2026-05-25
**Sprint 目標：** 商家能管理訂單並安排出貨；顧客能結單選物流；並建立許願池功能
**關聯文件：** docs/dor/sprint4-dor.md · docs/sdd/sprint4-delta.md

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

## US-18：商家訂單管理後台

### 功能完成標準

**訂單列表**

- [ ] **AC-18.1** `/admin/orders` 顯示該賣場所有訂單，依 `ordered_at` 倒序排列
- [ ] **AC-18.2** 每筆訂單顯示：顧客姓名、商品名稱＋規格、數量、小計金額、訂單狀態 badge、下單時間
- [ ] **AC-18.3** 頂部狀態篩選 Tab（全部 / 待採買 / 已訂購 / 已配單 / 已結單 / 已出貨 / 已完成 / 已取消），各 Tab 顯示數量 badge
- [ ] **AC-18.4** 訂單狀態 badge 顏色：
  - 待採買：黃色（amber）
  - 已訂購：藍色（blue）
  - 已配單：綠色（emerald）
  - 已結單：深綠色 Teal（teal）
  - 已出貨：紫色（purple）
  - 已完成：灰色（neutral）
  - 已取消：紅色（rose/danger）
- [ ] **AC-18.5** 無訂單時顯示「尚未有顧客下單」空狀態

**訂單狀態更新**

- [ ] **AC-18.6** `status = 'pending_purchase'` 的訂單顯示「標記已訂購」按鈕
- [ ] **AC-18.7** 點擊「標記已訂購」→ 確認 dialog（「確認已向廠商下單此商品？」）→ 確認後 `status = 'ordered'`
- [ ] **AC-18.8** `status = 'ordered'` 的訂單顯示「標記已到貨」按鈕
- [ ] **AC-18.9** 點擊「標記已到貨」→ `status = 'allocated'`，顧客端訂單狀態同步更新
- [ ] **AC-18.10** 所有狀態更新操作有 loading 狀態與成功 / 失敗 Toast 提示

**依顧客查看到貨狀況**

- [ ] **AC-18.11** 篩選「已配單」Tab 時，額外提供「依顧客分組」切換檢視：所有 `allocated` 訂單依顧客姓名分組
- [ ] **AC-18.12** 點擊分組中的顧客姓名 → 展開該顧客在此賣場的**全部**訂單（含所有狀態）
- [ ] **AC-18.13** 顧客分組卡顯示顧客 LINE ID（方便商家直接手動開 LINE 聯絡）

**商家協助建立訂單**

- [ ] **AC-18.14** `/admin/orders` 頁面右上角提供「代客建立訂單」按鈕
- [ ] **AC-18.15** 點擊後進入 `/admin/orders/new`，表單包含：
  - 顧客（必填，下拉選取此賣場 `status = 'approved'` 的 store_members，顯示姓名）
  - 商品（必填，下拉選取此賣場 `status = 'active'` 的商品）
  - 規格（必填，依選定商品的 product_variants 動態載入）
  - 數量（必填，最小值 1）
  - 備註（選填）
- [ ] **AC-18.16** 規格選齊前「建立訂單」按鈕 disabled，提示「請選擇所有規格」
- [ ] **AC-18.17** 確認送出 → 建立：
  - `orders`：`status = 'pending_purchase'`、`created_by = 'merchant'`
  - `order_items`：`product_id`、`variant_id`、`quantity`、`unit_price = variant.price`
- [ ] **AC-18.18** 建立成功 → Toast「訂單已建立」→ 導回 `/admin/orders`，新訂單出現在列表最上方
- [ ] **AC-18.19** 商家建立的訂單顧客端同樣可在 `/store/{slug}/orders` 看到

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/admin/orders — 商家已登入 → 回傳自己賣場的訂單列表（含 counts）
□ GET /api/admin/orders?status=pending_purchase — 只回傳待採買訂單
□ GET /api/admin/orders — 未登入 → 401
□ GET /api/admin/orders — 非商家角色 → 403
□ PATCH /api/admin/orders/[id] — pending_purchase → ordered 合法轉移 → 200
□ PATCH /api/admin/orders/[id] — ordered → allocated 合法轉移 → 200
□ PATCH /api/admin/orders/[id] — pending_purchase → allocated 非法跳轉 → 400
□ PATCH /api/admin/orders/[id] — 訂單不屬於此賣場 → 404
□ POST /api/admin/orders — 成功代客建單 → 201 { orderId }，created_by = 'merchant'
□ POST /api/admin/orders — memberId 不屬於此賣場 → 404
□ POST /api/admin/orders — 顧客非 approved → 400
□ POST /api/admin/orders — 商品非 active → 400
□ POST /api/admin/orders — variantId 不屬於此商品 → 400
□ GET /api/admin/members — 回傳此賣場 approved 顧客清單
□ GET /api/admin/products — 回傳此賣場 active 商品 + variants

E2E 測試（playwright）：
□ Happy path（商家）：登入後台 → 訂單管理 → 顯示訂單列表，Tab 顯示各狀態筆數
□ 狀態更新：「待採買」→ 點「標記已訂購」→ 確認 dialog 出現 → 確認 → Toast 成功 → 狀態變為已訂購
□ 狀態更新：「已訂購」→ 點「標記已到貨」→ Toast 成功 → 狀態變為已配單
□ 依顧客分組：切換至「已配單」Tab → 點「依顧客分組」→ 看到顧客分組 → 點顧客姓名展開全部訂單
□ 代客建單：點「代客建立訂單」→ 選顧客/商品/規格/數量 → 送出 → Toast「訂單已建立」→ 導回列表，新訂單出現
□ 代客建單：未選規格 → 按鈕 disabled
□ 顧客端驗證：商家代建的訂單，在顧客的 /store/{slug}/orders 可見
```

### 技術驗收標準

- [ ] 商家 API 使用 Supabase Auth session（`createRouteHandlerClient`）驗證，不接受匿名存取
- [ ] 狀態轉移邏輯集中於 server 端（`PATCH /api/admin/orders/[id]`），前端不自行計算合法轉移
- [ ] 代客建單 API 驗證 member、product、variant 三層歸屬，unit_price 從 DB 取得（不信任 client）
- [ ] `created_by = 'merchant'` 欄位在代客建單時必須設定

---

## US-19：商家出貨管理

### 功能完成標準

- [ ] **AC-19.1** `/admin/orders` 篩選「已結單」顯示所有 `status = 'settled'` 訂單，展開後顯示顧客結單填寫的收件資訊（物流方式、收件人姓名、手機、超商名稱/地址、付款方式）
- [ ] **AC-19.2** 每筆已結單訂單提供「複製收件資訊」按鈕，點擊後複製格式化文字至剪貼簿
- [ ] **AC-19.3** 商家填入物流單號（文字欄位）＋ 選擇物流商（黑貓 / 7-11 / 全家 / 賣貨便 / 其他）
- [ ] **AC-19.4** 點擊「確認出貨」→ `status = 'shipped'`，物流單號存入 `orders.shipping_number`，物流商存入 `orders.shipping_vendor`
- [ ] **AC-19.5** 已出貨訂單展開後顯示已填入的物流單號與物流商（唯讀）

### 測試完成標準

```
單元測試（vitest）：
□ PATCH /api/admin/orders/[id] — settled → shipped 合法轉移（含 shipping_number/vendor）→ 200
□ PATCH /api/admin/orders/[id] — shipping_number 未填 → 400
□ GET /api/admin/orders?status=settled — 回傳已結單訂單，含 settlements 結單資訊

E2E 測試（playwright）：
□ Happy path：篩選「已結單」→ 展開訂單 → 看到收件資訊 → 點「複製收件資訊」→ 剪貼簿有內容
□ 填物流單號 + 選物流商 → 確認出貨 → Toast 成功 → 訂單狀態改為「已出貨」
□ 「已出貨」訂單展開 → 顯示物流單號和物流商（唯讀）
```

### 技術驗收標準

- [ ] 出貨操作需確認 `settlements` 資料存在（顧客已結單）才允許填寫物流
- [ ] `shipping_number` 和 `shipping_vendor` 存於 `orders` 表，不另建 table
- [ ] `status = 'shipped' → 'completed'` 轉移留待後續版本（不在 Sprint 4 實作）

---

## US-20：顧客結單流程

### 功能完成標準

**結單入口**

- [ ] **AC-20.1** `/store/{slug}/orders` 中，`status = 'allocated'` 的訂單卡顯示「結單」按鈕
- [ ] **AC-20.2** 點擊「結單」→ 進入 `/store/{slug}/checkout/{orderId}` 結單頁
- [ ] **AC-20.3** `status` 非 `allocated` 的訂單不顯示結單按鈕

**結單頁**

- [ ] **AC-20.4** 頁面頂部顯示訂單摘要（商品名稱、規格、數量、小計）
- [ ] **AC-20.5** 物流方式選擇（單選，4 種），選取後顯示對應表單欄位：
  - **自取**：確認取貨備註（選填）
  - **超商店到店**：收件人姓名（必填）、手機（必填，格式驗證）、超商名稱（必填）
  - **賣貨便**：同超商店到店欄位
  - **宅配**：收件人姓名（必填）、手機（必填）、地址（必填）；固定運費 NT$210 顯示於訂單摘要
- [ ] **AC-20.6** 付款方式選擇依物流方式聯動（單選）：
  - 自取 → 只顯示「現金自取」
  - 超商店到店 / 宅配 → 只顯示「匯款」
  - 賣貨便 → 只顯示「賣貨便貨到付款」
- [ ] **AC-20.7** 底部「確認結單」按鈕；必填欄位未填時 disabled，顯示欄位錯誤提示
- [ ] **AC-20.8** 點擊「確認結單」→ 確認 dialog（「確認送出結單？結單後無法修改收件資訊」）→ 確認後：
  - `orders.status = 'settled'`
  - 新增一筆 `settlements` 資料（含物流與付款資訊）
- [ ] **AC-20.9** 結單成功 → Toast「結單成功！商家將盡快為您出貨」→ 導回 `/store/{slug}/orders`
- [ ] **AC-20.10** 已結單（`settled`）的訂單顧客端維持顯示「已到貨」badge（`settled` 和 `allocated` 同映射「已到貨」）

### 測試完成標準

```
單元測試（vitest）：
□ POST /api/store/[slug]/checkout — allocated 訂單 → 200，orders.status = 'settled'，settlements 新增一筆
□ POST /api/store/[slug]/checkout — 訂單非 allocated 狀態 → 400
□ POST /api/store/[slug]/checkout — 訂單不屬於此顧客 → 403
□ POST /api/store/[slug]/checkout — shipping_method = 'home_delivery' 未提供 address → 400
□ POST /api/store/[slug]/checkout — 未登入 → 401

E2E 測試（playwright）：
□ Happy path（宅配）：訂單列表看到「已到貨」+「結單」按鈕 → 點結單 → 選「宅配」→ 填收件資訊 → 選「匯款」→ 確認結單 → dialog 出現 → 確認 → Toast 成功 → 導回訂單列表
□ 自取路徑：選「自取」→ 只顯示備註欄位 → 付款方式只出現「現金自取」
□ 必填驗證：未填必填欄位 → 按鈕 disabled
□ 已結單訂單：顧客端仍顯示「已到貨」badge（不顯示「已結單」）
```

### 技術驗收標準

- [ ] 結單 API 驗證訂單 `status = 'allocated'`，否則拒絕（防止重複結單）
- [ ] 結單資訊存入 `settlements` 表，不修改 `order_items`
- [ ] 手機號碼格式驗證在 server 端進行（不只做 client-side）
- [ ] 結單後顧客無法再次結單（`settled` 狀態不顯示「結單」按鈕）

---

## US-21：顧客取消訂單

### 功能完成標準

- [ ] **AC-21.1** `/store/{slug}/orders` 中，`status = 'pending_purchase'` 的訂單卡顯示「取消訂單」按鈕
- [ ] **AC-21.2** 點擊取消 → 確認 dialog（「確認取消此訂單？取消後無法復原」）
- [ ] **AC-21.3** 確認後：
  - `orders.status = 'cancelled'`
  - `orders.cancelled_at = now()`
  - `orders.cancelled_by = 'customer'`
- [ ] **AC-21.4** 取消後訂單在列表中顯示「已取消」紅色 badge，無取消按鈕
- [ ] **AC-21.5** `status` 非 `pending_purchase` 的訂單不顯示取消按鈕（前端控制；後端 API 同樣驗證，非 `pending_purchase` 拒絕取消）

### 測試完成標準

```
單元測試（vitest）：
□ PATCH /api/store/[slug]/orders/[id]/cancel — pending_purchase → cancelled → 200，cancelled_by = 'customer'
□ PATCH /api/store/[slug]/orders/[id]/cancel — 非 pending_purchase 狀態 → 400
□ PATCH /api/store/[slug]/orders/[id]/cancel — 訂單不屬於此顧客 → 403
□ PATCH /api/store/[slug]/orders/[id]/cancel — 未登入 → 401

E2E 測試（playwright）：
□ Happy path：訂單列表「待採買」狀態卡片 → 點「取消訂單」→ 確認 dialog → 確認 → 訂單顯示「已取消」紅色 badge
□ 取消後：「取消訂單」按鈕消失
□ 已訂購狀態：不顯示「取消訂單」按鈕
```

### 技術驗收標準

- [ ] 取消 API 驗證訂單 `status = 'pending_purchase'`，否則拒絕
- [ ] `cancelled_by = 'customer'`、`cancelled_at` 必須設定
- [ ] 取消後商家後台 `/admin/orders` 同步顯示已取消狀態

---

## US-22：顧客許願池

### 功能完成標準

- [ ] **AC-22.1** 底部導覽列新增第四個 Tab「許願池」（順序：商品 / 我的訂單 / 許願池 / 我的帳戶）
- [ ] **AC-22.2** `/store/{slug}/wishlist` 顯示顧客自己的許願清單，依送出時間倒序
- [ ] **AC-22.3** 每筆許願顯示：商品照片 thumbnail、商品名稱、型號（若有填）、狀態 badge（待處理 / 已注意 / 已上架）
- [ ] **AC-22.4** 右下角浮動「＋ 許願」按鈕
- [ ] **AC-22.5** 許願表單欄位：
  - 商品名稱（必填，上限 100 字）
  - 商品照片（必填，上傳至 `wishlist-images` Supabase Storage bucket）
  - 商品連結（選填，URL 格式驗證）
  - 型號 / 規格（選填，上限 100 字）
- [ ] **AC-22.6** 送出 → `wishlists` 新增一筆（`status = 'pending'`）→ Toast「許願已送出，等待商家確認」
- [ ] **AC-22.7** 無許願時顯示空狀態「還沒有許願，快去送出你的第一個許願吧！」＋「＋ 許願」按鈕

### 測試完成標準

```
單元測試（vitest）：
□ POST /api/store/[slug]/wishlist — approved 顧客 → 201，wishlists 新增一筆（status = 'pending'）
□ POST /api/store/[slug]/wishlist — 未填必填欄位 → 400
□ POST /api/store/[slug]/wishlist — 非 approved member → 403
□ GET /api/store/[slug]/wishlist — 只回傳此顧客在此賣場的許願（RLS 隔離）

E2E 測試（playwright）：
□ Happy path：點底部「許願池」Tab → 進入許願列表 → 點「＋ 許願」→ 填商品名 + 上傳照片 → 送出 → Toast 成功 → 列表出現新許願（待處理）
□ 空狀態：無許願時顯示空狀態 + 送出按鈕
□ 商品連結格式錯誤 → 顯示 URL 格式驗證提示
□ 底部導覽新增「許願池」第四個 Tab，active 狀態正確
```

### 技術驗收標準

- [ ] 圖片上傳至 `wishlist-images` Supabase Storage bucket（RLS 允許顧客上傳自己的圖片）
- [ ] `wishlist-images` bucket 的 RLS policy 確保顧客只能讀寫自己的圖片
- [ ] 許願表單的 product_url 在 server 端驗證 URL 格式

---

## US-23：許願池後台（商家）

### 功能完成標準

- [ ] **AC-23.1** 後台側邊欄新增「許願池」選單項目，進入 `/admin/wishlists`
- [ ] **AC-23.2** 顯示此賣場所有顧客的許願，依送出時間倒序：顧客姓名、商品照片、商品名稱、型號、商品連結（可點擊開新分頁）、狀態、送出時間
- [ ] **AC-23.3** 頂部狀態篩選（全部 / 待處理 / 已注意 / 已上架）
- [ ] **AC-23.4** 每筆許願的狀態可 inline 下拉更改（待處理 / 已注意 / 已上架），選取後即時更新，顯示 Toast
- [ ] **AC-23.5** 無許願時顯示「目前沒有顧客許願」空狀態

### 測試完成標準

```
單元測試（vitest）：
□ GET /api/admin/wishlists — 商家已登入 → 回傳此賣場所有許願
□ GET /api/admin/wishlists?status=pending — 只回傳待處理許願
□ PATCH /api/admin/wishlists/[id] — 合法狀態更新（pending/noted/listed）→ 200
□ PATCH /api/admin/wishlists/[id] — 許願不屬於此賣場 → 404
□ GET /api/admin/wishlists — 未登入 → 401

E2E 測試（playwright）：
□ Happy path：後台側邊欄點「許願池」→ 顯示許願列表（含照片、名稱、狀態）
□ 狀態更新：下拉選「已注意」→ Toast 成功 → 狀態即時更新
□ 篩選：選「待處理」→ 只顯示待處理許願
□ 空狀態：無許願時顯示空狀態訊息
```

### 技術驗收標準

- [ ] 許願池後台 API 驗證商家身份（Supabase Auth session）
- [ ] 狀態更新驗證合法值（`'pending' | 'noted' | 'listed'`）
- [ ] 商家只能看到 / 更新自己賣場的許願（RLS 限制）

---

## 資料庫完成標準

```
□ orders 表補充欄位（migration 0009）：
  □ created_by    text NOT NULL DEFAULT 'customer' CHECK (customer, merchant)
  □ cancelled_by  text CHECK (customer, merchant)
  □ cancelled_at  timestamptz
  □ shipping_number text
  □ shipping_vendor text CHECK (黑貓, 7-11, 全家, 賣貨便, 其他)
□ settlements 表建立（migration 0009）：
  □ id, order_id (FK), shipping_method, payment_method
  □ recipient_name, recipient_phone, recipient_address, store_name, note
  □ RLS：商家可讀全部；顧客可讀/寫自己的結單
□ wishlists 表建立（migration 0010）：
  □ id, store_id (FK), member_id (FK), product_name, image_url
  □ product_url, spec_note, status CHECK (pending, noted, listed)
  □ RLS：商家可讀/更新全部；顧客可讀/寫自己的許願
□ wishlist-images Storage bucket 建立：
  □ RLS：顧客只能上傳到自己的路徑
□ Migration SQL 可在乾淨 DB 重新執行成功（冪等性）
□ seed.sql 補充 Sprint 4 測試資料：
  □ 1 筆 pending_purchase 訂單（供商家標記）
  □ 1 筆 allocated 訂單（供顧客結單）
  □ 1 筆 merchant 代建的 pending_purchase 訂單
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

# 7. 產出 UI 截圖（供 Cheryl 視覺驗收）
# □ /admin/orders（全部 Tab — 訂單列表）
# □ /admin/orders（已配單 Tab — 依顧客分組視圖）
# □ /admin/orders/new（代客建立訂單表單）
# □ /store/{slug}/orders（allocated 訂單卡，含「結單」按鈕）
# □ /store/{slug}/checkout/{orderId}（結單頁 — 選宅配）
# □ /store/{slug}/checkout/{orderId}（結單頁 — 選自取）
# □ /store/{slug}/orders（pending_purchase 訂單卡，含「取消訂單」按鈕）
# □ /store/{slug}/wishlist（許願清單 — 有資料）
# □ /store/{slug}/wishlist（空狀態）
# □ /admin/wishlists（許願池後台）
```

---

## Sprint 4 完成後的人工驗收流程

Cheryl 親自走過以下流程，無需任何 workaround：

```
商家端（訂單管理）：
□ 1. 登入後台 → 側邊欄「訂單管理」→ 顯示所有訂單，Tab 顯示各狀態筆數
□ 2. 篩選「待採買」→ 點「標記已訂購」→ 確認 dialog → 確認 → Toast 成功，狀態更新
□ 3. 篩選「已訂購」→ 點「標記已到貨」→ Toast 成功 → 前台顧客同步顯示「已到貨」badge
□ 4. 顧客結單後，篩選「已結單」→ 展開查看收件資訊 → 複製 → 填物流單號 → 確認出貨 → 已出貨

商家協助建立訂單：
□ 5. 右上角「代客建立訂單」→ 選顧客「林小美」→ 選商品 → 選規格 → 數量 2 → 送出
□ 6. Toast「訂單已建立」→ 新訂單出現列表最上方（待採買）
□ 7. 以林小美 LINE 前台登入 → /store/{slug}/orders → 看到代建的訂單

顧客端（結單）：
□ 8. 訂單列表看到「已到貨」badge + 「結單」按鈕
□ 9. 點結單 → 選「宅配」→ 填收件人資訊 → 選「匯款」→ 確認結單 → dialog 出現 → 確認 → Toast 成功

顧客端（取消）：
□ 10. 「待採買」訂單 → 點「取消訂單」→ 確認 dialog → 確認 → 訂單顯示「已取消」紅色 badge

商家依顧客查看到貨狀況：
□ 11. 篩選「已配單」→ 切換「依顧客分組」→ 看到顧客分組 → 展開全部訂單（含其他狀態）
□ 12. 複製顧客 LINE ID → 手動開 LINE 通知

許願池：
□ 13. 顧客點底部第三個 Tab「許願池」→ 空狀態 → 點「＋ 許願」→ 填名稱 + 上傳照片 → 送出 → Toast 成功
□ 14. 商家後台「許願池」→ 看到許願 → 下拉改「已注意」→ Toast 成功 → 狀態即時更新
```

---

## 不在 DoD 範圍內（Sprint 4 明確排除）

```
✗ 顧客確認收到（shipped → completed）→ 未來版本
✗ 商家取消訂單 → 未來版本
✗ 自動 / 手動配單升級版（按下單時間自動分配）→ Sprint 5
✗ 商家配貨數據 Dashboard → Sprint 5
✗ 賣貨便 / 超商 API 串接（維持手動填單）→ 明確排除（PRD 第十一節）
✗ LINE Messaging API 推播通知 → 整個產品完成後再開發
✗ 許願上架時 LINE 通知顧客 → 同上
```

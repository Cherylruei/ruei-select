# Sprint 5 — Definition of Ready (DoR)

**版本：** v0.1 草稿
**建立日期：** 2026-05-24
**Sprint 目標：** TBD（待 Sprint 4 完成後與 Cheryl 確認）

> ⚠️ **此文件為草稿**，僅記錄已確認的功能方向。正式 DoR 待 Sprint 4 merge 後補完。
> Sprint 5 開始前，所有 Acceptance Criteria 必須經 Cheryl 確認才能開發。

---

## 背景（暫定）

Sprint 4 完成了訂單完整閉環（下單→採買→到貨→結單→出貨）。
Sprint 5 的核心方向：

1. **訂單管理 UX 升級**（B-Light 商品視圖 + 批次操作）— 讓商家操作更貼近真實代購流程
2. **顧客管理頁重設計**（新設計系統風格）— 套用 Sprint 4 設計 tokens
3. **現場連線區域**（快速上架）— 商家現場擺攤 / 直播時快速建立商品
4. **自動 / 手動配單升級**（Sprint 4 Out of Scope 延後項目）
5. **許願池**（US-22/23，若 Sprint 4 未完成則移至此）
6. TBD — 待 Sprint 4 Retro 後補充

---

## Features 與執行順序（草稿）

```
sprint5-order-ux         訂單管理 UX 升級（B-Light 商品視圖 + 批次操作）
sprint5-customers-ui     顧客管理頁重設計
sprint5-quick-listing    現場連線區域 — 快速上架
sprint5-wishlist         許願池（若 Sprint 4 未完成）
sprint5-auto-alloc       自動配單升級版（依賴：Sprint 4 allocated 流程）
sprint5-dashboard        商家配貨 Dashboard
```

---

## User Stories（草稿）

---

### US-NEW：規格庫存管理（現貨 / 預購雙模式）

> ℹ️ 確認時間：2026-06-02 Cheryl 確認。現貨採下單即扣減（方案 A），原子操作防超賣。
> **同一商品可同時有預購規格和現貨規格**（NULL vs 有值）。

```
As a 商家,
I want to 為每個規格選擇「預購」或「現貨」模式並設定庫存數量，
So that 顧客只能在有貨時下單現貨商品，售完自動鎖定，不會超賣。
```

**核心資料模型：**

```sql
-- NULL  = 預購制（不限量，維持現有行為）
-- > 0   = 現貨有庫存
-- = 0   = 現貨售完（顯示 badge，無法下單）
ALTER TABLE product_variants
  ADD COLUMN stock_qty INTEGER CHECK (stock_qty >= 0);
```

**Acceptance Criteria：**

**資料與防超賣**

- AC-INV1：`stock_qty = NULL` 的規格維持現有行為，可無限下單（預購）
- AC-INV2：下單時 `stock_qty IS NOT NULL`，使用 Supabase RPC 原子操作 `stock_qty - quantity`，防止並發超賣
- AC-INV3：`stock_qty < quantity` 時 API 回傳 `{ error: '庫存不足' }`，前台顯示提示
- AC-INV4：migration 新增 `stock_qty`，原有資料預設 `NULL`（不影響現有商品）

**商家後台 — 規格編輯**

- AC-INV5：每個規格新增「預購 / 現貨」切換：預購不填庫存；現貨填數量（整數 ≥ 0，必填）
- AC-INV6：切回預購 → `stock_qty = NULL`；填數字 → 現貨模式
- AC-INV7：商品列表顯示規格庫存狀態（有N件 / 售完）
- AC-INV8：商家可在規格編輯頁直接調整庫存數量（補貨更新）

**顧客前台 — 商品詳情頁**

- AC-INV9：`stock_qty = 0` 的規格顯示「售完」badge，disabled，無法選取
- AC-INV10：輸入數量超過 `stock_qty` 時自動 cap，提示「最多 N 件」
- AC-INV11：預購規格旁顯示「預購」label；現貨 ≤ 5 件時顯示「剩 N 件」（避免暴露完整庫存）

**庫存歸還（本 Sprint 簡化）**

- AC-INV12：本 Sprint 不實作訂單取消的自動庫存回補（US-21 尚未實作）
- AC-INV13：商家手動在規格編輯頁調整庫存數量，處理取消 / 退貨回補

---

### US-NEW：訂單管理 UX 升級（B-Light + 批次操作）

> ℹ️ 此 US 源自 Sprint 4 討論的「B-Light 商品分組視圖」與「批次狀態更新」需求（2026-06-01 Cheryl 確認方向）。

```
As a 商家,
I want to 以商品為主軸查看待採買訂單，並能批次更新多筆訂單狀態，
So that 我的操作流程貼近真實代購採買習慣（整批訂、整批到貨、整批出貨）。
```

**Acceptance Criteria（草稿，待 Cheryl 確認）：**

**B-Light：待採買 / 已訂購 商品分組視圖**

- AC-B1：待採買 Tab 新增「依商品分組」切換（預設為商品列表，可切換成訂單列表）
- AC-B2：依商品分組視圖顯示：供應商 → 商品 → 訂購顧客清單（姓名 + 數量），每組商品顯示總需求量
- AC-B3：每個商品群組右側提供「部分勾選或全部勾選標記已訂購」按鈕，點擊後批次更新該商品所有相關訂單 `status → ordered`
- AC-B4：已訂購 Tab 同樣提供「依商品分組」視圖，每組提供「部分勾選或全部標記已到貨（已配單）」按鈕
- AC-B5：批次更新成功顯示 Toast「已更新 N 筆訂單為已訂購/已配單」

**批次勾選出貨（已結單 Tab）**

- AC-B6：已結單 Tab 每列訂單前加入 checkbox，可多選
- AC-B7：有勾選時，底部浮現 batch action bar：「已選 N 筆 [ 確認出貨 ] [ 取消選取 ]」
- AC-B8：點擊「確認出貨」→ 填入物流商 + 單號（共用同一筆適用所有選取訂單）→ 批次更新 `status → shipped`
- AC-B9：新增 `PATCH /api/admin/orders/batch` endpoint 接受 `orderIds[]` 批次狀態更新

**已出貨自動完成（14 天）**

- AC-B10：`status = 'shipped'` 超過 14 天的訂單，系統自動更新為 `status = 'completed'`
- AC-B11：實作方式：Supabase Edge Function（cron job）或每次載入時 lazy 更新

---

### US-NEW：顧客管理頁重設計

> ℹ️ 現有顧客管理頁（待審核 + 會員名單）使用舊樣式，需套用設計系統。

```
As a 商家,
I want to 在風格一致的介面中管理顧客審核和會員名單,
So that 後台視覺統一，操作體驗更流暢。
```

**Acceptance Criteria（草稿，待 Cheryl 提供 mockup 後確認）：**

- AC-C1：待審核 Tab 使用設計系統卡片元件，顯示顧客姓名、LINE ID、申請時間、邀請來源
- AC-C2：待審核卡片提供「通過」/ 「拒絕」按鈕，樣式符合 forest 主題
- AC-C3：會員名單使用 design token 表格，欄位：姓名、手機、LINE ID、加入時間
- AC-C4：兩個 Tab 樣式與訂單管理、商品管理保持一致

---

### US-22：顧客許願池（從 Sprint 4 移入，2026-06-01 確認）

```
As a 已審核通過的顧客,
I want to 向商家送出代購許願,
So that 商家能參考我的需求考慮上架商品。
```

**Acceptance Criteria：** 參見 docs/dor/sprint4-dor.md US-22（AC-22.1～22.7），原文不重複，此處僅記錄移入原因。

> 移入原因：Sprint 4 訂單管理功能量足，US-22/23 確認移至 Sprint 5 以確保訂單閉環品質（2026-06-01 Cheryl 確認）。

---

### US-23：許願池後台（從 Sprint 4 移入，2026-06-01 確認）

```
As a 商家,
I want to 查看所有顧客的代購許願並標記處理狀態,
So that 我能系統化管理採購需求，也讓顧客知道許願進度。
```

**Acceptance Criteria：** 參見 docs/dor/sprint4-dor.md US-23（AC-23.1～23.5）。

---

### US-24：現場連線區域 — 快速上架

```
As a 商家,
I want to 在現場擺攤或直播時，用手機拍照後快速建立商品並立即上架,
So that 顧客能立即在前台看到商品並下單，不需要等待完整商品編輯流程。
```

> ℹ️ **適用情境**：商家在實體展場 / 直播現場，手上有現貨，需要 30 秒內快速上架讓顧客搶購。
> 與一般商品管理（`/admin/products/new`）並存，提供簡化版快速入口。

**Acceptance Criteria（草稿，待 Cheryl 確認）：**

**快速上架入口**

- AC-24.1：後台側邊欄或 `/admin/products` 頁面提供「現場快速上架」入口（與一般新增商品分開）
- AC-24.2：快速上架頁面 `/admin/products/quick`，設計針對手機操作優化（大按鈕、少欄位）

**必填欄位（精簡，追求速度）**

- AC-24.3：商品照片（必填，優先開啟相機拍攝，也可從相簿選取；上傳至 `product-images` Supabase Storage）
- AC-24.4：商品名稱（必填，上限 60 字，大字號輸入框）
- AC-24.5：售價（必填，數字鍵盤，NT$ 前綴）
- AC-24.6：數量 / 庫存備註（選填，自由文字，如「現貨 3 件」，存入商品描述）

**選填欄位（可跳過直接上架）**

- AC-24.7：規格（選填；若不填，系統自動建立一個預設 variant，price = 售價）
- AC-24.8：商品分類（選填，下拉選取此賣場已有的 category）

**上架確認**

- AC-24.9：底部「立即上架」大按鈕；必填欄位未填時 disabled
- AC-24.10：點擊「立即上架」→ 確認 dialog（「確認上架？上架後顧客可立即看到」）
- AC-24.11：確認後：
  - 建立 `products`（`status = 'active'`、`store_id`、`name`、`description`）
  - 建立 `product_variants`（單一預設規格或填入的規格）
  - 建立 `product_images`（上傳的照片）
- AC-24.12：上架成功 → Toast「商品已上架，顧客可立即瀏覽」→ 顯示「繼續快速上架」和「前往商品管理」兩個按鈕
- AC-24.13：顧客前台 `/store/{slug}` 立即可看到新上架商品（`status = 'active'`）

**與一般商品的關係**

- AC-24.14：快速上架建立的商品和一般新增的商品共用同一個 `products` table
- AC-24.15：快速上架後可到 `/admin/products/{id}/edit` 補充完整資料（圖片補充、詳細描述、多規格）

---

### US-25：自動配單升級版（草稿）

> ℹ️ 此 US 為 Sprint 4 Out of Scope 的延後項目，細節待確認。

```
As a 商家,
I want to 系統自動依下單時間將到貨商品分配給對應顧客,
So that 我不需要手動逐一比對哪位顧客應該拿到哪件商品。
```

**待確認項目：**

- 配單邏輯：商家可手動指定配單，若沒先做手動配單直接點選自動配單，就預設先進先出（FIFO）
- 同一商品多顧客下單時的配單順序
- Acceptance Criteria 待 Sprint 4 完成後補充

---

## 範圍邊界（草稿）

### 可能 In Scope（待確認）

- 現場快速上架（US-24）— 已確認為 Sprint 5
- 自動配單升級（US-25）

### Out of Scope

- LINE Messaging API 推播通知 → 整個產品完成後再開發
- 顧客確認收到（shipped → completed）→ 未來版本
- 商家取消訂單 → 未來版本
- 賣貨便 / 超商 API 串接 → 明確排除

---

## ⚠️ 開發約束（Sprint 5 延續 Sprint 4 約束，Cheryl 確認後才能開發）

```
認證：
□ 前台顧客只用 LINE LIFF 登入，seed 資料用 line_id，禁止建 email/password 給前台用
□ 後台商家用 Supabase Auth（email/password）

Storage：
□ 快速上架照片上傳至 product-images bucket（與一般商品共用）
□ 不得另建新 bucket（除非有明確理由且 Cheryl 確認）

訂單流向（延續 Sprint 4 約束）：
□ 顧客下單 → orders 表 → 商家後台立即可見
□ 商家代客建立訂單 → 顧客前台同樣可見
□ created_by 欄位必須設定
```

---

## 待 Cheryl 確認（Sprint 5 開始前）

```
□ Sprint 4 所有功能已完成且測試通過
□ 確認 Sprint 5 功能範圍（US-24 快速上架確定做；US-25 是否同 Sprint？）
□ US-24 快速上架：單一規格自動建立邏輯是否符合預期？
□ US-24 快速上架：成功後「繼續快速上架」vs「前往商品管理」按鈕順序是否正確？
□ US-25 自動配單：配單邏輯確認（FIFO / 手動指定）
□ 現場連線區域入口位置確認（側邊欄獨立項目 or /admin/products 頁面內按鈕）
```

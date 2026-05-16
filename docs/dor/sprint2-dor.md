# Sprint 2 — Definition of Ready (DoR)

**版本：** v1.0 草稿
**建立日期：** 2026-05-16
**Sprint 目標：** 商家能上架商品（含 AI 文案、規格、匯率）；顧客能透過邀請連結申請加入賣場並接受審核；公開商品頁讓陌生客透過 SEO/AEO 搜到後可申請加入

---

## 背景與問題定義

Sprint 1 完成了賣場基礎架構（供應商、邀請連結、顧客審核框架）。Sprint 2 的核心目標是讓這個系統「跑起來」：商家能上架商品，顧客能申請加入並被審核，同時啟動對陌生客的開放探索。

**Sprint 2 解決的核心問題：**
- 顧客申請加入的完整流程（Sprint 1 只做了後台框架，顧客端申請尚未實作）
- 商品尚無法上架（核心功能缺失）
- 沒有任何公開可搜尋的入口讓陌生客認識賣場

---

## Features 與執行順序

```
sprint2-customers        顧客申請完整流程（依賴：Sprint 1 的 store_members table）
  → sprint2-products     商品管理（依賴：Sprint 1 的 suppliers）
    → sprint2-public-discovery  公開頁 + 陌生客申請（依賴：products 的 is_public 欄位）
sprint2-orders           訂單管理資料模型（orders / order_items table，UI 留 Sprint 3）
```

> **注意：** `sprint2-orders` 本 Sprint **只建立資料模型與基礎 API**，完整顧客下單 UI 在 Sprint 3 實作（需先有商品、需先有通過審核的顧客）。

---

## User Stories

---

### US-6：顧客透過邀請連結申請加入賣場

```
As a 顧客,
I want to 點擊商家分享的邀請連結，用 LINE 登入並填寫申請表,
So that 我可以申請加入賣場，等待商家審核後開始選購。
```

**Acceptance Criteria：**
- AC-6.1：點擊邀請連結（`/store/{slug}/join`）進入申請頁，未登入自動跳 LINE LIFF 授權
- AC-6.2：LINE 授權後回到申請頁，顯示申請表：
  - 姓名（必填，2–20 字）
  - LINE ID（必填，供商家聯繫）
  - 手機號碼（選填，格式驗證 09xxxxxxxx）
  - 自我介紹（選填，上限 100 字）
- AC-6.3：送出申請後，`store_members` 新增一筆 `status = 'pending'`、`source = 'invite_link'`
- AC-6.4：送出後頁面顯示「申請已送出，商家審核後會通知您」靜態訊息
- AC-6.5：同一顧客對同一賣場重複點連結，若已有 pending 申請，顯示「您的申請正在審核中」；已 approved 則顯示「您已是本賣場會員」並引導進入賣場
- AC-6.6：邀請連結失效（slug 不存在）顯示 404

---

### US-7：商家在後台審核顧客申請

```
As a 商家,
I want to 在後台看到所有待審核申請並逐一通過或拒絕,
So that 我能控制哪些顧客能進入賣場。
```

**Acceptance Criteria：**
- AC-7.1：「顧客管理」→「待審核」Tab 顯示所有 `status = 'pending'` 的申請，依申請時間倒序
- AC-7.2：每筆申請顯示：姓名、手機、LINE ID、申請時間、**來源 badge**（「邀請連結」/ 「公開申請」）
- AC-7.3：「公開申請」類型額外顯示觸發商品名稱（referring_product_id 對應的商品）
- AC-7.4：點擊「通過」→ `status = 'approved'`、`reviewed_at = now()`，申請移至「會員名單」Tab
- AC-7.5：點擊「拒絕」→ `status = 'rejected'`、`reviewed_at = now()`，從待審核移除
- AC-7.6：「會員名單」Tab 顯示所有 `status = 'approved'` 的顧客
- AC-7.7：審核動作有 loading 狀態與成功/失敗 Toast 提示
- AC-7.8：待審核為空時顯示「目前沒有待審核申請」空狀態

---

### US-8：商家建立與管理商品

```
As a 商家,
I want to 新增、編輯、下架商品，並可選擇 AI 優化文案、設定規格與售價,
So that 顧客能在賣場看到我精心整理的商品資訊。
```

**Acceptance Criteria：**

**商品列表**
- AC-8.1：後台「商品管理」顯示商品列表，欄位：商品圖、商品名稱、廠商、售價、狀態（上架/下架）、是否公開
- AC-8.2：可依廠商篩選、依建立時間排序
- AC-8.3：商品為空時顯示「尚未新增商品」空狀態

**新增商品**
- AC-8.4：點「新增商品」進入新增頁，欄位：
  - 廠商選擇（下拉，來自 Sprint 1 供應商資料，必填）
  - 商品原始文（textarea，貼入廠商提供的原文，必填）
  - 「AI 優化文案」按鈕 → 呼叫 Claude API → 顯示優化後文案供預覽與編輯
  - 商品名稱（由 AI 自動帶入，可手動修改，必填）
  - 商品描述（AI 優化後帶入，可手動修改）
  - 商品類別（下拉或自訂文字，選填）
  - 商品規格（多維度，見 AC-8.6）
  - 商品圖片（多張上傳，見 AC-8.7）
  - 是否公開（toggle，預設關閉）
- AC-8.5：儲存成功 Toast「商品已建立」，導回商品列表

**多維度規格**
- AC-8.6：規格建立流程：
  - 商家可手動新增規格維度（如「顏色」「尺寸」）與選項（如「紅、藍、白」「S、M、L」）
  - AI 優化完成後自動偵測文案中的規格關鍵字，預填規格供商家確認
  - 每個規格組合（variant）獨立設定售價、成本、幣別
  - 成本輸入後，若幣別非 TWD，自動換算顯示台幣成本（見 AC-8.8）

**圖片上傳**
- AC-8.7：支援多張圖片上傳（最多 10 張），可拖曳排序；圖片存至 Supabase Storage `product-images` bucket；前端壓縮至 1200px、2MB 以下

**匯率換算**
- AC-8.8：成本幣別選擇器支援 TWD / JPY / GBP / USD / HKD；非 TWD 時即時顯示「今日匯率 {rate}，約 NT$ {amount}」；匯率每日快取一次存入 `exchange_rates` table

**編輯與下架**
- AC-8.9：可編輯已建立商品的所有欄位
- AC-8.10：可將商品狀態切換為「下架」（不顯示於顧客前台，公開頁也不顯示）
- AC-8.11：下架商品不可被搜尋引擎索引

---

### US-9：商家開啟賣場公開商品功能

```
As a 商家,
I want to 在賣場設定中開啟「允許公開商品」，並在個別商品中設定是否公開,
So that 我可以精準控制哪些商品能被外部搜尋到。
```

**Acceptance Criteria：**
- AC-9.1：「賣場設定」頁新增「公開商品功能」區塊，toggle 開關（預設關閉）
- AC-9.2：開關說明文字：「開啟後，設為公開的商品可被 Google 等搜尋引擎索引，陌生客可透過搜尋找到賣場」
- AC-9.3：賣場未開啟此功能時，即使商品設為公開，`/p/[slug]` 回傳 404
- AC-9.4：`stores` table 新增 `allow_public_products: boolean DEFAULT false`

---

### US-10：公開商品頁（SEO/AEO 可索引）

```
As a 陌生潛在顧客,
I want to 透過搜尋引擎找到公開的商品頁面並瀏覽相關商品,
So that 我可以了解賣場在賣什麼，決定是否申請加入。
```

**Acceptance Criteria：**

**公開商品列表頁** `/p/[slug]`
- AC-10.1：顯示該賣場所有 `is_public = true` 且 `status = 'active'` 的商品（商品圖、名稱、售價範圍）
- AC-10.2：頁面頂部顯示賣場名稱、頭像
- AC-10.3：底部固定 CTA 區塊：「想看更多商品？申請加入 {賣場名稱}」+ 申請按鈕
- AC-10.4：此頁為 SSG（靜態生成）+ ISR（每 1 小時重新生成），可被搜尋引擎索引
- AC-10.5：`<meta name="robots" content="index, follow">`
- AC-10.6：Open Graph 標籤：og:title、og:description、og:image（賣場頭像）

**公開商品詳細頁** `/p/[slug]/[id]`
- AC-10.7：顯示商品名稱、描述、圖片（輪播）、售價（規格選擇）
- AC-10.8：底部「更多公開商品」區塊，最多顯示 4 個同賣場其他公開商品
- AC-10.9：「我要下單」按鈕觸發申請光箱（見 US-11）
- AC-10.10：SSG + ISR，可被搜尋引擎索引
- AC-10.11：JSON-LD Product schema：
  ```json
  {
    "@type": "Product",
    "name": "...",
    "description": "...",
    "image": "...",
    "offers": { "@type": "Offer", "price": "...", "priceCurrency": "TWD" }
  }
  ```
- AC-10.12：商品 `status = 'inactive'` 時，`/p/[slug]/[id]` 回傳 404 並設 `noindex`

---

### US-11：陌生客透過公開商品頁申請加入賣場

```
As a 陌生潛在顧客,
I want to 在看到感興趣的商品後，透過 LINE 快速申請加入賣場,
So that 審核通過後我可以正式下單購買。
```

**Acceptance Criteria：**
- AC-11.1：公開商品詳細頁點擊「我要下單」或列表頁點「申請加入」，彈出光箱
- AC-11.2：光箱第一步：「申請加入 {賣場名稱} 才能下單」說明文字 + LINE 登入按鈕
- AC-11.3：LINE LIFF 授權後，光箱切換至申請表（LINE 顯示名稱自動帶入不可修改）：
  - 姓名（必填）
  - 手機號碼（選填，格式驗證 09xxxxxxxx）
  - LINE ID（必填）
  - 自我介紹（選填，上限 100 字）
- AC-11.4：送出後 `store_members` 新增：`source = 'public_page'`、`referring_product_id = {當前商品 id}`
- AC-11.5：光箱顯示「申請已送出，商家審核後會通知您」並提供關閉按鈕
- AC-11.6：已有 pending 申請者送出後提示「您的申請正在審核中」
- AC-11.7：已 approved 者顯示「您已是本賣場會員，請從邀請連結進入賣場」

---

### US-12：訂單管理資料模型（Sprint 2 只建模型）

```
As a 開發者,
I want to 在 Sprint 2 建立 orders / order_items 資料模型,
So that Sprint 3 的顧客下單 UI 有完整的 DB 基礎可以直接實作。
```

**Acceptance Criteria：**
- AC-12.1：建立 `orders` table（見資料模型章節），含 RLS
- AC-12.2：建立 `order_items` table，含 RLS
- AC-12.3：撰寫 migration SQL，含 index 與 RLS policy
- AC-12.4：撰寫 migration 驗證測試（table 結構、RLS 可存取性）
- ⚠️ **Sprint 2 不實作任何下單 UI**，UI 在 Sprint 3

---

## 範圍邊界

### In Scope（Sprint 2 要做）
- 顧客透過邀請連結申請加入（前台申請頁 + 申請表）
- 商家後台審核顧客申請（通過/拒絕 + 來源 badge）
- 商品 CRUD（含 AI 文案、多維度規格、匯率換算、圖片上傳）
- 商品公開設定（is_public toggle）
- 公開商品列表頁與詳細頁（`/p/[slug]`、`/p/[slug]/[id]`）
- 陌生客申請光箱（LIFF 登入 + 申請表）
- 訂單資料模型（migration 只，無 UI）

### Out of Scope（Sprint 2 不做）
- 顧客前台商品瀏覽（`/store/[slug]/products`）→ Sprint 3
- 顧客下單 UI → Sprint 3
- 商家配貨流程 → Sprint 5
- LINE Messaging API 通知 → Sprint 4
- 訂單狀態更新 UI → Sprint 3

---

## 技術依賴

| 項目 | 說明 | 狀態 |
|------|------|------|
| Claude API Key | AI 文案優化需要 Anthropic API Key，加入 `.env.local` | ⬜ 待確認 |
| ExchangeRate-API Key | 免費方案，每日 1500 次限制 | ⬜ 待申請 |
| Supabase Storage bucket | 新增 `product-images` bucket（public read） | ⬜ 待建立 |
| LIFF 設定 | `/store/[slug]/join` 與 `/p/[slug]/[id]` 需在 LINE Developers 設定為 LIFF Endpoint | ⬜ 待更新 |

---

## 資料模型（Sprint 2 新增）

```sql
-- 商品
products
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  store_id          uuid REFERENCES stores(id) NOT NULL
  supplier_id       uuid REFERENCES suppliers(id)
  name              text NOT NULL
  description       text
  original_text     text                         -- 廠商原始商品文
  category          text
  is_public         boolean DEFAULT false
  status            text CHECK (status IN ('active', 'inactive')) DEFAULT 'active'
  view_count        integer DEFAULT 0
  created_at        timestamptz DEFAULT now()
  updated_at        timestamptz DEFAULT now()

-- 商品規格（多維度）
product_variants
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  product_id        uuid REFERENCES products(id) NOT NULL
  specs             jsonb NOT NULL               -- {"顏色": "紅", "尺寸": "M"}
  price             numeric NOT NULL
  cost              numeric
  cost_currency     text DEFAULT 'TWD'
  created_at        timestamptz DEFAULT now()

-- 商品圖片
product_images
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  product_id        uuid REFERENCES products(id) NOT NULL
  url               text NOT NULL
  sort_order        integer DEFAULT 0
  created_at        timestamptz DEFAULT now()

-- 匯率快取
exchange_rates
  currency          text PRIMARY KEY             -- 'JPY', 'GBP', ...
  rate_to_twd       numeric NOT NULL
  fetched_at        timestamptz NOT NULL

-- 訂單（Sprint 2 只建模型，Sprint 3 實作 UI）
orders
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  store_id          uuid REFERENCES stores(id) NOT NULL
  member_id         uuid REFERENCES store_members(id) NOT NULL
  status            text CHECK (status IN (
                      'pending_purchase', 'ordered', 'allocated',
                      'settled', 'shipped', 'completed', 'cancelled'
                    )) DEFAULT 'pending_purchase'
  note              text
  ordered_at        timestamptz DEFAULT now()
  updated_at        timestamptz DEFAULT now()

-- 訂單明細
order_items
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid()
  order_id          uuid REFERENCES orders(id) NOT NULL
  product_id        uuid REFERENCES products(id) NOT NULL
  variant_id        uuid REFERENCES product_variants(id)
  quantity          integer NOT NULL DEFAULT 1
  unit_price        numeric NOT NULL
  unit_cost         numeric
  created_at        timestamptz DEFAULT now()

-- stores table 新增欄位
ALTER TABLE stores ADD COLUMN allow_public_products boolean DEFAULT false;

-- store_members table 新增欄位
ALTER TABLE store_members
  ADD COLUMN source text CHECK (source IN ('invite_link', 'public_page')) DEFAULT 'invite_link',
  ADD COLUMN referring_product_id uuid REFERENCES products(id),
  ADD COLUMN note text;
```

---

## AI 文案優化規格（呼叫 Claude API）

**Prompt 設計原則：**
- 輸入：廠商原始商品文
- 輸出：JSON `{ name, description }` — 商品名稱與優化後描述
- 絕對不得添加原文中沒有的規格或功能
- 語氣：親切、符合台灣代購賣場風格
- 同時輸出偵測到的規格維度與選項（供 AC-8.6 自動預填）

**費用控制：**
- 僅在商家明確點擊「AI 優化文案」按鈕時才呼叫 API，不自動觸發
- 使用 `claude-haiku-4-5` 做文案優化（足夠、低成本）

---

## 風險與緩解

| 風險 | 影響 | 緩解方式 |
|------|------|----------|
| SSG 公開頁 slug 動態多、build time 過長 | 部署緩慢 | 只預先生成前 100 個公開商品，其餘用 ISR fallback |
| ExchangeRate-API 免費版每日限制 1500 次 | 匯率無法更新 | 每日快取一次，所有用戶共用同一快取，不逐人查詢 |
| LIFF 在公開頁（非 LINE 內建瀏覽器）開啟 | 申請光箱 LIFF 失敗 | 偵測環境，非 LINE 環境改用 LINE Login redirect 方式授權 |
| 公開頁爬蟲流量暴增 | Supabase 讀取配額消耗 | ISR 快取 1 小時，爬蟲打中的多是 CDN cache |
| 同一顧客重複申請 | `store_members` 重複資料 | DB UNIQUE constraint (store_id, user_id) + 前端提示 |

---

## Sprint 2 完成後的可驗收流程

```
商家側：
1. 登入後台 → 商品管理 → 新增商品 → 貼入廠商文字 → 點 AI 優化
2. 確認文案、設定規格（含日幣換算）、上傳圖片 → 儲存
3. 編輯商品 → 開啟「設為公開」
4. 賣場設定 → 開啟「允許公開商品功能」
5. 確認公開商品列表頁 /p/{slug} 可見
6. 後台顧客管理 → 看到待審核申請 → 審核通過

陌生客側：
7. Google 搜尋（或直接輸入） → 到達 /p/{slug}/{id}
8. 點「我要下單」→ LINE 登入 → 填申請表 → 送出
9. 後台出現來源「公開申請」的待審核記錄，附商品名稱

邀請連結側：
10. 打開 /store/{slug}/join → LINE 登入 → 填申請表 → 送出
11. 後台出現來源「邀請連結」的待審核記錄
```

---

## 待 Cheryl 於 Sprint 2 開始前確認

```
□ Claude API Key 取得並加入 .env.local（ANTHROPIC_API_KEY）
□ ExchangeRate-API 申請免費帳號，取得 API Key
□ Supabase Storage 建立 product-images bucket（public read）
□ LINE Developers 更新 LIFF Endpoint，加入 /store/{slug}/join
□ 確認 sprint2-dor.md 內容正確（此步驟）
```

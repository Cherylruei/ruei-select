# Sprint 5 — SDD Delta

**版本：** v0.1 草稿
**建立日期：** 2026-06-02
**關聯文件：** docs/sdd/system-sdd.md · docs/sdd/sprint4-delta.md · docs/dor/sprint5-dor.md
**說明：** 本文件僅記錄 Sprint 5 新增或變更的內容。基礎架構見 system-sdd.md，Sprint 4 架構見 sprint4-delta.md。

---

## 1. 新增 / 修改路由總覽

### 頁面路由

| 路由 | 類型 | 說明 | Auth |
|------|------|------|------|
| `/store/[slug]/products/[id]` | CSR（**完整重建**）| 商品詳細頁 — mobile-first，bottom sheet 下單（US-NEW-PD）| LIFF + approved member |
| `/store/[slug]/wishlist` | CSR（新增）| 顧客許願清單（US-22）| LIFF + approved member |
| `/store/[slug]/announcements` | CSR（新增）| 公告列表頁（US-NEW-ANNOUNCE，或改為 Header Popover）| LIFF + approved member |
| `/admin/wishlists` | CSR（新增）| 許願池後台（US-23）| 商家（Supabase Auth）|
| `/admin/announcements` | CSR（新增）| 公告管理後台（US-NEW-ANNOUNCE）| 商家（Supabase Auth）|
| `/admin/products/quick` | CSR（新增）| 現場快速上架（US-24）| 商家（Supabase Auth）|
| `/admin/customers` | CSR（**重設計**）| 顧客管理頁重設計（US-NEW-CUI）| 商家（Supabase Auth）|
| `/admin/orders` | CSR（**修改**）| 新增 B-Light 分組視圖 + batch action bar + AC-18.12 展開| 商家（Supabase Auth）|
| `/admin/store` | CSR（**修改**）| 新增「橫幅設定」區塊（US-NEW-BANNER）| 商家（Supabase Auth）|

### 新增 / 修改 API Routes

| 路由 | 方法 | 說明 | Sprint 5 US |
|------|------|------|-------------|
| `/api/store-products` | GET（**修改**）| 新增可選 `exclude` / `limit` 參數（相關商品用）| US-NEW-PD |
| `/api/orders` | POST（**修改**）| 現貨商品下單時呼叫 `decrement_stock` RPC | US-NEW-INV |
| `/api/store/[slug]/wishlist` | GET | 查詢此顧客在此賣場的許願清單 | US-22 |
| `/api/store/[slug]/wishlist` | POST | 送出許願（含圖片上傳後的 image_url）| US-22 |
| `/api/store/[slug]/profile` | PATCH | 顧客更新 store_members.name / .phone | US-NEW-PROF |
| `/api/store/[slug]/announcements` | GET | 查詢此賣場發布中且未到期的公告（前台用）| US-NEW-ANNOUNCE |
| `/api/admin/announcements` | GET | 查詢此賣場所有公告（後台用）| US-NEW-ANNOUNCE |
| `/api/admin/announcements` | POST | 建立公告 | US-NEW-ANNOUNCE |
| `/api/admin/announcements/[id]` | PATCH | 更新公告（is_active / expires_at / 內容）| US-NEW-ANNOUNCE |
| `/api/admin/announcements/[id]` | DELETE | 刪除公告 | US-NEW-ANNOUNCE |
| `/api/admin/wishlists` | GET | 查詢此賣場所有顧客許願（含狀態篩選）| US-23 |
| `/api/admin/wishlists/[id]` | PATCH | 更新許願狀態（pending / noted / listed）| US-23 |
| `/api/admin/orders/batch` | PATCH | 批次更新訂單狀態（US B-Light）| US-NEW-B |
| `/api/admin/products/quick` | POST | 快速上架建立商品（products + variants + images）| US-24 |

### Supabase Edge Function（新增）

| 函式 | 說明 | 觸發方式 |
|------|------|---------|
| `auto-complete-orders` | 將 `shipped` 超過 14 天的訂單更新為 `completed`（AC-B10）| cron：每天 00:00 UTC（或改為 lazy check）|

> ⚠️ AC-B11：Edge Function vs lazy check 由 Cheryl 確認後決定。lazy check 成本較低（無 Edge Function），但執行頻率依訂單列表載入觸發，非精確 14 天。

---

## 2. 資料模型變更

### 2.1 product_variants 表補充欄位（Migration: sprint5_inventory）

```sql
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS stock_qty INTEGER CHECK (stock_qty >= 0);
-- NULL  = 預購制（不限量，維持現有行為）
-- > 0   = 現貨有庫存
-- = 0   = 現貨售完（顯示 badge，無法下單）
```

> 原有所有規格自動為 NULL（預購模式），不影響現有商品的下單流程。

### 2.2 防超賣 RPC 函式（同 migration sprint5_inventory）

```sql
CREATE OR REPLACE FUNCTION decrement_stock(p_variant_id uuid, p_qty int)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 取得 row lock 防並發超賣
  PERFORM id FROM product_variants
  WHERE id = p_variant_id
  FOR UPDATE;

  -- 驗證庫存足夠
  IF (SELECT stock_qty FROM product_variants WHERE id = p_variant_id) < p_qty THEN
    RAISE EXCEPTION '庫存不足';
  END IF;

  -- 原子扣減
  UPDATE product_variants
  SET stock_qty = stock_qty - p_qty
  WHERE id = p_variant_id;
END;
$$;
```

**呼叫方式（`POST /api/orders` 內）：**

```typescript
// 只有現貨商品才呼叫 RPC（stock_qty IS NOT NULL）
if (variant.stock_qty !== null) {
  const { error } = await db.rpc('decrement_stock', {
    p_variant_id: variantId,
    p_qty: quantity,
  })
  if (error) return NextResponse.json({ error: '庫存不足' }, { status: 400 })
}
```

### 2.3 wishlists 表（Migration: sprint5_wishlist）

```sql
CREATE TABLE IF NOT EXISTS wishlists (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  member_id    uuid        NOT NULL REFERENCES store_members(id) ON DELETE CASCADE,
  product_name text        NOT NULL,
  image_url    text        NOT NULL,
  product_url  text,
  spec_note    text,
  status       text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'noted', 'listed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- 商家可讀取 / 更新自己賣場的許願
CREATE POLICY "wishlists_merchant_all" ON wishlists
  FOR ALL
  USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::UUID)
  );

-- 顧客可讀取 / 新增自己的許願
CREATE POLICY "wishlists_customer_select" ON wishlists
  FOR SELECT
  USING (
    member_id IN (SELECT id FROM store_members WHERE user_id = auth.uid()::UUID)
  );

CREATE POLICY "wishlists_customer_insert" ON wishlists
  FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM store_members
      WHERE user_id = auth.uid()::UUID AND status = 'approved'
    )
  );
```

### 2.4 stores 表補充欄位（Migration: sprint5_banner，同 sprint5_inventory 或獨立）

```sql
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS banner_badge    text,   -- 如「★ 本週精選商品」，NULL = 顯示預設
  ADD COLUMN IF NOT EXISTS banner_title_1  text,   -- 主標題第一行，如「精選好物」
  ADD COLUMN IF NOT EXISTS banner_title_2  text;   -- 主標題第二行，如「讓你的生活更精彩」
```

> 三個欄位皆 `DEFAULT NULL`，NULL 時前台使用 hardcode 預設文字，保持向下相容。

### 2.5 store_announcements 表（Migration: sprint5_announcements）

```sql
CREATE TABLE IF NOT EXISTS store_announcements (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title        text        NOT NULL CHECK (char_length(title) <= 60),
  content      text        NOT NULL CHECK (char_length(content) <= 300),
  type         text        NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'promo', 'warning')),
  is_active    boolean     NOT NULL DEFAULT true,
  expires_at   timestamptz,            -- NULL = 永不到期
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE store_announcements ENABLE ROW LEVEL SECURITY;

-- 商家可讀寫自己賣場的公告
CREATE POLICY "announcements_merchant_all" ON store_announcements
  FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::UUID));

-- 顧客只能讀取發布中且未到期的公告
CREATE POLICY "announcements_customer_select" ON store_announcements
  FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()::UUID AND status = 'approved'
    )
  );
```

**公告類型對應前台顯示：**

| type | icon | 說明 |
|------|------|------|
| `info` | 📢 | 一般通知（到貨通知、異動說明）|
| `promo` | 🎉 | 促銷活動（特賣、優惠）|
| `warning` | ⚠️ | 重要公告（規則變更、暫停服務）|

### 2.6 Supabase Storage（新增）

| Bucket | 存取 | 用途 | 備註 |
|--------|------|------|------|
| `wishlist-images` | public read | 顧客許願照片 | RLS：顧客只能上傳自己 `{member_id}/` 路徑下的圖片 |

```sql
-- wishlist-images bucket RLS（在 Supabase Dashboard 設定或 migration 中配置）
-- 允許上傳：path 必須以 {authenticated_user_id}/ 開頭
INSERT INTO storage.policies (bucket_id, name, definition)
VALUES (
  'wishlist-images',
  'Authenticated users can upload their own wishlist images',
  '(bucket_id = ''wishlist-images'' AND auth.uid()::text = (storage.foldername(name))[1])'
);
```

---

## 3. API 規格

### 3.1 GET /api/store-products（修改）

新增可選 query params（向下相容，不傳則行為不變）：

```
exclude?: string    // 排除的商品 ID（UUID），用於「你可能還會喜歡」
limit?: number      // 最多回傳幾筆，預設不限
```

**範例：**
```
GET /api/store-products?slug=ruiruidaigou-5e8w&exclude=abc-123&limit=4
```

### 3.2 PATCH /api/admin/orders/batch（新增）

**用途：** 批次更新多筆訂單狀態

**Auth：** Supabase Auth（Merchant）

**Request Body：**

```typescript
{
  orderIds: string[]   // 必填，1 ~ 50 筆
  status: OrderStatus  // 目標狀態
}
```

**合法 Transition（batch）：**
```
pending_purchase → ordered
ordered          → allocated
settled          → shipped（需同時提供 shipping_number + shipping_vendor）
```

**Response：**

```typescript
// 200
{ success: true, updated: number }

// 400 — Empty orderIds / Invalid transition / Missing shipping info for shipped
// 403 — 含不屬於此賣場的 orderId
```

> 使用 DB transaction：任一筆失敗則全部 rollback。

### 3.3 GET /api/store/[slug]/wishlist（新增）

**Auth：** LIFF token（approved member）

**Response：**

```typescript
{
  success: true,
  data: WishlistItem[]
}

// WishlistItem：
{
  id: string
  product_name: string
  image_url: string
  product_url: string | null
  spec_note: string | null
  status: 'pending' | 'noted' | 'listed'
  created_at: string
}
```

### 3.4 POST /api/store/[slug]/wishlist（新增）

**Auth：** LIFF token（approved member）

**Request Body：**

```typescript
{
  product_name: string   // 必填，1~100 字
  image_url: string      // 必填，Supabase Storage 上傳後的 URL
  product_url?: string   // 選填，URL 格式驗證
  spec_note?: string     // 選填，1~100 字
}
```

**Response：**

```typescript
// 201
{ success: true, id: string }

// 400 — 缺少必填 / product_url 格式錯誤
// 403 — 非 approved member
```

### 3.5 PATCH /api/admin/wishlists/[id]（新增）

**Auth：** Supabase Auth（Merchant）

**Request Body：**

```typescript
{
  status: 'pending' | 'noted' | 'listed'
}
```

**Response：**

```typescript
// 200
{ success: true }

// 400 — Invalid status value
// 404 — 許願不屬於此賣場
```

### 3.6 PATCH /api/store/[slug]/profile（新增）

**Auth：** LIFF token（approved member）

**Request Body：**

```typescript
{
  name: string     // 必填，1~50 字
  phone?: string   // 選填
}
```

**Response：**

```typescript
// 200
{ success: true }

// 400 — 姓名空字串
// 403 — 非 approved member
```

更新 `store_members.name` / `store_members.phone`（依 `user_id` 和 `store_id` 定位）。

### 3.7 GET /api/store/[slug]/announcements（新增）

**用途：** 前台查詢發布中且未到期的公告

**Auth：** LIFF token（approved member）

**Response：**

```typescript
{
  success: true,
  data: StoreAnnouncement[]
}

// StoreAnnouncement：
{
  id: string
  title: string
  content: string
  type: 'info' | 'promo' | 'warning'
  created_at: string   // 前台用來判斷是否比上次查看時間新
}
```

過濾條件（server 端）：`is_active = true AND (expires_at IS NULL OR expires_at > NOW())`

---

### 3.8 GET /api/admin/announcements（新增）

**Auth：** Supabase Auth（Merchant）

**Query Params：**

```
is_active?: boolean   // 篩選發布中 / 未發布（省略時回傳全部）
```

**Response：**

```typescript
{
  success: true,
  data: AdminAnnouncement[],
  active_count: number   // Sidebar badge 用
}

// AdminAnnouncement：
{
  id: string
  title: string
  content: string
  type: 'info' | 'promo' | 'warning'
  is_active: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}
```

### 3.9 POST /api/admin/announcements（新增）

**Auth：** Supabase Auth（Merchant）

**Request Body：**

```typescript
{
  title: string          // 必填，≤ 60 字
  content: string        // 必填，≤ 300 字
  type: 'info' | 'promo' | 'warning'
  is_active?: boolean    // 預設 true
  expires_at?: string    // ISO 8601，選填
}
```

**Response：** `201 { success: true, id: string }`

### 3.10 PATCH /api/admin/announcements/[id]（新增）

**Auth：** Supabase Auth（Merchant）

**Request Body（所有欄位選填，至少一個）：**

```typescript
{
  title?: string
  content?: string
  type?: 'info' | 'promo' | 'warning'
  is_active?: boolean
  expires_at?: string | null   // null = 清除到期日
}
```

**Response：** `200 { success: true }` / `404` 若不屬於此賣場

### 3.11 POST /api/admin/products/quick（新增）

**Auth：** Supabase Auth（Merchant）

**Request Body：**

```typescript
{
  name: string        // 必填，1~60 字
  price: number       // 必填，> 0
  image_url: string   // 必填，Supabase Storage URL（product-images bucket）
  description?: string
  category?: string
  // 規格（選填；不填時自動建立預設 variant）
  variants?: {
    specs: Record<string, string>
    price: number
  }[]
}
```

**Response：**

```typescript
// 201
{ success: true, productId: string }

// 400 — 缺少必填
// 401 — Unauthorized
```

---

## 4. 元件架構

### 4.1 前台商品詳細頁重建（`/store/[slug]/products/[id]/page.tsx`）

完整重建，原有 `page.tsx` 替換為以下結構：

```
ProductDetailPage (page.tsx — Client Component)
├── FloatingTopBar              ← ✦ 新增：浮動返回 + 分享 pill 按鈕
├── ImageCarousel               ← ✦ 新增：scroll-snap 輪播 + counter + dots
├── TitleBlock                  ← ✦ 新增：分類 pill + 名稱 + 描述 + 售價（整合）
├── PurchaseStatusCard          ← ✦ 新增：預購 / 現貨狀態卡（Sprint 5 庫存 US 前固定預購樣式）
├── VariantSelector             ← 保留（有規格時顯示）
├── QuantitySelector            ← ✦ 修改：改為 pill 按鈕樣式
├── InfoRows                    ← ✦ 新增：驗貨保證 + 下單即購買 info row 卡片
├── RelatedProducts             ← ✦ 新增：同賣場商品 2×2 grid
├── WishlistNudge               ← ✦ 新增：許願池引導卡
├── StickyBottomBar             ← ✦ 修改：新增價格顯示「立即下單 · NT$ X」
└── OrderBottomSheet            ← ✦ 新增：取代 OrderConfirmModal
    ├── ProductSummary          ←   商品縮圖 + 名稱 + 預購 badge
    ├── PriceRows               ←   單價 / 數量 / 小計
    └── SuccessOverlay          ← ✦ 新增：成功後置中 overlay（繼續逛 / 看訂單）
```

**修改 `QuantitySelector` 樣式：**

```tsx
// 僅改 className，不改 props/邏輯
// 「-」：bg-surface card-line-strong rounded-pill
// 「+」：bg-primary text-white shadow-pink rounded-pill
```

**相關商品 API 呼叫（AC-PD19）：**

```typescript
// 在 ProductDetailPage 初始化時並行 fetch：
// 1. /api/store-products/:id（主商品）
// 2. /api/store-products?slug=X&exclude=ID&limit=4（相關商品）
```

### 4.2 訂單管理 UX 升級（修改 `OrdersClient.tsx`）

```
OrdersClient（已存在）
├── 待採買 / 已訂購 Tab：
│   ├── 「訂單列表 / 依商品分組」切換按鈕（新增）
│   ├── ProductGroupView（新增）
│   │   └── ProductGroupCard × N
│   │       ├── 商品名稱 + 供應商 + 總需求量
│   │       ├── 顧客清單（姓名 + 數量）× N
│   │       └── 「標記已訂購/已配單」CheckAll + 個別 checkbox（批次更新）
│   └── OrderList（既有）
│
├── 已結單 Tab：
│   ├── 每列訂單前加 checkbox（新增）
│   └── BatchActionBar（新增，有勾選時 fixed bottom）
│       └── 「已選 N 筆 [ 確認出貨 ] [ 取消選取 ]」
│
└── 已配單 Tab（CustomerGroupView 已存在）：
    └── CustomerGroupCard
        ├── 點擊展開 → 顯示全部訂單（AC-18.12a，新增）
        │   ├── allocated 訂單：checkbox enabled
        │   └── 其他狀態：灰色，checkbox disabled
        └── 「代客結單」按鈕（AC-18.12c，新增）
```

### 4.3 許願池頁面（新增）

```
/store/[slug]/wishlist/page.tsx（Client Component）
├── WishlistHeader（標題 + 篩選？）
├── WishlistList
│   └── WishlistCard × N（照片縮圖 + 商品名 + 狀態 badge）
├── EmptyState（無許願時）
└── FAB（右下角「＋ 許願」浮動按鈕）
    └── 點擊 → WishlistNewSheet（bottom sheet 表單）或跳至 /wishlist/new
```

```
/admin/wishlists/page.tsx（Client Component）
├── 狀態 Tab 篩選（全部 / 待處理 / 已注意 / 已上架）
├── WishlistAdminList
│   └── WishlistAdminCard × N
│       ├── 照片、商品名、型號、商品連結（可開新頁）、顧客名、時間
│       └── 狀態 inline 下拉（Select）→ 即時更新
└── EmptyState
```

### 4.4 公告管理頁面（新增）

```
/admin/announcements/page.tsx（Client Component）
├── 頁面 Header（標題 + 「新增公告」按鈕 + active_count badge）
├── AnnouncementList
│   └── AnnouncementCard × N
│       ├── 類型 icon + 標題 + 狀態 badge（發布中 / 未發布 / 已到期）
│       ├── 到期時間（若有）
│       ├── 上架 / 下架 toggle
│       └── 刪除按鈕（→ 確認 dialog）
├── EmptyState（無公告時）
└── AnnouncementForm（Modal 或 inline，新增 / 編輯用）
    ├── 標題 Input
    ├── 內容 Textarea
    ├── 類型 Radio Group（一般通知 / 促銷活動 / 重要公告）
    ├── 立即發布 Toggle
    └── 到期日 DatePicker（選填）
```

**前台通知鈴鐺（修改 `StoreHeader.tsx`）：**

```
StoreHeader
└── 鈴鐺按鈕（既有）
    ├── 紅點 badge（有新公告時顯示）← 新增
    └── 點擊 → AnnouncementPopover（新增）或導至 /store/[slug]/announcements
        ├── GET /api/store/[slug]/announcements 取得發布中公告
        ├── AnnouncementItem × N（類型 icon + 標題 + 日期 + 展開內容）
        └── 空狀態「目前沒有新消息」
```

**紅點邏輯（client-side localStorage）：**

```typescript
const SEEN_KEY = `ruei-ann-seen-${slug}`
const lastSeen = localStorage.getItem(SEEN_KEY)  // ISO 8601 或 null

// 有公告 created_at > lastSeen → 顯示紅點
const hasNew = announcements.some(a =>
  !lastSeen || new Date(a.created_at) > new Date(lastSeen)
)

// 顧客查看後更新
function markAsSeen() {
  localStorage.setItem(SEEN_KEY, new Date().toISOString())
}
```

### 4.5 快速上架頁面（新增）

```
/admin/products/quick/page.tsx（Client Component）
├── 大型照片上傳區（ImageUploader，針對手機優化）
├── 商品名稱（大字號 Input）
├── 售價（CurrencyInput，數字鍵盤）
├── 規格（選填，可動態新增規格組合）
├── 分類（下拉，選填）
├── 備註（選填文字）
└── 「立即上架」大按鈕（FAB 風格）
```

---

## 5. TypeScript Types 更新（src/types/index.ts）

```typescript
// Sprint 5 新增型別

// 規格庫存
export interface ProductVariant {
  // ...（既有欄位）
  stock_qty: number | null   // ✦ Sprint 5 新增：null = 預購，數字 = 現貨
}

// 前台商品詳細頁（StoreProductDetail 補充）
export interface StoreProductDetail {
  // ...（既有欄位）
  relatedProducts?: StoreProductSummary[]  // ✦ Sprint 5 新增（可選，相關商品）
}

// 許願池
export type WishlistStatus = 'pending' | 'noted' | 'listed'

export interface WishlistItem {
  id: string
  product_name: string
  image_url: string
  product_url: string | null
  spec_note: string | null
  status: WishlistStatus
  created_at: string
}

export interface AdminWishlistItem extends WishlistItem {
  member_name: string
  store_id: string
}

// Banner（stores 表新增欄位，StoreInfo 介面補充）
export interface StoreInfo {
  // ...（既有欄位）
  banner_badge: string | null    // ✦ Sprint 5 新增
  banner_title_1: string | null  // ✦ Sprint 5 新增
  banner_title_2: string | null  // ✦ Sprint 5 新增
}

// 公告
export type AnnouncementType = 'info' | 'promo' | 'warning'

export interface StoreAnnouncement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  created_at: string
}

export interface AdminAnnouncement extends StoreAnnouncement {
  is_active: boolean
  expires_at: string | null
  updated_at: string
}

// 批次操作
export interface BatchOrderUpdate {
  orderIds: string[]
  status: OrderStatus
  shipping_number?: string    // settled → shipped 時必填
  shipping_vendor?: ShippingVendor   // settled → shipped 時必填
}
```

---

## 6. 訂單狀態機（Sprint 5 更新）

Sprint 5 新增 `shipped → completed` 自動轉移（14 天）：

```
建立訂單
    ↓
pending_purchase
    ↓（商家「標記已訂購」）
ordered
    ↓（商家「標記已到貨」）
allocated
    ↓（顧客結單 / 商家代客結單）
settled
    ↓（商家批次出貨，AC-B8）
shipped
    ↓（系統自動，14 天後 → AC-B10）   ← Sprint 5 新增
completed

* 取消路徑（cancelled_by / cancelled_at）：欄位保留，功能暫不開放
```

---

## 7. Sidebar 導覽更新

`src/app/admin/components/Sidebar.tsx` 修改（Sprint 5）：

- 新增「許願池」連結 → `/admin/wishlists`（US-23）
- 商品管理區新增「現場快速上架」子連結 → `/admin/products/quick`（US-24，或放在 `/admin/products` 頁面內按鈕）

---

## 8. 種子資料更新（supabase/seed.sql）

Sprint 5 新增種子資料：

```sql
-- 規格庫存測試資料
-- 已存在的某個規格：stock_qty = 5（現貨，剩 5 件）
-- 已存在的某個規格：stock_qty = 0（現貨售完）
-- 其餘規格維持 stock_qty = NULL（預購）

-- 許願池測試資料
INSERT INTO wishlists (store_id, member_id, product_name, image_url, status)
VALUES (
  '<ruiruidaigou store_id>',
  '<U_dev_mock 的 member_id>',
  '日本限定草莓巧克力',
  'https://placeholder.jpg',
  'pending'
);
```

---

## 9. 待確認項目（Sprint 5 開始前）

```
□ AC-B11：auto-complete 實作方式（Edge Function cron vs lazy check）→ 請 Cheryl 確認
□ 顧客管理頁 mockup（admin-customers.html）確認 AC-C1~4 符合設計
□ US-24 快速上架入口位置：側邊欄獨立項目 or /admin/products 頁面內按鈕
□ US-25 自動配單升級 AC 補充（目前完全未定義）
□ 顧客個人檔案（AC-PROF1~4）及結單預填（AC-FILL1~5）優先序確認
□ Migration 編號確認（接在 Sprint 4 最後一個 migration 之後）
```

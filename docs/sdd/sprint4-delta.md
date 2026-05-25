# Sprint 4 — SDD Delta

**版本：** v1.0
**建立日期：** 2026-05-25
**關聯文件：** docs/sdd/system-sdd.md · docs/sdd/sprint3-delta.md · docs/dor/sprint4-dor.md
**說明：** 本文件僅記錄 Sprint 4 新增或變更的內容，基礎架構見 system-sdd.md，Sprint 3 架構見 sprint3-delta.md

---

## 1. 新增路由總覽

### 頁面路由

| 路由 | 類型 | 說明 | Auth |
|------|------|------|------|
| `/admin/orders` | CSR（Client Component） | 商家訂單管理後台（US-18） | 商家（Supabase Auth） |
| `/admin/orders/new` | CSR（Client Component） | 商家代客建立訂單（US-18） | 商家（Supabase Auth） |
| `/admin/wishlists` | — | 許願池後台（US-23，Sprint 4 待實作） | 商家 |
| `/store/[slug]/checkout/[orderId]` | CSR | 顧客結單頁（US-20，Sprint 4 待實作） | LIFF + approved member |
| `/store/[slug]/wishlist` | CSR | 顧客許願池列表（US-22，Sprint 4 待實作） | LIFF + approved member |

### 新增 API Routes（US-18 已實作）

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/admin/orders` | GET | 查詢此賣場所有訂單（含狀態篩選 + 各狀態筆數） |
| `/api/admin/orders` | POST | 商家代客建立訂單（`created_by = 'merchant'`） |
| `/api/admin/orders/[id]` | PATCH | 更新單筆訂單狀態（transition 驗證） |
| `/api/admin/members` | GET | 取得此賣場 approved members（代客建單下拉用） |
| `/api/admin/products` | GET | 取得此賣場 active 商品 + variants（代客建單下拉用） |

### 待實作 API Routes（US-19～US-23）

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/admin/orders/[id]` | PATCH | 延伸：填寫物流單號並更新為 `shipped`（US-19） |
| `/api/orders/[id]/cancel` | PATCH | 顧客取消訂單（`cancelled_by = 'customer'`，US-21） |
| `/api/orders/[id]/checkout` | POST | 顧客結單（新增 settlement + 更新 `settled`，US-20） |
| `/api/wishlists` | GET, POST | 顧客許願池（US-22） |
| `/api/admin/wishlists` | GET, PATCH | 商家許願池後台（US-23） |

---

## 2. 資料模型變更

### 2.1 orders 表補充欄位（Migration: 0009_sprint4_admin_orders.sql）

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS created_by    text NOT NULL DEFAULT 'customer'
    CHECK (created_by IN ('customer', 'merchant')),
  ADD COLUMN IF NOT EXISTS cancelled_by  text
    CHECK (cancelled_by IN ('customer', 'merchant')),
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz,
  ADD COLUMN IF NOT EXISTS shipping_number text,
  ADD COLUMN IF NOT EXISTS shipping_vendor text
    CHECK (shipping_vendor IN ('黑貓', '7-11', '全家', '賣貨便', '其他'));
```

**欄位說明：**
- `created_by`：記錄訂單由誰建立（顧客自行下單 vs 商家代客建立），NOT NULL DEFAULT 'customer'
- `cancelled_by`：記錄取消者（顧客取消 / 商家取消），可為 NULL（未取消時）
- `cancelled_at`：取消時間戳記
- `shipping_number`：物流單號（商家出貨時填入）
- `shipping_vendor`：物流商（黑貓 / 7-11 / 全家 / 賣貨便 / 其他）

### 2.2 新增 settlements 表（US-20 預建，同 Migration: 0009）

```sql
CREATE TABLE IF NOT EXISTS settlements (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shipping_method   text        NOT NULL
    CHECK (shipping_method IN ('pickup', 'convenience', 'takkyubin', 'home_delivery')),
  payment_method    text        NOT NULL
    CHECK (payment_method IN ('cash', 'transfer', 'cod')),
  recipient_name    text,
  recipient_phone   text,
  recipient_address text,
  store_name        text,   -- 超商名稱（超商 / 賣貨便時填入）
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

> `settlements` 於 US-20 顧客結單時建立，一筆 `order_id` 對應一筆 settlement。

### 2.3 新增 wishlists 表（US-22，待實作）

```sql
CREATE TABLE wishlists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  member_id    uuid NOT NULL REFERENCES store_members(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  image_url    text NOT NULL,   -- 上傳至 Supabase Storage wishlist-images bucket
  product_url  text,
  spec_note    text,
  status       text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'noted', 'listed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

### 2.4 RLS Policies（0009 migration 已建立）

```sql
-- settlements：商家可讀取自己賣場所有結單資訊
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements_merchant_all" ON settlements
  FOR ALL
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::UUID)
    )
  );

-- 顧客可讀取自己的結單資訊
CREATE POLICY "settlements_customer_select" ON settlements
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE member_id IN (
        SELECT id FROM store_members WHERE user_id = auth.uid()::UUID
      )
    )
  );

-- 顧客可新增自己訂單的結單
CREATE POLICY "settlements_customer_insert" ON settlements
  FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE member_id IN (
        SELECT id FROM store_members WHERE user_id = auth.uid()::UUID
      )
    )
  );
```

> **注意：** wishlists 表的 RLS 尚待 US-22 migration 建立。

### 2.5 Supabase Storage（待建立）

| Bucket | 存取 | 用途 | Sprint |
|--------|------|------|--------|
| `wishlist-images` | public read | 顧客許願圖片 | **Sprint 4 新增（US-22）** |

---

## 3. 元件架構（US-18 已實作）

### 3.1 新增目錄結構

```
src/
├── app/
│   ├── admin/
│   │   ├── components/
│   │   │   └── Sidebar.tsx           ← ✦ 修改：訂單管理移入主導覽（移除「即將推出」）
│   │   └── (protected)/
│   │       └── orders/
│   │           ├── page.tsx          ← ✦ 訂單管理頁（Server Component，套 <Suspense>）
│   │           ├── OrdersClient.tsx  ← ✦ 訂單管理主元件（Client Component）
│   │           └── new/
│   │               ├── page.tsx      ← ✦ 代客建立訂單頁（Server Component）
│   │               └── NewOrderClient.tsx ← ✦ 代客建立訂單表單（Client Component）
│   └── store/
│       └── [slug]/
│           ├── checkout/             ← 待實作（US-20）
│           │   └── [orderId]/
│           │       └── page.tsx
│           └── wishlist/             ← 待實作（US-22）
│               └── page.tsx
└── app/
    └── api/
        ├── admin/
        │   ├── orders/
        │   │   ├── route.ts          ← ✦ GET（訂單列表）+ POST（代客建單）
        │   │   └── [id]/
        │   │       └── route.ts      ← ✦ PATCH（狀態更新）
        │   ├── members/
        │   │   └── route.ts          ← ✦ GET（approved members 下拉）
        │   └── products/
        │       └── route.ts          ← ✦ GET（active 商品 + variants 下拉）
        ├── orders/
        │   └── [id]/
        │       ├── cancel/           ← 待實作（US-21）
        │       └── checkout/         ← 待實作（US-20）
        └── wishlists/                ← 待實作（US-22）
```

### 3.2 關鍵元件說明

#### `OrdersClient.tsx`（`/admin/orders`）

主元件，全部為 Client-side。

```
OrdersClient
├── Toast（3 秒自動消失，成功/失敗）
├── 頁面 Header（標題 + 「代客建立訂單」連結）
├── 狀態 Tab 列（8 個 Tab，各顯示筆數 badge）
│   → 全部 / 待採買 / 已訂購 / 已配單 / 已結單 / 已出貨 / 已完成 / 已取消
├── 已配單 Tab 的「訂單列表 / 依顧客分組」切換
├── OrdersSkeleton（載入中骨架）
├── EmptyState（無訂單空狀態）
├── OrderList → OrderCard × N
│   └── ActionButtons（依 status 決定：標記已訂購 / 標記已到貨 / null）
└── CustomerGroupView（依顧客分組）
    └── CustomerGroupCard × N（展開 → AllOrdersForMember）
```

**狀態 Tab 切換：** 使用 `useSearchParams` + `router.push('?status=xxx')` 更新 URL 搜尋參數，實現可分享的頁面狀態。

**訂單狀態更新：** 呼叫 `PATCH /api/admin/orders/{id}` → 成功後重新呼叫 `fetchOrders(activeTab)`。

**依顧客分組（CustomerGroupView）：**
- 僅在 `activeTab === 'allocated'` 時顯示切換按鈕
- 預設以 `memberId` 為 key 分組，顯示每位顧客的已配單商品清單
- 點擊顧客 Header 展開 → `AllOrdersForMember` 即時呼叫 `GET /api/admin/orders`（無 status 篩選）取得該顧客所有訂單

**代客建單標記：** `order.created_by === 'merchant'` 時，顧客名稱旁顯示「代客建單」橘色小標籤。

#### `NewOrderClient.tsx`（`/admin/orders/new`）

```
NewOrderClient
├── 並行 fetch：GET /api/admin/members + GET /api/admin/products
├── 顧客下拉（approved store_members）
├── 商品下拉（active products）
├── 規格下拉（依選定商品的 variants 動態載入）
├── 數量輸入（min=1）
├── 備註文字欄（選填）
└── 「建立訂單」按鈕（isValid = memberId && productId && variantId && quantity >= 1）
```

建立成功後：Toast 顯示「訂單已建立」→ `router.push('/admin/orders')` 導回列表。

---

## 4. API 規格（US-18 已實作）

### 4.1 GET /api/admin/orders

**用途：** 查詢此賣場所有訂單，含各狀態筆數

**Query Params：**
```
status?: 'pending_purchase' | 'ordered' | 'allocated' | 'settled' | 'shipped' | 'completed' | 'cancelled'
```
（省略時回傳全部）

**Auth：** Supabase Auth（Merchant）

**Response：**
```typescript
{
  success: true,
  data: AdminOrder[],    // 依 ordered_at 倒序
  counts: OrderStatusCounts
}

// AdminOrder：
{
  id: string,
  store_id: string,
  member_id: string,
  member_name: string,    // JOIN store_members.name
  member_line_id: string, // JOIN store_members.line_id
  status: OrderStatus,
  created_by: 'customer' | 'merchant',
  note: string | null,
  ordered_at: string,
  updated_at: string,
  cancelled_by: 'customer' | 'merchant' | null,
  cancelled_at: string | null,
  items: AdminOrderItem[]
}

// AdminOrderItem：
{
  id: string,
  quantity: number,
  unit_price: number,
  product_name: string,   // JOIN products.name
  variant_specs: Record<string, string> | null  // JOIN product_variants.specs
}

// OrderStatusCounts：
{
  all: number,
  pending_purchase: number,
  ordered: number,
  allocated: number,
  settled: number,
  shipped: number,
  completed: number,
  cancelled: number
}
```

### 4.2 POST /api/admin/orders

**用途：** 商家代客建立訂單

**Auth：** Supabase Auth（Merchant）

**Request Body：**
```typescript
{
  memberId: string,    // store_members.id（必填）
  productId: string,   // products.id（必填）
  variantId: string,   // product_variants.id（必填）
  quantity: number,    // >= 1（必填）
  note?: string        // 選填
}
```

**Server 端驗證：**
1. 驗證 member 屬於此賣場且 `status = 'approved'`
2. 驗證 product 屬於此賣場且 `status = 'active'`
3. 驗證 variant 屬於此 product
4. 從 DB 取得 `unit_price = variant.price`（不信任 client）
5. INSERT orders（`created_by = 'merchant'`, `status = 'pending_purchase'`）
6. INSERT order_items

**Response：**
```typescript
// 201
{ success: true, orderId: string }

// 400 — Missing required fields / Quantity < 1 / Member not approved / Product not available / Invalid variant
// 401 — Unauthorized
// 403 — Forbidden（非商家角色）
// 404 — Member not found / Store not found
```

### 4.3 PATCH /api/admin/orders/[id]

**用途：** 更新訂單狀態（含 transition 驗證）

**Auth：** Supabase Auth（Merchant）

**Request Body：**
```typescript
{ status: OrderStatus }
```

**合法 Transition（Sprint 4 US-18）：**
```
pending_purchase → ordered    （商家向廠商下單）
ordered          → allocated  （商品到貨，可配單給顧客）
```

> US-19 待實作：`allocated/settled → shipped`（填物流單號 + 物流商）

**Response：**
```typescript
// 200
{ success: true }

// 400 — Invalid status transition
// 401 — Unauthorized
// 403 — Forbidden / 非此賣場訂單
// 404 — Order not found
```

### 4.4 GET /api/admin/members

**用途：** 取得此賣場 approved store_members（代客建單顧客下拉）

**Auth：** Supabase Auth（Merchant）

**Response：**
```typescript
{
  success: true,
  data: {
    id: string,
    name: string,
    line_id: string
  }[]  // MemberOption[]
}
```

### 4.5 GET /api/admin/products

**用途：** 取得此賣場 active 商品 + variants（代客建單商品下拉）

**Auth：** Supabase Auth（Merchant）

**Response：**
```typescript
{
  success: true,
  data: {
    id: string,
    name: string,
    variants: {
      id: string,
      specs: Record<string, string>,
      price: number
    }[]
  }[]  // ProductWithVariants[]
}
```

---

## 5. 訂單狀態機（Sprint 4 更新）

```
建立訂單
    ↓
pending_purchase  ←─ 顧客自行下單（created_by = 'customer'）
                  ←─ 商家代客建立（created_by = 'merchant'）
    ↓（商家「標記已訂購」AC-18.6, 18.7）
ordered
    ↓（商家「標記已到貨」AC-18.8, 18.9）
allocated
    ↓（顧客「結單」填寫收件資訊，US-20 待實作）
settled
    ↓（商家填物流單號「確認出貨」US-19 待實作）
shipped
    ↓（顧客確認收到，Out of Scope Sprint 4）
completed

* pending_purchase → cancelled（顧客取消，US-21 待實作；cancelled_by = 'customer'）
```

---

## 6. TypeScript Types 更新（src/types/index.ts）

```typescript
// Sprint 4 新增型別

export type OrderCreatedBy = 'customer' | 'merchant'
export type OrderCancelledBy = 'customer' | 'merchant'
export type ShippingVendor = '黑貓' | '7-11' | '全家' | '賣貨便' | '其他'

// ShippingMethod 修正（Sprint 4 對齊 DoR）
// 原本 'seller_delivery' → 正確應為 'takkyubin'
export type ShippingMethod = 'pickup' | 'convenience' | 'takkyubin' | 'home_delivery'

// Order 介面補充欄位
export interface Order {
  // ...（既有欄位）
  created_by: OrderCreatedBy        // ✦ Sprint 4 新增
  cancelled_by: OrderCancelledBy | null  // ✦ Sprint 4 新增
  cancelled_at: string | null            // ✦ Sprint 4 新增
  shipping_number: string | null         // ✦ Sprint 4 新增
  shipping_vendor: ShippingVendor | null // ✦ Sprint 4 新增
}

// 商家後台訂單型別
export interface AdminOrder {
  id: string
  store_id: string
  member_id: string
  member_name: string     // JOIN store_members.name
  member_line_id: string  // JOIN store_members.line_id
  status: OrderStatus
  created_by: OrderCreatedBy
  note: string | null
  ordered_at: string
  updated_at: string
  cancelled_by: OrderCancelledBy | null
  cancelled_at: string | null
  items: AdminOrderItem[]
}

export interface AdminOrderItem {
  id: string
  quantity: number
  unit_price: number
  product_name: string
  variant_specs: Record<string, string> | null
}

export interface OrderStatusCounts {
  all: number
  pending_purchase: number
  ordered: number
  allocated: number
  settled: number
  shipped: number
  completed: number
  cancelled: number
}

// 下拉選取用
export interface MemberOption {
  id: string
  name: string
  line_id: string
}

export interface ProductOption {
  id: string
  name: string
}

export interface VariantOption {
  id: string
  specs: Record<string, string>
  price: number
}
```

---

## 7. 認證模式（後台 API Routes）

Sprint 4 後台 API 統一使用以下認證模式（與 Sprint 2 既有後台路由一致）：

```typescript
// 1. 從 Supabase Auth session 取得登入用戶
const rhc = await createRouteHandlerClient()
const { data: { user } } = await rhc.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// 2. 從 email 提取 line_id（auth email 格式：line_{lineId}@internal.rueiselect.local）
const lineId = extractLineId(user.email)
// email regex: /^line_(.+)@internal\.rueiselect\.local$/

// 3. 用 service client 查詢 users 表（繞過 RLS）
const db = createServiceClient()
const { data: dbUser } = await db.from('users').select('id, role').eq('line_id', lineId).single()

// 4. 驗證角色為商家
if (dbUser.role !== 'merchant') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

// 5. 取得此商家的 store_id
const { data: store } = await db.from('stores').select('id').eq('owner_id', dbUser.id).maybeSingle()
```

> **注意：** 後台 DB 查詢全部使用 `createServiceClient()`（service role），繞過 RLS，由 application layer 控制資料隔離，確保只回傳此商家賣場的資料。

---

## 8. Sidebar 導覽更新

`src/app/admin/components/Sidebar.tsx` 修改：
- 移除「即將推出」獨立區塊
- 訂單管理連結移入主導覽（移除 `disabled: true` 和 `tag: 'S3'`）
- 圖示更換為剪貼板（clipboard）風格 SVG

---

## 9. 種子資料更新（supabase/seed.sql）

Sprint 4 新增種子資料：

```sql
-- 更新既有訂單：補全 created_by 欄位（所有既有訂單 = 'customer'）
-- 新增 Sprint 4 測試訂單：
--   order 76：status = 'allocated'（測試顧客結單用）
--   order 77：status = 'allocated'（林小美，測試依顧客分組）
--   order 78：status = 'pending_purchase', created_by = 'merchant'（代客建單測試）
-- 新增對應 order_items：items 87, 88, 89
```

---

## 10. 測試架構

### 10.1 已建立測試

Sprint 4 US-18 的測試檔案尚待建立（參照 DoD 測試要求）。

現有 Sprint 2 migration test 已更新以支援新型別：
- `src/lib/supabase/__tests__/migration-sprint2-orders.test.ts`：修正 Order 測試 fixture，補全 `created_by`, `cancelled_by`, `cancelled_at`, `shipping_number`, `shipping_vendor` 欄位

### 10.2 待建立測試（依 DoD 要求）

```
src/app/api/admin/orders/__tests__/route.test.ts
  → GET：驗證訂單列表 + counts 計算
  → POST：代客建單（含驗證錯誤情境）

src/app/api/admin/orders/[id]/__tests__/route.test.ts
  → PATCH：合法 transition（pending_purchase→ordered, ordered→allocated）
  → PATCH：非法 transition 拒絕（400）

src/app/admin/(protected)/orders/__tests__/OrdersClient.test.tsx
  → 狀態 Tab 切換
  → 空狀態顯示
  → 代客建單標籤顯示

e2e/admin-orders.spec.ts（Playwright）
  → 訂單列表載入 + Tab 切換
  → 標記已訂購流程（含確認 dialog，US-18 AC-18.7）
  → 代客建立訂單流程
```

---

## 11. 待實作項目（Sprint 4 其餘 US）

| US | 功能 | 依賴 |
|----|------|------|
| US-19 | 商家出貨管理（填物流單號 → `shipped`） | `settlements` 表存在（已預建）；需延伸 PATCH `/api/admin/orders/[id]` |
| US-20 | 顧客結單流程（結單頁 + 4 種物流）| 需建立 `/api/orders/[id]/checkout` + `/store/[slug]/checkout/[orderId]` |
| US-21 | 顧客取消訂單（限 `pending_purchase`） | 需建立 `/api/orders/[id]/cancel` + 顧客端按鈕 |
| US-22 | 顧客許願池（送出許願 + 圖片上傳）| 需建立 `wishlists` migration + `wishlist-images` Storage bucket |
| US-23 | 許願池後台（商家查看 + 改狀態）| 依賴 US-22；需建立 `/api/admin/wishlists` + `/admin/wishlists` 頁面 |

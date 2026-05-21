# Sprint 3 — SDD Delta

**版本：** v1.0
**建立日期：** 2026-05-19
**關聯文件：** docs/sdd/system-sdd.md · docs/dor/sprint3-dor.md
**說明：** 本文件僅記錄 Sprint 3 新增或變更的內容，基礎架構見 system-sdd.md，Sprint 2 架構見 sprint2-delta.md

---

## 1. 新增路由總覽

### 頁面路由

| 路由 | 類型 | 說明 | Auth |
|------|------|------|------|
| `/store/[slug]` | SSR（Client Component） | 顧客前台首頁（商品列表） | LIFF + approved member |
| `/store/[slug]/products/[id]` | SSR（Client Component） | 商品詳細頁 | LIFF + approved member |
| `/store/[slug]/orders` | SSR（Client Component） | 顧客訂單查詢 | LIFF + approved member |
| `/store/[slug]/account` | SSR（Client Component） | 顧客帳戶頁（LINE 個人資料 + 會員資訊） | LIFF + approved member |

> `/store/[slug]/join` 為 Sprint 2 已完成的公開路由，不受 Sprint 3 auth guard 管轄。

### 新增 API Routes

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/store-auth` | GET | 驗證顧客 LIFF token + 查詢 approved 狀態 |
| `/api/store-products` | GET | 顧客前台商品列表（含 images 主圖、variants 價格範圍） |
| `/api/store-products/[id]` | GET | 顧客前台商品詳細（含 variants、images） |
| `/api/orders` | POST | 建立訂單（orders + order_items） |
| `/api/orders` | GET | 顧客取得自己的訂單列表（?storeSlug=xxx） |

---

## 2. 資料模型變更

### 2.1 新增 Table

Sprint 3 不新增 table，`orders` / `order_items` 已於 Sprint 2 建立。

### 2.2 新增 RLS Policies

```sql
-- ✦ orders：補全顧客存取權限
CREATE POLICY "顧客可新增自己的訂單"
  ON orders FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM store_members
      WHERE user_id = auth.uid()
        AND status = 'approved'
        AND store_id = orders.store_id
    )
  );

CREATE POLICY "顧客可讀取自己的訂單"
  ON orders FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM store_members
      WHERE user_id = auth.uid()
    )
  );

-- ✦ order_items：補全顧客存取權限
CREATE POLICY "顧客可新增自己訂單的明細"
  ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE member_id IN (
        SELECT id FROM store_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "顧客可讀取自己訂單的明細"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE member_id IN (
        SELECT id FROM store_members WHERE user_id = auth.uid()
      )
    )
  );
```

### 2.3 Migration 檔案

```
supabase/migrations/0003_sprint3.sql
內容：以上 4 條 RLS policy（CREATE POLICY ... ON orders / order_items）
```

---

## 3. 元件架構

### 3.1 新增目錄結構

```
src/
├── app/
│   └── store/
│       └── [slug]/
│           ├── layout.tsx                ← ✦ 顧客前台 Layout（auth guard + 底部導覽）
│           ├── page.tsx                  ← ✦ 商品列表頁（首頁）
│           ├── loading.tsx               ← ✦ 骨架畫面
│           ├── join/                     （Sprint 2 已完成，不修改）
│           │   ├── page.tsx
│           │   └── JoinClient.tsx
│           ├── products/
│           │   └── [id]/
│           │       └── page.tsx          ← ✦ 商品詳細頁
│           ├── orders/
│           │   ├── page.tsx              ← ✦ 顧客訂單查詢頁
│           │   └── loading.tsx           ← ✦ 骨架畫面
│           └── account/
│               └── page.tsx              ← ✦ 顧客帳戶頁
├── components/
│   └── store/                            ← ✦ 顧客前台共用元件
│       ├── StoreLayout/
│       │   ├── StoreHeader.tsx           ← 頂部賣場資訊（頭像 + 名稱）
│       │   └── StoreBottomNav.tsx        ← 底部固定導覽列
│       ├── ProductCard.tsx               ← 商品卡（列表頁用）
│       ├── ProductCategoryGroup.tsx      ← 商品分組（含關鍵字高亮）
│       ├── VariantSelector.tsx           ← 規格選擇器（多維度）
│       ├── QuantitySelector.tsx          ← 數量選擇器（- N +）
│       ├── OrderConfirmModal.tsx         ← 下單確認彈窗
│       ├── OrderStatusBadge.tsx          ← 訂單狀態 badge（顯示顧客端 5 種狀態）
│       ├── OrderStatusFilter.tsx         ← 訂單頁下拉篩選選單
│       └── StoreAccountPage.tsx          ← 帳戶頁內容（LINE 大頭照、會員資訊）
└── lib/
    └── store-auth/
        └── index.ts                      ← ✦ LIFF token 驗證 + member 查詢（server-only）
```

### 3.2 關鍵元件說明

**`/store/[slug]/layout.tsx`（Auth Guard）**

負責：
1. 取得 LIFF access token（client-side）
2. 呼叫 `GET /api/store-auth?slug={slug}` 傳入 token
3. 依回傳狀態決定渲染：approved → 顯示子頁面；pending → 審核中頁；none/rejected → 未加入頁
4. 渲染 `StoreHeader` + 子內容 + `StoreBottomNav`

```tsx
// 概念示意（非最終實作）
'use client'
export default function StoreLayout({ children, params }) {
  const { status, store } = useStoreAuth(params.slug)  // 呼叫 /api/store-auth

  if (status === 'loading') return <StoreSkeleton />
  if (status === 'pending') return <PendingPage />
  if (status === 'none' || status === 'rejected') return <NotMemberPage slug={params.slug} />

  return (
    <>
      <StoreHeader store={store} />
      <main>{children}</main>
      <StoreBottomNav slug={params.slug} />
    </>
  )
}
```

**`VariantSelector.tsx`**
- Props：`variants: ProductVariant[]`（全部 variants）、`onChange: (variantId: string | null) => void`
- 從 variants 中提取所有維度（`Object.keys(specs)`）
- 每個維度顯示一組 badge 選項（可點擊選擇）
- 所有維度都選定後，比對 specs 找到對應的 variant，呼叫 `onChange(variantId)`
- 部分維度未選：`onChange(null)`

**`OrderConfirmModal.tsx`**
- Props：`product`, `variant`, `quantity`, `onConfirm`, `onClose`
- 顯示確認資訊（見 DoD AC-15.8）
- 點「確認下單」→ `onConfirm()` → 呼叫 POST /api/orders → 處理回應

**`OrderStatusBadge.tsx`**
- Props：`displayStatus: CustomerOrderDisplayStatus`
- 使用 design-tokens.css 中的顏色 token
- 支援顧客端 5 種顯示狀態（不直接使用 DB 的 OrderStatus）

**`OrderStatusFilter.tsx`**
- Props：`value: CustomerOrderDisplayStatus | 'all'`、`onChange: (v: CustomerOrderDisplayStatus | 'all') => void`
- 下拉選單選項：全部 / 已訂購 / 已到貨 / 已出貨 / 已完成 / 已取消
- client-side filtering，不重新打 API

**`StoreAccountPage.tsx`**
- 從 `liff.getProfile()` 取得 LINE 大頭照、顯示名稱
- 從 useStoreAuth hook 取得 `member.phone`、`member.line_id`、`member.created_at`
- 顯示「聯絡商家」按鈕（`store.line_official_account_url` 存在時才顯示）

---

## 4. API 規格

### 4.1 GET /api/store-auth

**用途：** 驗證顧客 LIFF token，回傳 member 狀態

**Request Headers：**
```
Authorization: Bearer {liff-access-token}
```

**Query Params：**
```
slug: string  ← 賣場 slug
```

**Response：**
```typescript
// 200 — approved
{
  status: 'approved',
  member: {
    id: string,
    name: string
  },
  store: {
    id: string,
    name: string,
    avatar_url: string | null,
    slug: string
  }
}

// 200 — pending | rejected | none
{
  status: 'pending' | 'rejected' | 'none',
  store: { id, name, avatar_url, slug }
}

// 401 — LIFF token 無效
// 404 — slug 不存在
```

### 4.2 GET /api/store-products

**用途：** 顧客前台商品列表（需 approved member）

**Query Params：**
```
slug: string
```

**Response：**
```typescript
{
  products: {
    id: string,
    name: string,
    description: string | null,
    category: string | null,
    status: 'active',
    primaryImage: string | null,     // product_images 中 sort_order 最小的 url
    priceRange: {
      min: number,
      max: number
    }
  }[]
}
```

### 4.3 GET /api/store-products/[id]

**用途：** 顧客前台商品詳細（需 approved member）

**Query Params：**
```
slug: string
```

**Response：**
```typescript
{
  product: {
    id: string,
    name: string,
    description: string | null,
    category: string | null,
    images: { url: string, sort_order: number }[],
    variants: {
      id: string,
      specs: Record<string, string>,   // {"顏色": "紅", "尺寸": "M"}
      price: number
    }[]
  }
}
```

### 4.4 POST /api/orders

**用途：** 建立訂單（orders + order_items）

**Request Headers：**
```
Authorization: Bearer {liff-access-token}
```

**Request Body：**
```typescript
{
  storeSlug: string,
  productId: string,
  variantId: string,
  quantity: number       // >= 1
}
```

**Server 端驗證：**
1. 驗證 LIFF token → 取得 lineId
2. 查詢 `store_members` 確認是此賣場的 approved member
3. 驗證 `product` 屬於此賣場、status = 'active'
4. 驗證 `variant` 屬於此 product
5. 從 DB 取得 `unit_price = variant.price`（不信任 client）
6. 在 DB transaction 中 INSERT orders + order_items

**Response：**
```typescript
// 201
{ orderId: string }

// 400 — validation error（quantity < 1 / variant 不屬於 product 等）
// 401 — LIFF token 無效
// 403 — 非此賣場 approved member
// 404 — storeSlug / productId 不存在
```

### 4.5 GET /api/orders

**用途：** 顧客訂單列表

**Query Params：**
```
storeSlug: string
```

**Response：**
```typescript
{
  orders: {
    id: string,
    status: OrderStatus,                      // DB 原始狀態（7 種）
    displayStatus: CustomerOrderDisplayStatus, // 顧客端顯示狀態（5 種），server 端計算
    ordered_at: string,
    items: {
      id: string,
      quantity: number,
      unit_price: number,
      product: {
        id: string,
        name: string,
        primaryImage: string | null
      },
      variant: {
        id: string,
        specs: Record<string, string>
      } | null
    }[]
  }[]
}
```

---

## 5. 顧客前台資料流

```
顧客打開 /store/{slug}：
  layout.tsx 初始化 LIFF
    → liff.isLoggedIn() === false → liff.login()
    → liff.isLoggedIn() === true
    → liff.getAccessToken() 取得 token
    → GET /api/store-auth?slug={slug}（帶 Authorization: Bearer {token}）
    → server 端向 LINE 驗證 token → 取得 LINE userId
    → 查詢 store_members WHERE user_id = lineUserId AND store_id = {storeId}
    → 回傳 { status, store, member? }
    → layout 依 status 決定渲染內容

顧客下單：
  商品詳細頁選規格 + 數量 → 立即下單
    → OrderConfirmModal 開啟
    → 確認 → POST /api/orders { storeSlug, productId, variantId, quantity }
    → API 驗證 token + member + product + variant
    → DB transaction: INSERT orders → INSERT order_items
    → 回傳 201 { orderId }
    → 前端 Toast 成功 → router.push('/store/{slug}/orders')
```

---

## 6. Middleware 更新

Sprint 2 middleware 對 `/store/*` 的處理：
- `/store/[slug]/join` → 公開（LIFF 自己處理）
- 其他 `/store/*` → Sprint 2 留待 Sprint 3 處理

Sprint 3 需更新 middleware 的 `/store/*` 規則：

```typescript
// 更新 middleware.ts 的 PUBLIC_PATHS
const PUBLIC_PATHS = [
  '/p/',                      // 公開商品頁（Sprint 2）
  '/store/',                  // 所有顧客前台路由（auth 交由 layout 處理）
]
```

> **決策：** 顧客前台的 auth guard 實作於 `/store/[slug]/layout.tsx`（client-side LIFF），
> 而非 middleware（server-side），原因是 LIFF token 在 client 端初始化，
> middleware 無法直接取得 LIFF token 進行驗證。
> middleware 只負責將 `/store/*` 路由標記為公開（不強制跳轉 admin login），
> 實際的 approved 驗證由 layout 負責。

---

## 7. TypeScript Types 更新

```typescript
// src/types/index.ts 新增

// DB 儲存的後台狀態（7 種）
export type OrderStatus =
  | 'pending_purchase'
  | 'ordered'
  | 'allocated'
  | 'settled'
  | 'shipped'
  | 'completed'
  | 'cancelled'

// 顧客端顯示狀態（5 種），由 server 端 mapping 計算
export type CustomerOrderDisplayStatus =
  | '已訂購'   // DB: pending_purchase | ordered
  | '已到貨'   // DB: allocated | settled
  | '已出貨'   // DB: shipped
  | '已完成'   // DB: completed
  | '已取消'   // DB: cancelled

// mapping 函式（放於 src/lib/order-status.ts）
export function toDisplayStatus(status: OrderStatus): CustomerOrderDisplayStatus {
  switch (status) {
    case 'pending_purchase':
    case 'ordered':        return '已訂購'
    case 'allocated':
    case 'settled':        return '已到貨'
    case 'shipped':        return '已出貨'
    case 'completed':      return '已完成'
    case 'cancelled':      return '已取消'
  }
}

// 顧客前台商品列表用
export interface StoreProductSummary {
  id: string
  name: string
  description: string | null
  category: string | null
  primaryImage: string | null
  priceRange: {
    min: number
    max: number
  }
}

// 顧客前台商品詳細用
export interface StoreProductDetail {
  id: string
  name: string
  description: string | null
  category: string | null
  images: { url: string; sort_order: number }[]
  variants: {
    id: string
    specs: Record<string, string>
    price: number
  }[]
}

// 顧客訂單列表用
export interface CustomerOrder {
  id: string
  status: OrderStatus                      // DB 原始狀態
  displayStatus: CustomerOrderDisplayStatus // 顧客顯示用
  ordered_at: string
  items: CustomerOrderItem[]
}

export interface CustomerOrderItem {
  id: string
  quantity: number
  unit_price: number
  product: {
    id: string
    name: string
    primaryImage: string | null
  }
  variant: {
    id: string
    specs: Record<string, string>
  } | null
}

// 賣場 auth 回傳
export interface StoreAuthResult {
  status: 'approved' | 'pending' | 'rejected' | 'none'
  store: {
    id: string
    name: string
    avatar_url: string | null
    slug: string
    line_official_account_url: string | null
  }
  member?: {
    id: string
    name: string
    phone: string | null
    line_id: string | null
    created_at: string
  }
}
```

---

## 8. 顧客前台 UI 設計方向

### 色彩使用
- 賣場主色：延續 design-tokens.css Forest Green / Sakura Pink
- 底部導覽 active：Forest Green
- 商品卡售價：Sakura Pink
- 訂單狀態 badge（顧客端 5 種）：
  - 已訂購 → `--color-info`（藍）
  - 已到貨 → `--color-success`（綠）
  - 已出貨 → `--color-success-dark`（深綠）
  - 已完成 → `--color-neutral`（灰）
  - 已取消 → `--color-danger`（紅）

### Mobile 優先
- 商品列表：2 欄 grid（375px）→ 3 欄 grid（1024px+）
- 商品詳細：單欄，圖片輪播全寬，規格選擇在圖片下方
- 下單彈窗：從底部滑入（Bottom Sheet 樣式）
- 底部導覽：fixed bottom，**三個 tab（我的帳戶 / 商品 / 我的訂單）**，iOS safe area 支援（`padding-bottom: env(safe-area-inset-bottom)`）
- 帳戶頁：LINE 大頭照 + 名稱居中顯示，資訊列表（電話、LINE ID、加入日期）

### 圖片輪播
- 使用 CSS scroll-snap 實作（不引入額外 library）
- 底部 dot indicator 標示當前位置
- 支援 swipe（touch）和 click 左右按鈕

---

## 9. 測試架構補充

### Mock LIFF（E2E 測試）

Sprint 2 的 join 頁面已建立 LIFF mock 模式。Sprint 3 沿用相同 mock 策略：

```typescript
// 在 E2E 測試中注入 LIFF mock
// playwright/fixtures/liff-mock.ts
await page.addInitScript(() => {
  window.__LIFF_MOCK__ = {
    isLoggedIn: () => true,
    getAccessToken: () => 'mock-token-approved-user',
    login: () => {},
    init: () => Promise.resolve(),
  }
})
```

API 層面：E2E 測試中 `/api/store-auth` 使用 mock token → 回傳預設的 approved member。

### 單元測試結構

```
src/app/api/store-auth/__tests__/route.test.ts
src/app/api/store-products/__tests__/route.test.ts
src/app/api/store-products/[id]/__tests__/route.test.ts
src/app/api/orders/__tests__/route.test.ts
```

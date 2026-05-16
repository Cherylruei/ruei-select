# Sprint 2 — SDD Delta

**版本：** v1.0
**建立日期：** 2026-05-16
**關聯文件：** docs/sdd/system-sdd.md · docs/dor/sprint2-dor.md
**說明：** 本文件僅記錄 Sprint 2 新增或變更的內容，基礎架構見 system-sdd.md

---

## 1. 新增路由總覽

| 路由 | 類型 | 說明 | Auth |
|------|------|------|------|
| `/store/[slug]/join` | SSR Page | 顧客申請加入頁（邀請連結入口） | LIFF 登入後顯示申請表 |
| `/p/[slug]` | SSG + ISR | 公開商品列表頁 | 無（公開） |
| `/p/[slug]/[id]` | SSG + ISR | 公開商品詳細頁 | 無（公開） |
| `/admin/products` | SSR Page | 商品列表（後台） | 商家 |
| `/admin/products/new` | SSR Page | 新增商品（後台） | 商家 |
| `/admin/products/[id]/edit` | SSR Page | 編輯商品（後台） | 商家 |

### 新增 API Routes

| 路由 | 方法 | 說明 |
|------|------|------|
| `/api/customers` | GET | 取得申請列表（?status=pending\|approved\|rejected） |
| `/api/customers/[id]` | PATCH | 審核顧客（通過/拒絕） |
| `/api/customers/apply` | POST | 顧客送出申請（邀請連結 或 公開頁） |
| `/api/products` | GET, POST | 商品列表、新增商品 |
| `/api/products/[id]` | GET, PATCH, DELETE | 商品詳細、編輯、下架 |
| `/api/products/public` | GET | 公開商品列表（無需 auth，給 `/p/[slug]` 用） |
| `/api/ai/copywriting` | POST | AI 文案優化（呼叫 Claude API） |
| `/api/exchange-rates` | GET | 取得匯率（快取 or 即時抓取） |
| `/api/migrations/orders` | — | Sprint 2 只建 DB，無 API |

---

## 2. 資料模型變更

### 2.1 新增 Table

```sql
-- ✦ 商品
CREATE TABLE products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  supplier_id     uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  name            text NOT NULL,
  description     text,
  original_text   text,
  category        text,
  is_public       boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),
  view_count      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ✦ 商品規格（每個規格組合獨立一列）
CREATE TABLE product_variants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  specs           jsonb NOT NULL DEFAULT '{}',  -- {"顏色":"紅","尺寸":"M"}
  price           numeric(10,2) NOT NULL,
  cost            numeric(10,2),
  cost_currency   text NOT NULL DEFAULT 'TWD',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ✦ 商品圖片
CREATE TABLE product_images (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  url             text NOT NULL,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ✦ 匯率快取
CREATE TABLE exchange_rates (
  currency        text PRIMARY KEY,         -- 'JPY','GBP','USD','HKD'
  rate_to_twd     numeric(12,6) NOT NULL,
  fetched_at      timestamptz NOT NULL
);

-- ✦ 訂單（Sprint 2 建模型，Sprint 3 實作 UI）
CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid REFERENCES stores(id) ON DELETE RESTRICT NOT NULL,
  member_id       uuid REFERENCES store_members(id) ON DELETE RESTRICT NOT NULL,
  status          text NOT NULL DEFAULT 'pending_purchase'
                    CHECK (status IN (
                      'pending_purchase','ordered','allocated',
                      'settled','shipped','completed','cancelled'
                    )),
  note            text,
  ordered_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ✦ 訂單明細（Sprint 2 建模型）
CREATE TABLE order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id      uuid REFERENCES products(id) ON DELETE RESTRICT NOT NULL,
  variant_id      uuid REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity        integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      numeric(10,2) NOT NULL,
  unit_cost       numeric(10,2),
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

### 2.2 ALTER 既有 Table

```sql
-- stores：新增公開商品開關
ALTER TABLE stores
  ADD COLUMN allow_public_products boolean NOT NULL DEFAULT false;

-- store_members：新增申請來源與觸發商品
ALTER TABLE store_members
  ADD COLUMN source text NOT NULL DEFAULT 'invite_link'
    CHECK (source IN ('invite_link', 'public_page')),
  ADD COLUMN referring_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN note text;
```

### 2.3 Indexes

```sql
-- products
CREATE INDEX idx_products_store_id      ON products(store_id);
CREATE INDEX idx_products_supplier_id   ON products(supplier_id);
CREATE INDEX idx_products_public        ON products(store_id, is_public, status)
  WHERE is_public = true AND status = 'active';

-- product_variants
CREATE INDEX idx_variants_product_id    ON product_variants(product_id);

-- product_images
CREATE INDEX idx_images_product_id      ON product_images(product_id, sort_order);

-- orders
CREATE INDEX idx_orders_store_id        ON orders(store_id);
CREATE INDEX idx_orders_member_id       ON orders(member_id);
CREATE INDEX idx_orders_status          ON orders(store_id, status);

-- order_items
CREATE INDEX idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- store_members
CREATE INDEX idx_members_source         ON store_members(store_id, source);
```

### 2.4 RLS Policies

```sql
-- products：商家可 CRUD 自己賣場的商品；公開頁 SELECT 不需 auth（用 anon role）
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "商家可操作自己賣場的商品"
  ON products FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

CREATE POLICY "公開商品任何人可讀"
  ON products FOR SELECT
  TO anon
  USING (
    is_public = true
    AND status = 'active'
    AND store_id IN (SELECT id FROM stores WHERE allow_public_products = true)
  );

-- product_variants / product_images：跟隨 products 的存取控制
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "商家可操作自己商品的規格"
  ON product_variants FOR ALL
  USING (product_id IN (
    SELECT id FROM products
    WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  ));
CREATE POLICY "公開商品規格任何人可讀"
  ON product_variants FOR SELECT TO anon
  USING (product_id IN (
    SELECT id FROM products
    WHERE is_public = true AND status = 'active'
      AND store_id IN (SELECT id FROM stores WHERE allow_public_products = true)
  ));

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "商家可操作自己商品的圖片"
  ON product_images FOR ALL
  USING (product_id IN (
    SELECT id FROM products
    WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  ));
CREATE POLICY "公開商品圖片任何人可讀"
  ON product_images FOR SELECT TO anon
  USING (product_id IN (
    SELECT id FROM products
    WHERE is_public = true AND status = 'active'
      AND store_id IN (SELECT id FROM stores WHERE allow_public_products = true)
  ));

-- exchange_rates：任何已登入用戶可讀；只有 service_role 可寫（API route server 端）
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "已登入用戶可讀匯率"
  ON exchange_rates FOR SELECT
  USING (auth.role() = 'authenticated');

-- orders / order_items：商家可讀自己賣場的訂單；顧客可讀自己的訂單（Sprint 3 補全）
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "商家可操作自己賣場的訂單"
  ON orders FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "商家可操作自己賣場的訂單明細"
  ON order_items FOR ALL
  USING (order_id IN (
    SELECT id FROM orders
    WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid())
  ));
```

---

## 3. 元件架構

### 3.1 新增目錄結構

```
src/
├── app/
│   ├── admin/(protected)/
│   │   ├── products/
│   │   │   ├── page.tsx                  ← 商品列表（Server Component）
│   │   │   ├── loading.tsx               ← 骨架畫面
│   │   │   ├── new/
│   │   │   │   └── page.tsx              ← 新增商品（Client Component）
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx          ← 編輯商品（Client Component）
│   │   └── customers/
│   │       ├── page.tsx                  ← 顧客審核（Server Component，Sprint 2 補全）
│   │       └── loading.tsx
│   ├── store/
│   │   └── [slug]/
│   │       └── join/
│   │           └── page.tsx              ← 顧客申請頁（LIFF + 申請表）
│   └── p/                                ← 公開路由（無需 auth）
│       └── [slug]/
│           ├── page.tsx                  ← 公開商品列表（SSG + ISR）
│           ├── [id]/
│           │   └── page.tsx              ← 公開商品詳細（SSG + ISR）
│           └── components/
│               └── ApplyModal.tsx        ← 申請光箱（LIFF + 申請表）
├── components/
│   └── products/
│       ├── ProductForm.tsx               ← 新增/編輯商品表單（共用）
│       ├── VariantBuilder.tsx            ← 多維度規格建立器
│       ├── ImageUploader.tsx             ← 多圖上傳（含拖曳排序）
│       └── CurrencyInput.tsx             ← 成本輸入 + 幣別選擇 + 匯率換算
└── lib/
    ├── ai/
    │   └── copywriting.ts                ← Claude API 呼叫（server-only）
    └── exchange-rates/
        └── index.ts                      ← 匯率查詢（快取邏輯）
```

### 3.2 關鍵元件說明

**`ProductForm.tsx`**
- 新增與編輯共用同一個表單元件，以 `mode: 'new' | 'edit'` props 區分
- 包含：廠商選擇、原始商品文輸入、AI 優化觸發、名稱/描述編輯、規格建立、圖片上傳、是否公開 toggle

**`VariantBuilder.tsx`**
- 商家新增規格維度（e.g. 「顏色」）→ 新增選項（e.g. 「紅、藍」）
- 笛卡爾積自動計算所有規格組合，每個組合獨立設定售價、成本、幣別
- AI 優化後呼叫 `detectVariants(description)` 預填建議規格（可修改）

**`ApplyModal.tsx`（公開頁申請光箱）**
- Step 1：說明文字 + LINE 登入按鈕
- Step 2（LIFF 授權後）：申請表（姓名、手機選填、LINE ID、自我介紹選填）
- Step 3：送出成功訊息
- Props：`storeSlug`, `storeName`, `productId?`（公開頁申請帶 productId；邀請連結入口不帶）

---

## 4. 外部 API 整合

### 4.1 Claude API（AI 文案優化）

```
路由：POST /api/ai/copywriting
觸發：商家點擊「AI 優化文案」按鈕
模型：claude-haiku-4-5（低成本，文案任務足夠）

Request：
{
  originalText: string  // 廠商原始商品文
}

Response：
{
  name: string          // 建議商品名稱
  description: string   // 優化後描述
  detectedVariants: {   // 偵測到的規格維度
    dimension: string   // e.g. "顏色"
    options: string[]   // e.g. ["紅", "藍", "白"]
  }[]
}
```

**System Prompt 核心原則：**
- 只能使用原文中出現的資訊，不得添加或誇大
- 輸出繁體中文，語氣符合台灣代購賣場風格
- 輸出嚴格為 JSON，不加任何額外文字

### 4.2 ExchangeRate-API（匯率換算）

```
路由：GET /api/exchange-rates?currency=JPY
快取策略：
  1. 查 exchange_rates table，fetched_at = today → 直接回傳
  2. fetched_at ≠ today（或無資料）→ 呼叫 ExchangeRate-API → 更新 DB → 回傳
  3. ExchangeRate-API 失敗 → 回傳 DB 中最後快取的值（含警告訊息）

支援幣別：JPY / GBP / USD / HKD
更新頻率：每日一次（免費方案上限 1,500 次/日，全賣場共用快取）
```

---

## 5. 公開頁 SEO 設計

### 5.1 SSG + ISR 策略

```typescript
// /p/[slug]/page.tsx
export async function generateStaticParams() {
  // 只預先生成有 allow_public_products = true 的賣場
  // 最多 100 個（避免 build time 過長）
  return stores.slice(0, 100).map(s => ({ slug: s.slug }))
}

export const revalidate = 3600  // ISR：每小時重新生成
```

### 5.2 Metadata（公開商品詳細頁）

```typescript
export async function generateMetadata({ params }) {
  const product = await getPublicProduct(params.slug, params.id)
  return {
    title: `${product.name} — ${store.name}`,
    description: product.description?.slice(0, 160),
    robots: { index: true, follow: true },
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 160),
      images: [{ url: product.images[0]?.url }],
    },
  }
}
```

### 5.3 JSON-LD（Product Schema）

```typescript
// 插入 <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": product.name,
  "description": product.description,
  "image": product.images.map(i => i.url),
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "TWD",
    "lowPrice": minPrice,
    "highPrice": maxPrice,
    "availability": "https://schema.org/InStock"
  },
  "seller": {
    "@type": "Organization",
    "name": store.name
  }
}
```

---

## 6. 顧客申請流程資料流

```
邀請連結入口：
  顧客點擊 /store/{slug}/join
    → middleware 不攔截（此路由不在 auth 保護範圍）
    → page.tsx 檢查 LIFF 登入狀態
    → 未登入：觸發 liff.login()
    → 已登入：渲染申請表
    → POST /api/customers/apply { storeSlug, source: 'invite_link', ...formData }
    → server 驗證 LIFF token → 取得 lineId
    → INSERT store_members (source='invite_link', referring_product_id=null)
    → 回傳成功 → 頁面顯示「申請已送出」

公開頁入口：
  陌生客點擊「我要下單」
    → ApplyModal 開啟（Step 1）
    → 點 LINE 登入 → liff.login()
    → 授權後 modal 切換至 Step 2（申請表）
    → POST /api/customers/apply { storeSlug, source: 'public_page', productId, ...formData }
    → INSERT store_members (source='public_page', referring_product_id={productId})
    → 回傳成功 → modal 顯示「申請已送出」（Step 3）
```

---

## 7. Middleware 更新

Sprint 1 的 middleware 保護所有 `/admin/*` 和 `/store/*`。

Sprint 2 需新增例外：

```typescript
// 公開路由：不需要 auth
const PUBLIC_PATHS = [
  '/p/',           // 公開商品頁
  '/store/',       // 顧客申請頁（/store/[slug]/join 公開，其他仍需 auth）
]

// 細化 /store/* 的處理：
// /store/[slug]/join  → 公開（顧客端 LIFF 自己處理登入）
// /store/[slug]/*     → 需要顧客 auth（Sprint 3 實作）
```

---

## 8. Supabase Storage

| Bucket | 存取 | 用途 | Sprint |
|--------|------|------|--------|
| `store-avatars` | public read | 賣場頭像 | Sprint 1（已建） |
| `product-images` | public read | 商品圖片 | **Sprint 2 新增** |

```
product-images bucket 命名規則：
  {store_id}/{product_id}/{timestamp}_{filename}
```

---

## 9. TypeScript Types 更新

```typescript
// src/types/index.ts 新增

export interface Product {
  id: string
  store_id: string
  supplier_id: string | null
  name: string
  description: string | null
  original_text: string | null
  category: string | null
  is_public: boolean
  status: 'active' | 'inactive'
  view_count: number
  created_at: string
  updated_at: string
  // relations（joined）
  variants?: ProductVariant[]
  images?: ProductImage[]
  supplier?: Supplier
}

export interface ProductVariant {
  id: string
  product_id: string
  specs: Record<string, string>    // {"顏色": "紅", "尺寸": "M"}
  price: number
  cost: number | null
  cost_currency: string
  created_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  sort_order: number
  created_at: string
}

export interface ExchangeRate {
  currency: string
  rate_to_twd: number
  fetched_at: string
}

export interface Order {
  id: string
  store_id: string
  member_id: string
  status: 'pending_purchase' | 'ordered' | 'allocated' | 'settled' | 'shipped' | 'completed' | 'cancelled'
  note: string | null
  ordered_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  unit_price: number
  unit_cost: number | null
  created_at: string
}

// StoreMember 更新（新增欄位）
export interface StoreMember {
  // ...既有欄位
  source: 'invite_link' | 'public_page'
  referring_product_id: string | null
  note: string | null
}
```

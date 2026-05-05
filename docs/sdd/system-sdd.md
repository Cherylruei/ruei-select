# 芮選系統 · System Design Document (SDD)

**版本：** v1.1
**建立日期：** 2026-05-05
**最後更新：** 2026-05-05（修正 RLS policy、新增 shipping_profiles、取消訂單權限調整）
**技術棧：** Next.js 16 · React 19 · TypeScript · Supabase · Tailwind CSS · LINE LIFF
**部署：** Vercel
**關聯文件：** docs/PRD.md · docs/dor/sprint1-dor.md

---

## 1. 系統架構總覽

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel (CDN)                        │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │  商家後台         │    │  顧客前台                 │   │
│  │  /admin/*        │    │  /store/[slug]/*          │   │
│  │  Next.js SSR     │    │  Next.js SSR              │   │
│  └────────┬─────────┘    └────────────┬─────────────┘   │
│           │                           │                  │
│  ┌────────▼───────────────────────────▼─────────────┐   │
│  │           Next.js API Routes (/api/*)             │   │
│  │  auth · store · product · order · supplier        │   │
│  └────────────────────┬──────────────────────────────┘   │
└───────────────────────┼─────────────────────────────────┘
                        │
          ┌─────────────┼──────────────┐
          │             │              │
    ┌─────▼──────┐ ┌────▼────┐ ┌──────▼──────┐
    │  Supabase  │ │  LINE   │ │ Claude API  │
    │  Database  │ │  LIFF / │ │ (文案優化)  │
    │  Storage   │ │  Login  │ │             │
    │  Auth      │ │  LIFF   │ └─────────────┘
    └────────────┘ └─────────┘
```

---

## 2. 目錄結構

```
ruei-select/
├── claude.md                        ← Claude Code 工作合約
├── docs/
│   ├── PRD.md
│   ├── sdd/
│   │   └── system-sdd.md            ← 本文件
│   ├── dor/sprint1-dor.md
│   ├── dod/sprint1-dod.md
│   └── design/
│       ├── admin-login-final.html
│       └── design-system-final.html
├── km/
├── src/
│   ├── app/
│   │   ├── design-tokens.css
│   │   ├── globals.css
│   │   ├── layout.tsx               ← Root layout（字型、metadata）
│   │   ├── admin/                   ← 商家後台
│   │   │   ├── layout.tsx           ← 後台 layout（驗證商家身份）
│   │   │   ├── login/
│   │   │   │   └── page.tsx         ← 商家登入頁
│   │   │   ├── page.tsx             ← 後台首頁 Dashboard
│   │   │   ├── store/
│   │   │   │   └── page.tsx         ← 賣場設定
│   │   │   ├── suppliers/
│   │   │   │   └── page.tsx         ← 供應商管理
│   │   │   ├── products/
│   │   │   │   ├── page.tsx         ← 商品列表
│   │   │   │   └── new/page.tsx     ← 新增商品
│   │   │   ├── orders/
│   │   │   │   └── page.tsx         ← 訂單管理
│   │   │   └── customers/
│   │   │       └── page.tsx         ← 顧客審核管理
│   │   ├── store/
│   │   │   └── [slug]/              ← 顧客前台
│   │   │       ├── layout.tsx       ← 前台 layout（驗證顧客身份）
│   │   │       ├── login/
│   │   │       │   └── page.tsx     ← 顧客登入/申請頁
│   │   │       ├── page.tsx         ← 賣場首頁（商品列表）
│   │   │       ├── products/
│   │   │       │   └── [id]/page.tsx ← 商品詳細頁
│   │   │       └── orders/
│   │   │           └── page.tsx     ← 顧客訂單查詢
│   │   └── api/
│   │       ├── auth/
│   │       │   └── line/route.ts    ← LINE OAuth callback
│   │       ├── store/route.ts       ← 賣場 CRUD
│   │       ├── suppliers/route.ts   ← 供應商 CRUD
│   │       ├── products/route.ts    ← 商品 CRUD
│   │       ├── orders/route.ts      ← 訂單 CRUD
│   │       ├── customers/route.ts   ← 顧客審核
│   │       └── ai/
│   │           └── optimize/route.ts ← AI 文案優化
│   ├── components/
│   │   ├── ui/                      ← 基礎元件（Button, Badge, Toast…）
│   │   ├── admin/                   ← 後台專用元件
│   │   └── store/                   ← 前台專用元件
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            ← Browser client
│   │   │   ├── server.ts            ← Server client（含 service_role）
│   │   │   └── middleware.ts        ← Session refresh
│   │   ├── line/
│   │   │   └── liff.ts              ← LIFF SDK 封裝
│   │   └── utils.ts                 ← 共用工具函數
│   ├── types/
│   │   └── index.ts                 ← 全域 TypeScript types
│   └── middleware.ts                ← Auth guard（保護 /admin/* 路由）
├── supabase/
│   └── migrations/                  ← SQL migration 檔案
├── tailwind.config.ts
├── .env.local                       ← 環境變數（不 commit）
└── .env.example                     ← 環境變數範本
```

---

## 3. 環境變數

`.env.local`（完整清單，所有 key 都必須設定才能啟動）：

```env
# ── Supabase ──────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...     # 只用於 server，絕對不可 NEXT_PUBLIC

# ── LINE LIFF ─────────────────────────────────────
NEXT_PUBLIC_LIFF_ID=1234567890-abcdefgh

# ── LINE Login（OAuth callback 用）───────────────
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdef1234567890abcdef1234567890

# ── Claude API（AI 文案優化）──────────────────────
CLAUDE_API_KEY=sk-ant-...               # 只用於 server

# ── ExchangeRate API（匯率）──────────────────────
EXCHANGE_RATE_API_KEY=xxxx              # Sprint 2 使用

# ── App ───────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000   # 生產環境改為 Vercel URL
```

`.env.example`（commit 進 repo 的範本，值留空）：

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_LIFF_ID=
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
CLAUDE_API_KEY=
EXCHANGE_RATE_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## 4. 資料庫 Schema（Supabase PostgreSQL）

### 4.1 完整 Tables

```sql
-- ══════════════════════════════════════════════
-- users · 使用者（商家與顧客共用）
-- ══════════════════════════════════════════════
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id       TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL CHECK (role IN ('merchant', 'customer')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_line_id ON users(line_id);


-- ══════════════════════════════════════════════
-- stores · 賣場
-- ══════════════════════════════════════════════
CREATE TABLE stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 30),
  description   TEXT CHECK (char_length(description) <= 200),
  avatar_url    TEXT,
  slug          TEXT UNIQUE NOT NULL,        -- URL 識別碼，自動產生
  invite_token  TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stores_owner_id ON stores(owner_id);
CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_invite_token ON stores(invite_token);


-- ══════════════════════════════════════════════
-- suppliers · 供應商
-- ══════════════════════════════════════════════
CREATE TABLE suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 30),
  note          TEXT CHECK (char_length(note) <= 100),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_suppliers_store_id ON suppliers(store_id);


-- ══════════════════════════════════════════════
-- store_members · 賣場會員（顧客申請加入）
-- ══════════════════════════════════════════════
CREATE TABLE store_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,               -- 顧客填寫的姓名
  phone         TEXT NOT NULL,               -- 顧客填寫的手機
  line_id       TEXT NOT NULL,               -- 顧客填寫的 LINE ID
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  applied_at    TIMESTAMPTZ DEFAULT now(),
  reviewed_at   TIMESTAMPTZ,
  UNIQUE (store_id, user_id)
);
CREATE INDEX idx_store_members_store_id ON store_members(store_id);
CREATE INDEX idx_store_members_status ON store_members(store_id, status);


-- ══════════════════════════════════════════════
-- product_categories · 商品分類（前台用）
-- ══════════════════════════════════════════════
CREATE TABLE product_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_product_categories_store_id ON product_categories(store_id);


-- ══════════════════════════════════════════════
-- products · 商品
-- ══════════════════════════════════════════════
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  category_id     UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,                       -- AI 優化後的商品文案
  description_raw TEXT,                       -- 原始廠商文案
  images          TEXT[] DEFAULT '{}',        -- Supabase Storage URLs
  wholesale_price NUMERIC(10,2),              -- 批發價（台幣）
  sell_price      NUMERIC(10,2) NOT NULL,     -- 售價（台幣）
  -- 以下四欄只有選擇外幣時才有值，台幣商品全部為 NULL
  currency        TEXT DEFAULT 'TWD'
                    CHECK (currency IN ('TWD','JPY','GBP','USD','HKD')),
  original_price  NUMERIC(10,2),              -- 原始外幣價格（NULL = 台幣商品）
  exchange_rate   NUMERIC(10,4),              -- 換算時的匯率（NULL = 台幣商品）
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'soldout')),
  view_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_products_store_id ON products(store_id);
CREATE INDEX idx_products_supplier_id ON products(supplier_id);
CREATE INDEX idx_products_status ON products(store_id, status);


-- ══════════════════════════════════════════════
-- product_specs · 商品規格（多維度）
-- ══════════════════════════════════════════════
CREATE TABLE product_specs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,               -- 規格維度名稱（顏色、尺寸、材質…）
  values        TEXT[] NOT NULL,             -- 規格選項（['紅','藍','綠']）
  sort_order    INTEGER DEFAULT 0
);
CREATE INDEX idx_product_specs_product_id ON product_specs(product_id);


-- ══════════════════════════════════════════════
-- orders · 訂單
-- ══════════════════════════════════════════════
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES users(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  supplier_id     UUID REFERENCES suppliers(id),
  spec_selected   JSONB DEFAULT '{}',        -- {"顏色":"紅","尺寸":"M"}
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL,    -- 下單時的售價
  unit_cost       NUMERIC(10,2),             -- 下單時的成本
  total_amount    NUMERIC(10,2) NOT NULL,    -- quantity * unit_price
  status          TEXT NOT NULL DEFAULT 'pending_purchase'
                    CHECK (status IN (
                      'pending_purchase',    -- 待採買
                      'ordered',             -- 已訂購
                      'allocated',           -- 已配單
                      'settled',             -- 已結單
                      'shipped',             -- 已出貨
                      'completed',           -- 已完成
                      'cancelled'            -- 已取消（只有商家可操作）
                    )),
  ordered_at      TIMESTAMPTZ DEFAULT now(), -- 下單時間（分析用）
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,                      -- 取消原因（商家填寫，取消時必填）
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(store_id, status);
CREATE INDEX idx_orders_ordered_at ON orders(store_id, ordered_at);


-- ══════════════════════════════════════════════
-- shipments · 出貨單
-- ══════════════════════════════════════════════
CREATE TABLE shipments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES users(id),
  shipping_method TEXT NOT NULL
                    CHECK (shipping_method IN (
                      'pickup',              -- 自取
                      'convenience',         -- 超商店到店
                      'seller_delivery',     -- 賣貨便
                      'home_delivery'        -- 宅配
                    )),
  payment_method  TEXT NOT NULL
                    CHECK (payment_method IN (
                      'cash',                -- 現金自取
                      'transfer',            -- 匯款
                      'cod'                  -- 貨到付款（賣貨便）
                    )),
  -- 收件資訊
  recipient_name  TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  store_name      TEXT,                      -- 超商名稱（超商/賣貨便用）
  address         TEXT,                      -- 宅配地址
  shipping_fee    NUMERIC(10,2) DEFAULT 0,   -- 宅配預設 210
  -- 物流資訊
  tracking_number TEXT,                      -- 填入後狀態自動更新
  shipped_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_shipments_store_id ON shipments(store_id);
CREATE INDEX idx_shipments_customer_id ON shipments(customer_id);


-- ══════════════════════════════════════════════
-- shipment_orders · 出貨單 ↔ 訂單（多對多）
-- ══════════════════════════════════════════════
CREATE TABLE shipment_orders (
  shipment_id   UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  PRIMARY KEY (shipment_id, order_id)
);


-- ══════════════════════════════════════════════
-- customer_shipping_profiles · 顧客收件資料
-- 可儲存多筆，自動帶入上次選擇，支援設定預設
-- ══════════════════════════════════════════════
CREATE TABLE customer_shipping_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  label           TEXT,                      -- 自訂標籤（「家裡」「公司」）
  shipping_method TEXT NOT NULL
                    CHECK (shipping_method IN (
                      'pickup', 'convenience', 'seller_delivery', 'home_delivery'
                    )),
  payment_method  TEXT NOT NULL
                    CHECK (payment_method IN ('cash', 'transfer', 'cod')),
  recipient_name  TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  store_name      TEXT,                      -- 超商名稱
  address         TEXT,                      -- 宅配地址
  is_default      BOOLEAN DEFAULT false,     -- 是否為預設收件資料
  used_at         TIMESTAMPTZ,               -- 最後使用時間（排序用）
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_shipping_profiles_user_store ON customer_shipping_profiles(user_id, store_id);
-- 每個用戶在每個賣場只能有一個預設
CREATE UNIQUE INDEX idx_shipping_profiles_default
  ON customer_shipping_profiles(user_id, store_id)
  WHERE is_default = true;


-- ══════════════════════════════════════════════
-- exchange_rates · 匯率快取（每日一次）
-- ══════════════════════════════════════════════
CREATE TABLE exchange_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL DEFAULT 'TWD',
  target_currency TEXT NOT NULL,
  rate          NUMERIC(12,6) NOT NULL,      -- 1 target = rate TWD
  fetched_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (base_currency, target_currency, fetched_at)
);
```

---

### 4.2 Row Level Security (RLS) Policies

**重要：所有 table 都必須啟用 RLS，未列出的操作一律禁止。**

```sql
-- ── 啟用 RLS ──────────────────────────────────
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates  ENABLE ROW LEVEL SECURITY;

-- ── users ─────────────────────────────────────
-- 自己只能讀/改自己的資料
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid()::UUID);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid()::UUID);

-- ── stores ────────────────────────────────────
-- 商家只能讀/改自己的賣場
CREATE POLICY "stores_merchant_all" ON stores
  FOR ALL USING (owner_id = auth.uid()::UUID);

-- 顧客只能讀取自己有申請記錄的賣場（不論審核狀態）
-- 讓顧客在等待審核時仍可看到賣場基本資訊
CREATE POLICY "stores_customer_select" ON stores
  FOR SELECT USING (
    id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()::UUID
    )
  );

-- ── suppliers ─────────────────────────────────
-- 只有賣場 owner 可以操作
CREATE POLICY "suppliers_owner_all" ON suppliers
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

-- ── store_members ─────────────────────────────
-- 商家可以讀取自己賣場的所有申請
CREATE POLICY "store_members_merchant_select" ON store_members
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

-- 商家可以更新（審核）
CREATE POLICY "store_members_merchant_update" ON store_members
  FOR UPDATE USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

-- 顧客可以新增自己的申請
CREATE POLICY "store_members_customer_insert" ON store_members
  FOR INSERT WITH CHECK (user_id = auth.uid()::UUID);

-- 顧客可以讀取自己的申請狀態
CREATE POLICY "store_members_customer_select" ON store_members
  FOR SELECT USING (user_id = auth.uid()::UUID);

-- ── products ──────────────────────────────────
-- 商家可以完整操作自己賣場的商品
CREATE POLICY "products_merchant_all" ON products
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

-- 已核准顧客可以讀取商品
CREATE POLICY "products_customer_select" ON products
  FOR SELECT USING (
    status = 'active' AND
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()::UUID AND status = 'approved'
    )
  );

-- ── orders ────────────────────────────────────
-- 商家可以完整操作自己賣場的所有訂單（含取消）
CREATE POLICY "orders_merchant_all" ON orders
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

-- 顧客只能讀取自己的訂單（不能修改、不能取消）
-- 取消訂單需透過 LINE 私訊告知商家，由商家在後台操作
CREATE POLICY "orders_customer_select" ON orders
  FOR SELECT USING (customer_id = auth.uid()::UUID);

-- 顧客可以新增訂單（下單）
CREATE POLICY "orders_customer_insert" ON orders
  FOR INSERT WITH CHECK (customer_id = auth.uid()::UUID);

-- ── customer_shipping_profiles ───────────────
-- 顧客只能讀取/操作自己的收件資料
CREATE POLICY "shipping_profiles_owner_all" ON customer_shipping_profiles
  FOR ALL USING (user_id = auth.uid()::UUID);

-- ── exchange_rates ────────────────────────────
-- 所有登入用戶可以讀取
CREATE POLICY "exchange_rates_read" ON exchange_rates
  FOR SELECT USING (auth.role() = 'authenticated');
```

---

## 5. Supabase Storage

```
Buckets：
  store-avatars     (Public read)   賣場頭像
  product-images    (Public read)   商品圖片

命名規則：
  store-avatars/{store_id}/{filename}
  product-images/{store_id}/{product_id}/{filename}

上傳限制（在 Supabase Dashboard 設定）：
  最大檔案大小：5MB
  允許的 MIME types：image/jpeg, image/png, image/webp
```

---

## 6. API Routes 設計

### 6.1 Auth

```
POST /api/auth/line
  body: { code: string, redirectUri: string }
  → 交換 LINE access token → 取得用戶資料 → 建立/更新 users → 回傳 session
  → 設定 Supabase session cookie
```

### 6.2 Store

```
GET  /api/store
  → 回傳目前登入商家的賣場資訊

POST /api/store
  body: { name, description?, avatarUrl? }
  → 建立賣場（含自動產生 slug）

PATCH /api/store/[id]
  body: { name?, description?, avatarUrl? }
  → 更新賣場資訊

POST /api/store/[id]/invite-token
  → 重新產生邀請 token（舊 token 失效）
```

### 6.3 Suppliers

```
GET    /api/suppliers
  → 回傳目前賣場的所有供應商（倒序）

POST   /api/suppliers
  body: { name, note? }
  → 新增供應商

PATCH  /api/suppliers/[id]
  body: { name?, note? }
  → 更新供應商

DELETE /api/suppliers/[id]
  → 刪除（若有關聯商品則回傳 409 錯誤）
```

### 6.4 Customers

```
GET  /api/customers?status=pending|approved|rejected
  → 商家取得會員申請列表

PATCH /api/customers/[memberId]
  body: { status: 'approved' | 'rejected' }
  → 審核顧客申請

POST /api/customers/apply
  body: { storeSlug, name, phone, lineId }
  → 顧客申請加入賣場（需顧客身份驗證）
```

### 6.5 Products（Sprint 2）

```
GET    /api/products                 商家取得商品列表
POST   /api/products                 新增商品
PATCH  /api/products/[id]            更新商品
DELETE /api/products/[id]            下架商品

GET    /api/store/[slug]/products    顧客取得商品列表（需 approved 身份）
GET    /api/store/[slug]/products/[id] 商品詳細
```

### 6.6 Orders（Sprint 3）

```
POST /api/orders                     顧客下單
GET  /api/orders/my                  顧客查詢自己的訂單
GET  /api/orders                     商家查詢所有訂單
PATCH /api/orders/[id]/status        商家更新訂單狀態
```

### 6.7 AI 文案（Sprint 2）

```
POST /api/ai/optimize
  body: { rawText: string }
  → 呼叫 Claude API → 回傳優化後文案 + 偵測到的規格
  header: 需商家身份驗證
```

---

## 7. 身份驗證流程

### 7.1 商家登入（LIFF + LINE Login）

```
1. 前端：呼叫 liff.login()
2. LINE：導向 LINE 授權頁面
3. LINE：授權後 redirect 回 /admin/login?code=xxx
4. 前端：呼叫 POST /api/auth/line { code, redirectUri }
5. Server：用 code 換取 LINE access token
6. Server：用 access token 取得 LINE profile
   { userId, displayName, pictureUrl }
7. Server：在 users table upsert（role=merchant）
8. Server：建立 Supabase session
9. 前端：redirect 到 /admin
```

### 7.2 路由保護（middleware.ts）

```typescript
// src/middleware.ts
// 保護 /admin/* — 未登入跳轉 /admin/login
// 保護 /store/[slug]/* — 未登入跳轉 /store/[slug]/login
// /store/[slug]/login — 公開，不保護
// /admin/login — 公開，不保護
```

---

## 8. Slug 自動產生邏輯

```typescript
// 賣場名稱 → slug 的演算法
function generateSlug(storeName: string): string {
  // 1. 轉拼音（使用 pinyin-pro 套件）
  // 2. 小寫、移除特殊字元、空格改 -
  // 3. 加上 4 碼隨機英數
  // 範例：「芮選精品」→ "ruei-xuan-jing-pin-a3f2"
  // 若碰撞（UNIQUE 衝突）→ 重試，重新產生 4 碼隨機英數
}
```

---

## 9. Sprint 1 開發順序

Claude Code 按照以下順序執行，每個步驟完成後才進行下一步：

```
Step 1  環境確認
        □ npm run dev 可以跑起來
        □ Supabase 連線正常（測試 select 1）
        □ .env.local 所有變數都有值

Step 2  資料庫 migration
        □ 建立 supabase/migrations/0001_initial.sql
        □ 包含所有 Tables + Indexes + RLS policies
        □ 在 Supabase Dashboard 執行 SQL 確認成功

Step 3  Supabase client 封裝
        □ src/lib/supabase/client.ts  （browser）
        □ src/lib/supabase/server.ts  （server + service_role）
        □ src/lib/supabase/middleware.ts

Step 4  TypeScript types
        □ src/types/index.ts
        □ 包含所有 table 的 interface

Step 5  Middleware（路由保護）
        □ src/middleware.ts
        □ 保護 /admin/* 路由

Step 6  LINE 登入
        □ src/lib/line/liff.ts
        □ POST /api/auth/line route
        □ /admin/login page（設計稿：docs/design/admin-login-final.html）

Step 7  後台框架
        □ src/app/admin/layout.tsx（Sidebar 導覽）
        □ src/app/admin/page.tsx（Dashboard 空狀態）

Step 8  賣場設定
        □ GET/POST/PATCH /api/store routes
        □ /admin/store page
        □ 頭像上傳（Supabase Storage）

Step 9  供應商管理
        □ CRUD /api/suppliers routes
        □ /admin/suppliers page

Step 10 邀請連結
        □ POST /api/store/[id]/invite-token route
        □ 整合進賣場設定頁

Step 11 顧客審核框架
        □ /admin/customers page（空狀態）
        □ store_members table 確認建好

Step 12 Verify
        □ npm run test（vitest 單元測試）
        □ npm run test:e2e（playwright）
        □ npm run type-check
        □ npm run lint
```

---

## 10. 套件清單

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "@line/liff": "^2.x",
    "pinyin-pro": "^3.x",
    "browser-image-compression": "^2.x"
  },
  "devDependencies": {
    "vitest": "^2.x",
    "@playwright/test": "^1.x",
    "@testing-library/react": "^16.x"
  }
}
```

---

## 11. Delta 記錄（後續 Sprint 更新此節）

| Sprint | 變更項目 | 說明 |
|--------|----------|------|
| Sprint 1 | 初始 Schema | users, stores, suppliers, store_members, exchange_rates |
| Sprint 1 | 新增 | customer_shipping_profiles（收件資料儲存） |
| Sprint 2 | 新增 | products, product_specs, product_categories |
| Sprint 3 | 新增 | orders（完整欄位） |
| Sprint 4 | 新增 | shipments, shipment_orders |

---

## 12. 設計決策備忘（ADR 精簡版）

| 決策 | 選擇 | 原因 |
|------|------|------|
| product_specs 為獨立 table | 有規格的商品才有 row，無規格商品不產生 row | 彈性支援任意維度規格組合 |
| spec_selected 用 JSONB | 而非另一個 table | 每個商品規格維度不同，JSONB 彈性儲存 |
| 取消訂單只有商家可操作 | 顧客 RLS 無 UPDATE 權限 | 防止顧客自行取消，需透過 LINE 聯繫商家 |
| 匯率欄位全部 NULL OK | currency/original_price/exchange_rate 可為 NULL | 大多商品是台幣交易，不應強制填入 |
| 顧客只能讀取有申請的賣場 | stores RLS 改為 store_members 篩選 | 每個賣場是獨立封閉的，不可跨賣場瀏覽 |
| 收件資料獨立儲存 | customer_shipping_profiles table | 方便帶入上次選擇，支援多組收件資料 |

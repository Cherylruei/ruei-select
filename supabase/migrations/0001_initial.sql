-- ══════════════════════════════════════════════════════════════
-- 0001_initial.sql
-- 芮選系統初始 Schema
-- ══════════════════════════════════════════════════════════════

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
  slug          TEXT UNIQUE NOT NULL,
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
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  line_id       TEXT NOT NULL,
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
  description     TEXT,
  description_raw TEXT,
  images          TEXT[] DEFAULT '{}',
  wholesale_price NUMERIC(10,2),
  sell_price      NUMERIC(10,2) NOT NULL,
  currency        TEXT DEFAULT 'TWD'
                    CHECK (currency IN ('TWD','JPY','GBP','USD','HKD')),
  original_price  NUMERIC(10,2),
  exchange_rate   NUMERIC(10,4),
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
  name          TEXT NOT NULL,
  values        TEXT[] NOT NULL,
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
  spec_selected   JSONB DEFAULT '{}',
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL,
  unit_cost       NUMERIC(10,2),
  total_amount    NUMERIC(10,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending_purchase'
                    CHECK (status IN (
                      'pending_purchase',
                      'ordered',
                      'allocated',
                      'settled',
                      'shipped',
                      'completed',
                      'cancelled'
                    )),
  ordered_at      TIMESTAMPTZ DEFAULT now(),
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
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
                      'pickup',
                      'convenience',
                      'seller_delivery',
                      'home_delivery'
                    )),
  payment_method  TEXT NOT NULL
                    CHECK (payment_method IN (
                      'cash',
                      'transfer',
                      'cod'
                    )),
  recipient_name  TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  store_name      TEXT,
  address         TEXT,
  shipping_fee    NUMERIC(10,2) DEFAULT 0,
  tracking_number TEXT,
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
-- ══════════════════════════════════════════════
CREATE TABLE customer_shipping_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  label           TEXT,
  shipping_method TEXT NOT NULL
                    CHECK (shipping_method IN (
                      'pickup', 'convenience', 'seller_delivery', 'home_delivery'
                    )),
  payment_method  TEXT NOT NULL
                    CHECK (payment_method IN ('cash', 'transfer', 'cod')),
  recipient_name  TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  store_name      TEXT,
  address         TEXT,
  is_default      BOOLEAN DEFAULT false,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_shipping_profiles_user_store ON customer_shipping_profiles(user_id, store_id);
CREATE UNIQUE INDEX idx_shipping_profiles_default
  ON customer_shipping_profiles(user_id, store_id)
  WHERE is_default = true;


-- ══════════════════════════════════════════════
-- exchange_rates · 匯率快取（每日一次）
-- ══════════════════════════════════════════════
CREATE TABLE exchange_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   TEXT NOT NULL DEFAULT 'TWD',
  target_currency TEXT NOT NULL,
  rate            NUMERIC(12,6) NOT NULL,
  fetched_at      DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (base_currency, target_currency, fetched_at)
);


-- ══════════════════════════════════════════════
-- RLS：啟用 Row Level Security
-- ══════════════════════════════════════════════
ALTER TABLE users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_shipping_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates            ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════

-- users
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid()::UUID);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid()::UUID);

-- stores
CREATE POLICY "stores_merchant_all" ON stores
  FOR ALL USING (owner_id = auth.uid()::UUID);

CREATE POLICY "stores_customer_select" ON stores
  FOR SELECT USING (
    id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()::UUID
    )
  );

-- suppliers
CREATE POLICY "suppliers_owner_all" ON suppliers
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

-- store_members
CREATE POLICY "store_members_merchant_select" ON store_members
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

CREATE POLICY "store_members_merchant_update" ON store_members
  FOR UPDATE USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

CREATE POLICY "store_members_customer_insert" ON store_members
  FOR INSERT WITH CHECK (user_id = auth.uid()::UUID);

CREATE POLICY "store_members_customer_select" ON store_members
  FOR SELECT USING (user_id = auth.uid()::UUID);

-- product_categories
CREATE POLICY "product_categories_merchant_all" ON product_categories
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

CREATE POLICY "product_categories_customer_select" ON product_categories
  FOR SELECT USING (
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()::UUID AND status = 'approved'
    )
  );

-- products
CREATE POLICY "products_merchant_all" ON products
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

CREATE POLICY "products_customer_select" ON products
  FOR SELECT USING (
    status = 'active' AND
    store_id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid()::UUID AND status = 'approved'
    )
  );

-- product_specs
CREATE POLICY "product_specs_merchant_all" ON product_specs
  FOR ALL USING (
    product_id IN (
      SELECT id FROM products WHERE store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
      )
    )
  );

CREATE POLICY "product_specs_customer_select" ON product_specs
  FOR SELECT USING (
    product_id IN (
      SELECT id FROM products
      WHERE status = 'active' AND store_id IN (
        SELECT store_id FROM store_members
        WHERE user_id = auth.uid()::UUID AND status = 'approved'
      )
    )
  );

-- orders
CREATE POLICY "orders_merchant_all" ON orders
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

CREATE POLICY "orders_customer_select" ON orders
  FOR SELECT USING (customer_id = auth.uid()::UUID);

CREATE POLICY "orders_customer_insert" ON orders
  FOR INSERT WITH CHECK (customer_id = auth.uid()::UUID);

-- shipments
CREATE POLICY "shipments_merchant_all" ON shipments
  FOR ALL USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
    )
  );

CREATE POLICY "shipments_customer_select" ON shipments
  FOR SELECT USING (customer_id = auth.uid()::UUID);

-- shipment_orders
CREATE POLICY "shipment_orders_merchant_all" ON shipment_orders
  FOR ALL USING (
    shipment_id IN (
      SELECT id FROM shipments WHERE store_id IN (
        SELECT id FROM stores WHERE owner_id = auth.uid()::UUID
      )
    )
  );

CREATE POLICY "shipment_orders_customer_select" ON shipment_orders
  FOR SELECT USING (
    shipment_id IN (
      SELECT id FROM shipments WHERE customer_id = auth.uid()::UUID
    )
  );

-- customer_shipping_profiles
CREATE POLICY "shipping_profiles_owner_all" ON customer_shipping_profiles
  FOR ALL USING (user_id = auth.uid()::UUID);

-- exchange_rates
CREATE POLICY "exchange_rates_read" ON exchange_rates
  FOR SELECT USING (auth.role() = 'authenticated');

-- ══════════════════════════════════════════════════════════════
-- 0004_sprint2_products.sql
-- Sprint 2：商品管理、公開商品頁、訂單明細資料模型
-- ══════════════════════════════════════════════════════════════

-- ── products 補充欄位 ─────────────────────────────────────────

-- is_public：是否允許被搜尋引擎索引（預設關閉）
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- sell_price 改為選填（有 variants 時從 variants 取價格）
ALTER TABLE products
  ALTER COLUMN sell_price DROP NOT NULL;

-- ── stores 補充欄位 ───────────────────────────────────────────

-- allow_public_products：賣場層級的公開商品開關
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS allow_public_products BOOLEAN NOT NULL DEFAULT false;

-- ── product_variants · 商品規格（多維度，每組合一列）──────────

CREATE TABLE IF NOT EXISTS product_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  specs           JSONB NOT NULL DEFAULT '{}',  -- {"顏色":"紅","尺寸":"M"}
  price           NUMERIC(10,2) NOT NULL,
  cost            NUMERIC(10,2),
  cost_currency   TEXT NOT NULL DEFAULT 'TWD'
                    CHECK (cost_currency IN ('TWD','JPY','GBP','USD','HKD')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON product_variants(product_id);

-- ── product_images · 商品圖片（獨立表，支援排序）────────────────

CREATE TABLE IF NOT EXISTS product_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_images_product_id ON product_images(product_id, sort_order);

-- ── order_items · 訂單明細（Sprint 2 建模型，Sprint 3 實作 UI）──

CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id      UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      NUMERIC(10,2) NOT NULL,
  unit_cost       NUMERIC(10,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ── products 補充 index ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_public
  ON products(store_id, is_public, status)
  WHERE is_public = true AND status = 'active';

-- ── RLS：product_variants ─────────────────────────────────────

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "variants_merchant_all" ON product_variants
  FOR ALL
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::UUID)
    )
  );

CREATE POLICY IF NOT EXISTS "variants_public_select" ON product_variants
  FOR SELECT TO anon
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE is_public = true
        AND status = 'active'
        AND store_id IN (SELECT id FROM stores WHERE allow_public_products = true)
    )
  );

-- ── RLS：product_images ───────────────────────────────────────

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "images_merchant_all" ON product_images
  FOR ALL
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::UUID)
    )
  );

CREATE POLICY IF NOT EXISTS "images_public_select" ON product_images
  FOR SELECT TO anon
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE is_public = true
        AND status = 'active'
        AND store_id IN (SELECT id FROM stores WHERE allow_public_products = true)
    )
  );

-- ── RLS：products 補充 anon 公開讀取政策 ─────────────────────────

CREATE POLICY IF NOT EXISTS "products_public_select" ON products
  FOR SELECT TO anon
  USING (
    is_public = true
    AND status = 'active'
    AND store_id IN (SELECT id FROM stores WHERE allow_public_products = true)
  );

-- ── RLS：order_items ──────────────────────────────────────────

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "order_items_merchant_all" ON order_items
  FOR ALL
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::UUID)
    )
  );

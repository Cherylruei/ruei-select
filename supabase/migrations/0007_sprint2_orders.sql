-- ══════════════════════════════════════════════════════════════
-- 0007_sprint2_orders.sql
-- Sprint 2：訂單資料模型（重建符合 Sprint 2 header/line-item 設計）
-- ══════════════════════════════════════════════════════════════
--
-- 背景：
-- 0001_initial.sql 的 orders 為 Sprint 1 設計（單一產品訂單列）
-- Sprint 2 調整為 header/line-item 架構：
--   orders      = 訂單表頭（以 store_member 為單位）
--   order_items = 訂單明細（以 product/variant 為單位）
-- Sprint 2 不實作下單 UI，此 migration 僅建立資料模型
-- ══════════════════════════════════════════════════════════════

-- ── 1. 移除依賴 orders 的表格 ──────────────────────────────────

-- shipment_orders 透過 FK 關聯舊版 orders，Sprint 5 重建
DROP TABLE IF EXISTS shipment_orders;

-- order_items 在 0004 已建立（FK → orders），需先移除才能重建 orders
DROP TABLE IF EXISTS order_items;

-- ── 2. 移除舊版 orders（Sprint 1 設計）────────────────────────

DROP TABLE IF EXISTS orders;

-- ── 3. 建立新版 orders（Sprint 2 header 設計）──────────────────

CREATE TABLE orders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID        NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  member_id   UUID        NOT NULL REFERENCES store_members(id) ON DELETE RESTRICT,
  status      TEXT        NOT NULL DEFAULT 'pending_purchase'
                CHECK (status IN (
                  'pending_purchase', 'ordered', 'allocated',
                  'settled', 'shipped', 'completed', 'cancelled'
                )),
  note        TEXT,
  ordered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. 建立 order_items（Sprint 2 line-item 設計）──────────────

CREATE TABLE order_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id  UUID        REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity    INTEGER     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL,
  unit_cost   NUMERIC(10,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. Indexes ─────────────────────────────────────────────────

CREATE INDEX idx_orders_store_id   ON orders(store_id);
CREATE INDEX idx_orders_member_id  ON orders(member_id);
CREATE INDEX idx_orders_status     ON orders(store_id, status);

CREATE INDEX idx_order_items_order_id   ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ── 6. RLS：orders ─────────────────────────────────────────────

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 商家可操作自己賣場的所有訂單
CREATE POLICY "orders_merchant_all" ON orders
  FOR ALL
  USING (
    store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::UUID)
  );

-- ── 7. RLS：order_items ────────────────────────────────────────

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 商家可操作自己賣場訂單的所有明細
CREATE POLICY "order_items_merchant_all" ON order_items
  FOR ALL
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::UUID)
    )
  );

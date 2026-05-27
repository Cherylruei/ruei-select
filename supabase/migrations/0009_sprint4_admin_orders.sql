-- ══════════════════════════════════════════════════════════════
-- 0009_sprint4_admin_orders.sql
-- Sprint 4：orders 表補充欄位 + admin orders RLS
-- ══════════════════════════════════════════════════════════════

-- ── 1. orders 表補充欄位 ───────────────────────────────────────

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS created_by    text NOT NULL DEFAULT 'customer'
    CHECK (created_by IN ('customer', 'merchant')),
  ADD COLUMN IF NOT EXISTS cancelled_by  text
    CHECK (cancelled_by IN ('customer', 'merchant')),
  ADD COLUMN IF NOT EXISTS cancelled_at  timestamptz,
  ADD COLUMN IF NOT EXISTS shipping_number text,
  ADD COLUMN IF NOT EXISTS shipping_vendor text
    CHECK (shipping_vendor IN ('黑貓', '7-11', '全家', '賣貨便', '其他'));

-- ── 2. settlements 資料表（顧客結單收件資訊，US-20 預建）────────

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
  store_name        text,
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- 商家可讀取自己賣場所有結單資訊
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

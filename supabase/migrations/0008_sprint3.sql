-- ══════════════════════════════════════════════════════════════
-- 0008_sprint3.sql
-- Sprint 3：補全顧客存取 orders / order_items 的 RLS policies
-- ══════════════════════════════════════════════════════════════

-- ── orders：顧客存取權限 ───────────────────────────────────────

CREATE POLICY "顧客可新增自己的訂單"
  ON orders FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM store_members
      WHERE user_id = auth.uid()::UUID
        AND status = 'approved'
        AND store_id = orders.store_id
    )
  );

CREATE POLICY "顧客可讀取自己的訂單"
  ON orders FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM store_members
      WHERE user_id = auth.uid()::UUID
    )
  );

-- ── order_items：顧客存取權限 ──────────────────────────────────

CREATE POLICY "顧客可新增自己訂單的明細"
  ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE member_id IN (
        SELECT id FROM store_members WHERE user_id = auth.uid()::UUID
      )
    )
  );

CREATE POLICY "顧客可讀取自己訂單的明細"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE member_id IN (
        SELECT id FROM store_members WHERE user_id = auth.uid()::UUID
      )
    )
  );

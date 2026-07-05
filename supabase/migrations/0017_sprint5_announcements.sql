-- Sprint 5 · 商家公告管理（US-NEW-ANNOUNCE）
-- store_announcements 表 + RLS。前台已讀狀態用 localStorage，不建 announcement_reads 表。

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

CREATE INDEX IF NOT EXISTS idx_store_announcements_store
  ON store_announcements (store_id, created_at DESC);

-- RLS
ALTER TABLE store_announcements ENABLE ROW LEVEL SECURITY;

-- 商家可讀寫自己賣場的公告
DROP POLICY IF EXISTS "announcements_merchant_all" ON store_announcements;
CREATE POLICY "announcements_merchant_all" ON store_announcements
  FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()::UUID));

-- 顧客只能讀取發布中且未到期的公告
DROP POLICY IF EXISTS "announcements_customer_select" ON store_announcements;
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

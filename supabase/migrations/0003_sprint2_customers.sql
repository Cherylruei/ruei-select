-- ══════════════════════════════════════════════════════════════
-- 0003_sprint2_customers.sql
-- Sprint 2：顧客申請加入功能所需的 schema 變更
-- ══════════════════════════════════════════════════════════════

-- ── store_members 新增欄位 ────────────────────────────────────

-- phone 改為選填
ALTER TABLE store_members
  ALTER COLUMN phone DROP NOT NULL;

-- 申請來源（邀請連結 / 公開頁面）
ALTER TABLE store_members
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'invite_link'
    CHECK (source IN ('invite_link', 'public_page'));

-- 引薦商品（從公開商品頁申請時紀錄來源商品）
ALTER TABLE store_members
  ADD COLUMN IF NOT EXISTS referring_product_id UUID
    REFERENCES products(id) ON DELETE SET NULL;

-- 申請備註（自我介紹）
ALTER TABLE store_members
  ADD COLUMN IF NOT EXISTS note TEXT
    CHECK (char_length(note) <= 100);

CREATE INDEX IF NOT EXISTS idx_store_members_source
  ON store_members(store_id, source);

-- ── suppliers 補充 website_url（Sprint 1 補齊）────────────────

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS website_url TEXT;

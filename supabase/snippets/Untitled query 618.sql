-- ══════════════════════════════════════════════════════════════
-- 0010_sprint4_suppliers.sql
-- Sprint 4：suppliers 補充欄位（廠商標記、LINE 群組、幣別、到貨天數、電話）
-- ══════════════════════════════════════════════════════════════

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS tag              TEXT CHECK (char_length(tag) <= 8),
  ADD COLUMN IF NOT EXISTS line_group       TEXT,
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS currency         TEXT NOT NULL DEFAULT 'TWD'
    CHECK (currency IN ('TWD', 'JPY', 'USD', 'HKD')),
  ADD COLUMN IF NOT EXISTS avg_arrival_days SMALLINT CHECK (avg_arrival_days >= 0);

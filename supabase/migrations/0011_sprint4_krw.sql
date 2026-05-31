-- ══════════════════════════════════════════════════════════════
-- 0011_sprint4_krw.sql
-- Sprint 4：新增韓元（KRW）支援
-- 更新 product_variants.cost_currency、exchange_rates.currency、suppliers.currency 的 CHECK 約束
-- ══════════════════════════════════════════════════════════════

-- ── product_variants.cost_currency ─────────────────────────────
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'product_variants'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%cost_currency%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE product_variants DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_cost_currency_check
  CHECK (cost_currency IN ('TWD','JPY','KRW','GBP','USD','HKD'));

-- ── exchange_rates.target_currency ─────────────────────────────
-- 注意：exchange_rates 無 currency 欄；外幣代碼存放於 target_currency
DO $$
DECLARE cname TEXT;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'exchange_rates'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%target_currency%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE exchange_rates DROP CONSTRAINT %I', cname);
  END IF;
END $$;
ALTER TABLE exchange_rates
  ADD CONSTRAINT exchange_rates_target_currency_check
  CHECK (target_currency IN ('TWD','JPY','KRW','GBP','USD','HKD'));

-- ── suppliers.currency ──────────────────────────────────────────
-- 若 0010 尚未執行（欄位不存在）→ 先建立欄位，再加約束
-- 若 0010 已執行（欄位存在）→ 刪舊約束，加新約束（含 KRW）
DO $$
DECLARE cname TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'suppliers'
      AND column_name  = 'currency'
  ) THEN
    -- 0010 尚未執行：補齊所有欄位
    ALTER TABLE suppliers
      ADD COLUMN IF NOT EXISTS tag              TEXT CHECK (char_length(tag) <= 8),
      ADD COLUMN IF NOT EXISTS line_group       TEXT,
      ADD COLUMN IF NOT EXISTS phone            TEXT,
      ADD COLUMN IF NOT EXISTS currency         TEXT NOT NULL DEFAULT 'TWD',
      ADD COLUMN IF NOT EXISTS avg_arrival_days SMALLINT CHECK (avg_arrival_days >= 0);
  ELSE
    -- 0010 已執行：找出舊的 currency CHECK 約束並刪除
    SELECT conname INTO cname
    FROM pg_constraint
    WHERE conrelid = 'suppliers'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%currency%';
    IF cname IS NOT NULL THEN
      EXECUTE format('ALTER TABLE suppliers DROP CONSTRAINT %I', cname);
    END IF;
  END IF;
END $$;
ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_currency_check
  CHECK (currency IN ('TWD','JPY','KRW','USD','HKD'));

-- Sprint 5: 在 settlements 表新增 bundle_id 欄位
-- bundle_id 用來將同一次代客結單的多筆訂單綁定為一個整體出貨單位
-- NULL = 舊版單筆結單（向下相容，前台各自視為獨立 bundle）

ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS bundle_id uuid;

-- 為舊有資料各自補上獨立的 bundle_id（每筆舊結單自成一個 bundle）
UPDATE settlements
SET bundle_id = gen_random_uuid()
WHERE bundle_id IS NULL;

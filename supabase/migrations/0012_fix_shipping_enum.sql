-- 將 settlements.shipping_method 的 'takkyubin'（日文宅急便，命名有誤）
-- 改為 'maihuobian'（賣貨便拼音，語意清晰）
-- 同時移除 payment_method 中不符合 DoR 的值（LINE Pay 未在 DoR 定義，先保留 schema 相容）

-- 1. 先刪舊 CHECK constraint
ALTER TABLE settlements
  DROP CONSTRAINT IF EXISTS settlements_shipping_method_check;

-- 2. 加新 CHECK constraint（takkyubin → maihuobian）
ALTER TABLE settlements
  ADD CONSTRAINT settlements_shipping_method_check
  CHECK (shipping_method IN ('pickup', 'convenience', 'maihuobian', 'home_delivery'));

-- 3. 更新既有資料（若有舊測試資料）
UPDATE settlements
  SET shipping_method = 'maihuobian'
  WHERE shipping_method = 'takkyubin';

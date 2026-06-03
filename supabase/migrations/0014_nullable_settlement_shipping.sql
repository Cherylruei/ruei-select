-- 結單時不再要求立即填寫出貨資訊
-- 商家先結單（已結單），再於已結單頁面填物流/付款資訊出貨
ALTER TABLE settlements
  ALTER COLUMN shipping_method DROP NOT NULL,
  ALTER COLUMN payment_method DROP NOT NULL;

-- ══════════════════════════════════════════════════════════════
-- 0006_product_ends_at.sql
-- Sprint 2：商品截單日期（下架日期）
-- ══════════════════════════════════════════════════════════════

-- ends_at：截單時間，到期後自動從公開頁下架
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- 更新公開商品 RLS Policy，加入 ends_at 過濾
DROP POLICY IF EXISTS "products_public_select" ON products;
CREATE POLICY "products_public_select" ON products
  FOR SELECT TO anon
  USING (
    is_public = true
    AND status = 'active'
    AND (ends_at IS NULL OR ends_at > now())
    AND store_id IN (SELECT id FROM stores WHERE allow_public_products = true)
  );

-- 更新 product_variants 公開讀取 Policy，同步加入 ends_at 過濾
DROP POLICY IF EXISTS "variants_public_select" ON product_variants;
CREATE POLICY "variants_public_select" ON product_variants
  FOR SELECT TO anon
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE is_public = true
        AND status = 'active'
        AND (ends_at IS NULL OR ends_at > now())
        AND store_id IN (SELECT id FROM stores WHERE allow_public_products = true)
    )
  );

-- 更新 product_images 公開讀取 Policy，同步加入 ends_at 過濾
DROP POLICY IF EXISTS "images_public_select" ON product_images;
CREATE POLICY "images_public_select" ON product_images
  FOR SELECT TO anon
  USING (
    product_id IN (
      SELECT id FROM products
      WHERE is_public = true
        AND status = 'active'
        AND (ends_at IS NULL OR ends_at > now())
        AND store_id IN (SELECT id FROM stores WHERE allow_public_products = true)
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 0005_product_images_bucket.sql
-- 建立 product-images Storage Bucket
-- ══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: 公開讀取
CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

-- RLS: 允許 authenticated user 上傳
CREATE POLICY "product_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

-- RLS: 允許 authenticated user 刪除
CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');

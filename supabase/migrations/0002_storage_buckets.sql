-- ══════════════════════════════════════════════════════════════
-- 0002_storage_buckets.sql
-- 建立 Storage Bucket
-- ══════════════════════════════════════════════════════════════

-- store-avatars: 賣場頭像（公開讀取）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-avatars',
  'store-avatars',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: 允許 authenticated user 上傳
CREATE POLICY "store_avatars_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-avatars');

-- RLS: 公開讀取
CREATE POLICY "store_avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-avatars');

-- RLS: 允許 authenticated user 刪除（換頭像時清理舊檔）
CREATE POLICY "store_avatars_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'store-avatars');

-- RLS: 允許 authenticated user 覆寫（upsert）
CREATE POLICY "store_avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'store-avatars');

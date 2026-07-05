-- Sprint 5 · 賣場橫幅改版（US-NEW-BANNER-IMG）
-- 拿掉純文字橫幅欄位，改為商家自行上傳橫幅圖片 + 可選點擊連結。
-- 沒有上傳圖片時，前台維持現有漸層+文字 hardcode 版面（不再從資料庫讀文字）。

ALTER TABLE stores
  DROP COLUMN IF EXISTS banner_badge,
  DROP COLUMN IF EXISTS banner_title_1,
  DROP COLUMN IF EXISTS banner_title_2;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS banner_image_url text,  -- 商家上傳的橫幅圖片，NULL = 顯示預設漸層版面
  ADD COLUMN IF NOT EXISTS banner_link_url  text;  -- 點擊橫幅要前往的網址，NULL = 不可點擊

-- store-banners: 賣場首頁橫幅圖片（公開讀取）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-banners',
  'store-banners',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "store_banners_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-banners');

CREATE POLICY "store_banners_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-banners');

CREATE POLICY "store_banners_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'store-banners');

CREATE POLICY "store_banners_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'store-banners');

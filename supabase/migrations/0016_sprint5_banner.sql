-- Sprint 5 · 賣場橫幅設定（US-NEW-BANNER）
-- stores 表新增 3 個橫幅文字欄位，皆 DEFAULT NULL。
-- NULL 時前台顯示 hardcode 預設文字，保持向下相容。

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS banner_badge    text,   -- Badge 標籤，如「★ 本週精選商品」
  ADD COLUMN IF NOT EXISTS banner_title_1  text,   -- 主標題第一行，如「精選好物」
  ADD COLUMN IF NOT EXISTS banner_title_2  text;   -- 主標題第二行，如「讓你的生活更精彩」

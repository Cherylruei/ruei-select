-- ══════════════════════════════════════════════════════════════
-- seed.sql — 本地開發測試資料
-- 執行方式：supabase db reset（會先套用所有 migrations 再執行此檔）
-- 固定 UUID 確保每次 reset 後資料一致
-- ══════════════════════════════════════════════════════════════

-- ── 真實商家（Cheryl）────────────────────────────────────────

INSERT INTO users (id, line_id, display_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'u98bcd58325aa087ed715b13f4c12fe21',
  'Cheryl',
  'merchant'
) ON CONFLICT (id) DO NOTHING;

-- ── 真實賣場（ruiruidaigou-5e8w）────────────────────────────

INSERT INTO stores (id, owner_id, name, slug, invite_token, allow_public_products)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000003',
  '芮芮代購',
  'ruiruidaigou-5e8w',
  'dev-invite-token-real',
  false
) ON CONFLICT (id) DO NOTHING;

-- ── 開發用商家 user ───────────────────────────────────────────

INSERT INTO users (id, line_id, display_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'U_dev_merchant',
  '開發商家',
  'merchant'
) ON CONFLICT (id) DO NOTHING;

-- ── 測試賣場 ──────────────────────────────────────────────────

INSERT INTO stores (id, owner_id, name, slug, invite_token, allow_public_products)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '芮選測試賣場',
  'test-store',
  'dev-invite-token-fixed',
  false
) ON CONFLICT (id) DO NOTHING;

-- ── 開發用顧客 user（dev-mock-token 的身份）──────────────────
-- verifyLiffToken('dev-mock-token') 回傳 lineId: 'U_dev_mock'
-- 所有顧客前台操作（下單、訂單查詢、帳戶）都以此身份進行

INSERT INTO users (id, line_id, display_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'U_dev_mock',
  '測試用戶',
  'customer'
) ON CONFLICT (id) DO NOTHING;

-- ── U_dev_mock 的 approved 會員資格（test-store）─────────────

INSERT INTO store_members (
  id, store_id, user_id, name, phone, line_id,
  status, source, applied_at, reviewed_at
)
VALUES (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000004',
  '測試用戶',
  '0912345678',
  'U_dev_mock',
  'approved',
  'invite_link',
  now() - interval '30 days',
  now() - interval '29 days'
) ON CONFLICT (id) DO NOTHING;

-- ── 商品分類 ──────────────────────────────────────────────────

INSERT INTO product_categories (id, store_id, name, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000010', '保養品', 1),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000010', '美妝', 2)
ON CONFLICT (id) DO NOTHING;

-- ── 商品 1：日本面膜（保養品，有兩種顏色規格）────────────────

INSERT INTO products (
  id, store_id, category_id, name, description,
  sell_price, status, is_public
)
VALUES (
  '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000031',
  '日本 LULULUN 面膜',
  '日本直送保濕面膜，每盒 32 片，長效保濕配方。',
  399,
  'active',
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, specs, price)
VALUES
  (
    '00000000-0000-0000-0000-000000000051',
    '00000000-0000-0000-0000-000000000041',
    '{"顏色": "粉紅"}',
    399
  ),
  (
    '00000000-0000-0000-0000-000000000052',
    '00000000-0000-0000-0000-000000000041',
    '{"顏色": "白色"}',
    420
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_images (id, product_id, url, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000061',
  '00000000-0000-0000-0000-000000000041',
  'https://placehold.co/400x400/fce4ec/c2185b?text=面膜',
  1
) ON CONFLICT (id) DO NOTHING;

-- ── 商品 2：韓國保濕霜（保養品，有兩種容量規格）─────────────

INSERT INTO products (
  id, store_id, category_id, name, description,
  sell_price, status, is_public
)
VALUES (
  '00000000-0000-0000-0000-000000000042',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000031',
  '韓國 Innisfree 保濕霜',
  '清透保濕質地，適合油性及混合性肌膚。',
  550,
  'active',
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, specs, price)
VALUES
  (
    '00000000-0000-0000-0000-000000000053',
    '00000000-0000-0000-0000-000000000042',
    '{"容量": "50ml"}',
    550
  ),
  (
    '00000000-0000-0000-0000-000000000054',
    '00000000-0000-0000-0000-000000000042',
    '{"容量": "100ml"}',
    850
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_images (id, product_id, url, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000062',
  '00000000-0000-0000-0000-000000000042',
  'https://placehold.co/400x400/e8f5e9/2e7d32?text=保濕霜',
  1
) ON CONFLICT (id) DO NOTHING;

-- ── 商品 3：日本口紅（美妝，有多維度規格）────────────────────

INSERT INTO products (
  id, store_id, category_id, name, description,
  sell_price, status, is_public
)
VALUES (
  '00000000-0000-0000-0000-000000000043',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000032',
  '日本 KATE 持色口紅',
  '日本熱銷持色口紅，不易暈色。',
  380,
  'active',
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, specs, price)
VALUES
  (
    '00000000-0000-0000-0000-000000000055',
    '00000000-0000-0000-0000-000000000043',
    '{"顏色": "珊瑚紅", "類型": "滋潤"}',
    380
  ),
  (
    '00000000-0000-0000-0000-000000000056',
    '00000000-0000-0000-0000-000000000043',
    '{"顏色": "玫瑰粉", "類型": "滋潤"}',
    380
  ),
  (
    '00000000-0000-0000-0000-000000000057',
    '00000000-0000-0000-0000-000000000043',
    '{"顏色": "珊瑚紅", "類型": "霧面"}',
    420
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_images (id, product_id, url, sort_order)
VALUES (
  '00000000-0000-0000-0000-000000000063',
  '00000000-0000-0000-0000-000000000043',
  'https://placehold.co/400x400/fce4ec/e91e63?text=口紅',
  1
) ON CONFLICT (id) DO NOTHING;

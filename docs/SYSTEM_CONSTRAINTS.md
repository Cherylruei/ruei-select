# SYSTEM_CONSTRAINTS.md — 芮選系統架構約束

> **Claude 開始任何開發工作前必讀。**
> 這份文件記錄已確認的架構決策與禁止事項，來自過去踩坑與 Cheryl 明確確認。
> 如需修改，必須提出變更請 Cheryl 確認，不得自行修改。

---

## 🔒 認證架構（Cheryl 確認：2026-05-24）

| 對象 | 登入方式 | 說明 |
|------|---------|------|
| **前台顧客** | LINE LIFF（唯一方式） | 使用 `verifyLiffToken`，生產環境為真實 LIFF token |
| **後台商家** | Supabase Auth（email/password） | 後台管理介面專用 |

### ❌ 絕對禁止

- 禁止為前台顧客建立 email/password 登入方式
- 禁止在 seed.sql 建立「前台用」的 email/password 測試帳號
- 禁止把 `dev-mock-token` bypass 當成功能測試或驗收依據
- 禁止為了讓功能「跑起來」而繞過真實的 LIFF 認證流程

### ✅ dev-mock-token 正確用途

`dev-mock-token` **只用於本地開發啟動**，讓開發者不需要開 LINE App 也能測試 UI。

完整鏈條（三個環節都必須存在）：
```
verifyLiffToken('dev-mock-token')
  → 回傳 { lineId: 'U_dev_mock' }
  → users 表有 line_id = 'U_dev_mock' 的 row（seed.sql）
  → store_members 有 user_id + store_id + status = 'approved'（seed.sql）
```

任一環斷掉 → 前台顯示「您尚未加入此賣場」。

**功能驗收時必須使用真實 LINE 帳號或完整的 LIFF 模擬流程。**

---

## 🔒 種子資料規範（Cheryl 確認：2026-05-24）

每個 Sprint 的 seed.sql 必須包含**完整使用者旅程**，不能只有單一角色的資料。

### 必要資料清單

```sql
-- 後台商家（Supabase Auth）
-- 1 個商家帳號，email/password 登入

-- 前台顧客（LINE 登入，不得有 email/password）
-- 至少 2 位顧客，使用 line_id（如 'U_test_customer_01'）
-- 對應的 users 表 row + store_members（status = 'approved'）

-- 賣場
-- 1 個賣場，slug 已設定

-- 商品
-- 至少 3 個 status = 'active' 的商品，含 product_variants + product_images

-- 訂單（Sprint 3 起必須包含）
-- 至少 1 筆 status = 'pending_purchase'（商家可操作）
-- 至少 1 筆 status = 'allocated'（顧客可結單，Sprint 4 起）
-- 所有訂單的 member_id 對應使用 line_id 的顧客
```

### ❌ 種子資料禁止事項

- 禁止只建立商家帳號沒有顧客資料
- 禁止建立「前台顧客用」的 email/password 帳號
- 禁止種子資料只覆蓋單一功能（必須前後台串聯可驗證）
- 建立種子資料前必須先看 [USER_JOURNEYS.md](USER_JOURNEYS.md)

---

## 🔒 訂單流向約束（Cheryl 確認：2026-05-24）

訂單的生命週期必須前後台完全串聯，不得跳過任何環節。

```
顧客自行下單 OR 商家代客建立
  ↓
orders 表（status = 'pending_purchase'）
  ↓ 立即同步
商家後台 /admin/orders → 可見此訂單
前台 /store/{slug}/orders → 顧客可見此訂單
```

### 商家代客建立訂單

- `created_by = 'merchant'`（顧客自行下單為 `'customer'`）
- 前台顧客同樣可以在自己的訂單頁看到（不標示來源）
- 不得建立「只有後台看得到、前台看不到」的訂單

### 功能完成標準

**單一功能跑通 ≠ 完成。** 必須驗證：
- 顧客操作 → 商家後台立即反映
- 商家操作 → 顧客前台立即反映

---

## 🔒 LINE Messaging API（Cheryl 確認：2026-05-24）

- ❌ **不在 Sprint 1–5 開發範圍內**
- Sprint 4 以「依顧客分組查看 + 手動 LINE 私訊」替代
- 整個產品功能完整後才規劃實作

---

## 🔒 Storage 規範

| Bucket | 用途 | 建立時機 |
|--------|------|---------|
| `store-avatars` | 賣場頭像 | Sprint 1 |
| `product-images` | 商品圖片（一般上架 + 快速上架共用） | Sprint 2 |
| `wishlist-images` | 許願池商品照片 | Sprint 4 |

- 禁止另建新 bucket，除非有明確需求且 Cheryl 確認
- 快速上架（Sprint 5）使用 `product-images` bucket，不另建

---

## 過去踩坑記錄（導致此文件建立的原因）

1. **bypass 當成驗收** — dev-mock-token 被當成完整的 auth 測試，上 production 後 LIFF 登入失敗
2. **種子資料只有商家** — 沒有顧客資料，導致前台流程無法驗證，後台收不到訂單
3. **email/password 給前台用** — 建立了前台顧客的 email/password 帳號，實際上前台只有 LINE 登入
4. **功能孤島驗收** — 個別功能測試通過，但前後台串聯沒有驗證

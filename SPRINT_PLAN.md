# Sprint Plan — 芮選系統

> 輕量索引，每次開新 session 先讀這份 + 當前 sprint DoR，PRD 只在需要查細節時才讀。
> 每個 sprint 完成後由 Cheryl 更新狀態。

---

## 快速狀態一覽

| Sprint | 目標摘要 | 狀態 | 分支 |
|--------|---------|------|------|
| Sprint 1 | 商家建立賣場、供應商管理、邀請連結 | ✅ 完成 | merged to main |
| Sprint 2 | 商品上架、AI 文案、規格管理、公開商品頁 | ✅ 完成 | merged to main |
| Sprint 3 | 顧客前台：LIFF 登入、商品瀏覽、下單、訂單查詢 | 🔄 收尾中 | feature/sprint3-my-orders |
| Sprint 4 | 商家訂單管理、代客建單、顧客結單物流、許願池 | 📋 待開始 | — |
| Sprint 5 | 現場快速上架、自動配單升級、數據 Dashboard | 📝 草稿 | — |

---

## 各 Sprint 文件索引

### Sprint 1 ✅
- DoR：docs/dor/sprint1-dor.md（不存在則已完成，查 git log）
- 主要功能：賣場設定、供應商 CRUD、邀請連結、後台 Sidebar

### Sprint 2 ✅
- DoR：docs/dor/sprint2-dor.md（不存在則已完成，查 git log）
- 主要功能：商品 CRUD、AI 文案優化（Claude API）、多維度規格、商品圖片上傳

### Sprint 3 🔄
- **DoR：[docs/dor/sprint3-dor.md](docs/dor/sprint3-dor.md)**
- 主要功能：顧客 LIFF 登入、商品列表 + 詳細頁、下單確認彈窗、訂單查詢、帳戶頁
- 目前進度：sprint3-my-orders 分支，US-16 測試型別問題處理中
- ⚠️ 待 merge 後 Sprint 4 才能開始

### Sprint 4 📋
- **DoR：[docs/dor/sprint4-dor.md](docs/dor/sprint4-dor.md)**（v1.0，Cheryl 確認中）
- 主要功能：
  - US-18：商家訂單管理後台 + **代客建立訂單**（Cheryl 確認：2026-05-24）
  - US-19：商家出貨管理（物流單號 → 已出貨）
  - US-20：顧客結單流程（4 種物流 + 付款方式）
  - US-21：顧客取消訂單
  - US-22：顧客許願池（送出）
  - US-23：許願池後台（商家）
- 新增資料表：`settlements`、`wishlists`
- 新增欄位：`orders.created_by`、`orders.cancelled_by`、`orders.shipping_number`
- 執行順序：sprint4-admin-orders → sprint4-checkout → sprint4-shipping / sprint4-cancel / sprint4-wishlist

### Sprint 5 📝
- **DoR：[docs/dor/sprint5-dor.md](docs/dor/sprint5-dor.md)**（v0.1 草稿）
- 確認功能：
  - US-24：**現場快速上架**（Cheryl 確認：2026-05-24）— 手機拍照 + 商品名 + 售價 → 30 秒上架
- 草稿功能（待 Sprint 4 後確認）：
  - US-25：自動配單升級（FIFO）
  - US-26：商家配貨數據 Dashboard

---

## 重要架構約束（Claude 每次開 session 必讀）

> 這些是已確認的設計決策，**不得在實作中自行修改或繞過**。

### 認證架構
| 對象 | 登入方式 | 禁止事項 |
|------|---------|---------|
| 前台顧客 | LINE LIFF（唯一） | ❌ 禁止 email/password 給前台用 |
| 後台商家 | Supabase Auth（email/password） | — |

### 訂單流向（不可跳過任何環節）
```
顧客下單 OR 商家代客建單
  → orders 表（status = 'pending_purchase'，created_by = 'customer'/'merchant'）
  → 商家後台 /admin/orders 立即可見
  → 前台 /store/{slug}/orders 同樣可見（無論誰建立）
```

### 種子資料規範（每個 sprint 的 seed.sql 必須包含）
- 前台測試顧客：使用 `line_id`，**不建立 email/password**
- 後台測試商家：使用 Supabase Auth email/password
- 必須包含完整旅程資料（不能只有單一角色）

### LINE Messaging API
- ❌ **不在 Sprint 1–5 範圍內**
- Sprint 4 以「依顧客分組查看 + 手動 LINE 私訊」替代
- 整個產品功能完整後才規劃

---

## 開新 Session 的標準開場

```
1. 讀 SPRINT_PLAN.md（這份）
2. 讀當前 sprint DoR（例：docs/dor/sprint4-dor.md）
3. 確認目前分支：git branch --show-current
4. 開始工作
```

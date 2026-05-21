# Sprint 3 — Definition of Ready (DoR)

**版本：** v1.0 草稿
**建立日期：** 2026-05-19
**Sprint 目標：** 顧客能登入賣場前台、瀏覽商品、下單，並查詢自己的訂單狀態

---

## 背景與問題定義

Sprint 2 完成了商品上架、顧客申請加入流程、公開商品頁、以及訂單資料模型（orders / order_items table）。Sprint 3 的核心目標是讓整個「顧客購買流程」跑通：

**Sprint 3 解決的核心問題：**
- 顧客前台商品瀏覽尚未實作（Sprint 2 的 `/store/[slug]/products` Out of Scope）
- 顧客下單 UI 尚未實作（Sprint 2 只建了 DB model，無 UI）
- 顧客無法查詢自己的訂單狀態
- `/store/[slug]/*` 的顧客身份驗證 guard 尚未完成（Sprint 2 預留）

---

## Features 與執行順序

```
sprint3-store-auth     顧客前台 auth guard（依賴：Sprint 2 的 store_members + LIFF）
  → sprint3-products   顧客前台商品列表 + 詳細頁（依賴：Sprint 2 的 products table）
    → sprint3-order    顧客下單流程（依賴：Sprint 2 的 orders / order_items table）
      → sprint3-my-orders  顧客訂單查詢 + 狀態篩選（依賴：sprint3-order 建立的訂單）
sprint3-account        顧客帳戶頁（依賴：sprint3-store-auth，store_members 資料）
```

---

## User Stories

---

### US-13：顧客前台身份驗證與賣場入口

```
As a 顧客,
I want to 用 LINE 登入後進入指定賣場的顧客前台,
So that 我能確認自己是否有資格瀏覽商品並下單。
```

**Acceptance Criteria：**
- AC-13.1：`/store/[slug]` 為顧客前台入口；未 LIFF 登入時自動觸發 `liff.login()`
- AC-13.2：LIFF 登入後，server 端驗證 token 取得 LINE user ID，查詢 `store_members`：
  - `status = 'approved'` → 進入商品列表頁（`/store/[slug]`）
  - `status = 'pending'` → 顯示「申請正在審核中，請耐心等候」靜態頁面
  - `status = 'rejected'` 或無申請記錄 → 顯示「您尚未加入此賣場」+ 「前往申請」按鈕（連結到 `/store/[slug]/join`）
- AC-13.3：`slug` 不存在 → 404
- AC-13.4：顧客前台 layout 顯示賣場頭像、賣場名稱、底部導覽列（**我的帳戶 / 商品 / 我的訂單**，共三個 tab）
- AC-13.5：`/store/[slug]/join` 不受此 auth guard 保護（Sprint 2 已實作，公開路由）
- AC-13.6：`/store/[slug]/account` 為顧客帳戶頁（見 US-17）

---

### US-14：顧客前台商品列表頁

```
As a 已審核通過的顧客,
I want to 在賣場首頁瀏覽所有上架商品，並可依類別篩選或關鍵字搜尋,
So that 我能快速找到想購買的商品。
```

**Acceptance Criteria：**
- AC-14.1：`/store/[slug]`（前台首頁）顯示該賣場所有 `status = 'active'` 的商品（已審核顧客可見，包括非公開商品）
- AC-14.2：商品卡顯示：商品主圖（第一張）、商品名稱、售價範圍（最低～最高規格價格）
- AC-14.3：商品依 `category` 分組顯示（無 category 的商品歸入「其他」）
- AC-14.4：頂部關鍵字搜尋欄，即時篩選商品名稱（client-side，無需重新打 API）
- AC-14.5：點擊商品卡 → 進入 `/store/[slug]/products/[id]`
- AC-14.6：商品列表為空時顯示「目前賣場尚未上架商品」空狀態
- AC-14.7：顯示下架（`status = 'inactive'`）的商品 → 不顯示

---

### US-15：顧客前台商品詳細頁與下單

```
As a 已審核通過的顧客,
I want to 在商品詳細頁選擇規格與數量，並確認下單,
So that 我的購買意願能立即被商家看到，進入待採買流程。
```

**Acceptance Criteria：**

**商品詳細頁**
- AC-15.1：`/store/[slug]/products/[id]` 顯示商品圖片輪播（多張圖片）、商品名稱、商品描述
- AC-15.2：依 `product_variants.specs` 建立規格選擇器（如顏色、尺寸各自獨立下拉或 badge 選擇）
- AC-15.3：規格選齊後顯示對應 variant 的售價
- AC-15.4：未選完規格時「立即下單」按鈕 disabled，提示「請選擇所有規格」
- AC-15.5：數量選擇器（預設 1，最小 1，無上限）
- AC-15.6：商品 `status = 'inactive'` → 回傳 404
- AC-15.7：商品不屬於此賣場 → 404

**下單確認彈窗**
- AC-15.8：點擊「立即下單」→ 開啟確認彈窗，顯示：
  - 商品名稱
  - 已選規格（如「顏色：紅 / 尺寸：M」）
  - 數量
  - 單價 × 數量 = 小計
  - 說明文字「下單即購買，無購物車，確認後商家會開始採買」
- AC-15.9：確認彈窗有「取消」和「確認下單」按鈕

**訂單建立**
- AC-15.10：點擊「確認下單」→ 呼叫 `POST /api/orders`，建立：
  - `orders`：status = 'pending_purchase'，member_id = 當前顧客
  - `order_items`：product_id、variant_id、quantity、unit_price = variant.price
- AC-15.11：下單成功 → 關閉彈窗 → 顯示 Toast「下單成功！」→ 自動導向 `/store/[slug]/orders`
- AC-15.12：下單失敗（network error 等）→ 顯示錯誤 Toast，彈窗保持開啟

---

### US-16：顧客訂單查詢

```
As a 已審核通過的顧客,
I want to 查看自己在此賣場的所有訂單及其狀態,
So that 我能追蹤購買進度，了解商品何時到貨。
```

**Acceptance Criteria：**
- AC-16.1：`/store/[slug]/orders` 顯示當前顧客在此賣場的所有訂單，依 `ordered_at` 倒序
- AC-16.2：每筆訂單顯示：
  - 商品圖（第一張）+ 商品名稱 + 規格
  - 數量 × 單價
  - 顧客端訂單狀態 badge（見 AC-16.3）
  - 下單時間（格式：YYYY/MM/DD HH:mm）
- AC-16.3：顧客端訂單狀態 badge 顯示（顧客看到的標籤與商家後台不同）：

  | 顧客端顯示 | 對應 DB status | 顏色 |
  |-----------|---------------|------|
  | 已訂購 | pending_purchase、ordered | 藍色 |
  | 已到貨 | allocated、settled | 綠色 |
  | 已出貨 | shipped | 深綠色 |
  | 已完成 | completed | 灰色 |
  | 已取消 | cancelled | 紅色 |

  > ℹ️ 商家後台使用原始 DB status（7種），顧客前台使用上方 5 種友善標籤，由 API 層映射。

- AC-16.4：頂部**下拉篩選**（全部 / 已訂購 / 已到貨 / 已出貨 / 已完成 / 已取消），選取後只顯示對應狀態的訂單
- AC-16.5：無符合條件的訂單時顯示對應空狀態（篩選後無結果 / 總無訂單時）
- AC-16.6：無訂單時顯示「目前尚無訂單，快去選購吧！」空狀態 + 「去逛商品」按鈕
- AC-16.7：Sprint 3 不實作「結單」功能（Sprint 4），訂單卡無結單按鈕

---

### US-17：顧客帳戶頁

```
As a 已審核通過的顧客,
I want to 在帳戶頁查看自己的個人資料,
So that 我能確認商家持有的聯絡資訊是否正確。
```

**Acceptance Criteria：**
- AC-17.1：`/store/[slug]/account` 顯示顧客的個人資料（唯讀）：
  - LINE 顯示名稱（不可修改，來自 LIFF）
  - 姓名（來自 `store_members.name`）
  - 手機號碼（來自 `store_members.phone`，未填寫顯示「未設定」）
  - LINE ID（來自 `store_members.line_id`）
- AC-17.2：頁面頂部顯示顧客的 LINE 頭貼（LIFF 取得）+ 顯示名稱
- AC-17.3：顯示「加入賣場日期」（`store_members.reviewed_at` 的日期）
- AC-17.4：底部顯示「聯繫商家」按鈕，點擊觸發 LINE 私訊商家（Sprint 4 實作，本 Sprint 顯示按鈕但暫不串接）
- AC-17.5：Sprint 3 不開放顧客自行修改資料（修改需聯繫商家）

---

## 範圍邊界

### In Scope（Sprint 3 要做）
- 顧客前台 auth guard（LIFF 登入 + approved member 驗證）
- 顧客前台商品列表頁（含關鍵字搜尋、類別分組）
- 顧客前台商品詳細頁（含規格選擇、售價顯示）
- 下單確認彈窗與訂單建立 API
- 顧客訂單查詢頁（含狀態篩選下拉）
- 顧客帳戶頁（US-17，顯示個人資料）
- 底部三 tab 導覽列（我的帳戶 / 商品 / 我的訂單）
- orders / order_items RLS policy 補全（新增顧客存取權限）
- 顧客端訂單狀態映射（DB 原始 status → 5 種顧客友善標籤）

### Out of Scope（Sprint 3 不做）
- 顧客結單流程（選取已到貨商品、填物流資訊）→ Sprint 4
- LINE Messaging API 通知 → Sprint 4
- 商家配貨流程 → Sprint 5
- 商家訂單管理 UI（`/admin/orders`，含下拉篩選）→ Sprint 4
- 顧客取消訂單 → Sprint 4

---

## 技術依賴

| 項目 | 說明 | 狀態 |
|------|------|------|
| Sprint 2 完成 | `orders`、`order_items`、`products`、`product_variants`、`product_images`、`store_members` table 存在 | ⬜ 確認 Sprint 2 migration 已執行 |
| LIFF App ID | 顧客前台已設定的 LIFF App，endpoint 設定包含 `/store/[slug]` | ⬜ 確認 LINE Developers 設定 |
| `LIFF_ID` env | 顧客前台用的 LIFF ID，已加入 `.env.local` | ⬜ 確認 |

---

## 資料模型（Sprint 3 新增）

Sprint 3 不新增 table，只補全 RLS policy：

```sql
-- orders：補全顧客存取權限
CREATE POLICY "顧客可新增自己的訂單"
  ON orders FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM store_members
      WHERE user_id = auth.uid()
        AND status = 'approved'
        AND store_id = orders.store_id
    )
  );

CREATE POLICY "顧客可讀取自己的訂單"
  ON orders FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM store_members
      WHERE user_id = auth.uid()
    )
  );

-- order_items：補全顧客存取權限
CREATE POLICY "顧客可新增自己訂單的明細"
  ON order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders
      WHERE member_id IN (
        SELECT id FROM store_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "顧客可讀取自己訂單的明細"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE member_id IN (
        SELECT id FROM store_members WHERE user_id = auth.uid()
      )
    )
  );
```

---

## 風險與緩解

| 風險 | 影響 | 緩解方式 |
|------|------|----------|
| LIFF 在外部瀏覽器（非 LINE）開啟 | auth guard 失效 | 偵測環境，非 LINE 環境改用 LINE Login redirect；進入顧客前台要求從 LINE 開啟 |
| 同一顧客快速連點「確認下單」導致重複建立訂單 | 重複訂單 | 按鈕點擊後立即 disabled，直到 API 回應 |
| 規格組合對應售價計算錯誤 | 顧客看到錯誤價格 | `product_variants` 每個組合有獨立 price，前端直接用 variant.price，不做二次計算 |
| 顧客前台商品可見度邊界（已審核顧客看到非公開商品） | 資料隔離 | RLS 確保顧客只能看到自己賣場（已加入）的商品，`store_members.status = 'approved'` 做判斷 |

---

## Sprint 3 完成後的可驗收流程

```
顧客端（已 approved 會員）：
1. 用 LINE 打開 /store/{slug} → 自動 LIFF 登入
2. 確認底部三 tab（我的帳戶 / 商品 / 我的訂單），商品 tab 為 active
3. 關鍵字搜尋「面膜」→ 商品列表即時篩選，關鍵字高亮
4. 點擊商品 → 進入詳細頁 → 選規格（顏色：粉紅 / 尺寸：M）→ 數量 2
5. 點「立即下單」→ 確認彈窗顯示 商品名 + 規格 + 2 × 售價
6. 確認 → Toast「下單成功！」→ 自動跳至 /store/{slug}/orders
7. 訂單列表看到剛建立的訂單，顧客端狀態顯示：已訂購（藍色 badge）
8. 下拉篩選切換至「已到貨」→ 暫無訂單，顯示空狀態
9. 點底部「我的帳戶」tab → 顯示帳戶資料（姓名、手機、LINE ID）

顧客端（pending 狀態）：
10. 打開 /store/{slug} → 顯示「申請正在審核中」靜態頁

顧客端（未申請）：
11. 打開 /store/{slug} → 顯示「您尚未加入此賣場」+ 申請按鈕
```

---

## 待 Cheryl 於 Sprint 3 開始前確認

```
□ Sprint 2 所有功能已完成且測試通過（migration 0002 已執行）
□ LIFF App 的 endpoint 設定已包含 /store/{slug}（顧客前台路由）
□ 確認 sprint3-dor.md 內容正確（此步驟）
□ 確認顧客下單「一次只能購買一個商品（一個 order = 一個 order_item）」為正確設計
```

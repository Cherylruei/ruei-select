# Sprint 4 — Definition of Ready (DoR)

**版本：** v1.0 草稿
**建立日期：** 2026-05-24
**Sprint 目標：** 商家能管理訂單並安排出貨；顧客能結單選物流；並建立許願池功能

---

## 背景與問題定義

Sprint 3 完成了顧客完整購物流程：LIFF 身份驗證、商品瀏覽、下單、訂單查詢。訂單進入系統後狀態為 `pending_purchase`，但目前：

- **商家無法在後台看到訂單**（`/admin/orders` 尚未實作，為 Sprint 3 的明確 Out of Scope）
- **商家無法更新訂單狀態**（無法標記「已向廠商下單」或「已到貨」）
- **顧客無法結單**（選物流/付款方式流程尚未實作）
- **顧客無法取消訂單**（Sprint 3 Out of Scope）
- 許願池功能完全尚未建立

Sprint 4 的核心目標是打通訂單從「待採買」到「已出貨」的完整商業閉環。

> ⚠️ **範圍提醒**：本 Sprint 功能量偏大（6 個 US）。若開發時程不足，優先完成 US-18～US-21（訂單閉環），US-22/23（許願池）可視情況移至 Sprint 5。請 Cheryl 於開始前確認。

---

## Features 與執行順序

```
sprint4-admin-orders       商家訂單管理後台（依賴：Sprint 3 的 orders table）
  → sprint4-checkout       顧客結單流程（依賴：商家能標記已配單）
    → sprint4-shipping     商家出貨管理（依賴：顧客結單 = settled 狀態）
sprint4-cancel             顧客取消訂單（依賴：訂單建立）
sprint4-wishlist           顧客許願池送出（依賴：顧客前台框架）
  → sprint4-wishlist-admin 許願池後台（依賴：wishlist 送出）
```

---

## User Stories

---

### US-18：商家訂單管理後台

```
As a 商家,
I want to 在後台看到所有顧客訂單並能更新採購進度狀態,
So that 我能系統化追蹤每筆訂單，確保不漏單。
```

**Acceptance Criteria：**

**訂單列表**

- AC-18.1：`/admin/orders` 顯示該賣場所有訂單，依 `ordered_at` 倒序排列
- AC-18.2：每筆訂單顯示：顧客姓名、商品名稱 ＋ 規格、數量、小計金額、訂單狀態 badge、下單時間
- AC-18.3：頂部狀態篩選 Tab（全部 / 待採買 / 已訂購 / 已配單 / 已結單 / 已出貨 / 已完成 / 已取消），數量 badge 顯示各狀態筆數
- AC-18.4：訂單狀態 badge 顏色：
  - 待採買：黃色
  - 已訂購：藍色
  - 已配單：綠色
  - 已結單：深綠色（Teal）
  - 已出貨：紫色
  - 已完成：灰色
  - 已取消：紅色
- AC-18.5：無訂單時顯示「尚未有顧客下單」空狀態

**訂單狀態更新**

- AC-18.6：`status = 'pending_purchase'` 的訂單顯示「標記已訂購」按鈕，代表商家已向廠商下單
- AC-18.7：點擊「標記已訂購」→ 確認 dialog（「確認已向廠商下單此商品？」）→ 確認後 `status = 'ordered'`
- AC-18.8：`status = 'ordered'` 的訂單顯示「標記已到貨」按鈕，代表商品已到貨可配單

  > ℹ️ 此為簡化版配單，Sprint 5 升級為自動配單（按下單時間）/ 手動指定顧客。

- AC-18.9：點擊「標記已到貨」→ `status = 'allocated'`，顧客端訂單狀態同步更新為「已到貨」（綠色 badge）
- AC-18.10：所有狀態更新操作有 loading 狀態與成功 / 失敗 Toast 提示

**依顧客查看到貨狀況（取代 LINE 通知前的人工排程依據）**

- AC-18.11：篩選「已配單」Tab 時，額外提供「依顧客分組」切換檢視：將所有 `status = 'allocated'` 的訂單依顧客姓名分組，顯示每位顧客的已到貨商品清單（商品名稱＋規格＋數量），方便商家一眼掌握哪些顧客可以安排出貨
- AC-18.12：點擊分組中的顧客姓名 → 展開該顧客在此賣場的**全部**訂單（含所有狀態），方便商家確認顧客是否有其他訂單尚未到貨（部分到貨情境）
- AC-18.13：顧客分組卡顯示顧客 LINE ID（來自 `store_members.line_id`），方便商家直接手動開 LINE 聯絡

**商家協助建立訂單**

> ℹ️ 適用情境：顧客透過 LINE 口頭告知商家要買、或商家現場幫顧客登記，代替顧客操作下單。

- AC-18.14：`/admin/orders` 頁面右上角提供「代客建立訂單」按鈕
- AC-18.15：點擊後進入 `/admin/orders/new`，表單包含：
  - 顧客（必填，下拉選取此賣場 `status = 'approved'` 的 store_members，顯示姓名）
  - 商品（必填，下拉選取此賣場 `status = 'active'` 的商品，顯示商品名稱）
  - 規格（必填，依選定商品的 product_variants 動態載入，顯示規格組合 + 售價）
  - 數量（必填，最小值 1）
  - 備註（選填，商家內部備注用）
- AC-18.16：規格選齊前「建立訂單」按鈕 disabled，提示「請選擇所有規格」
- AC-18.17：確認送出 → 建立：
  - `orders`：`status = 'pending_purchase'`、`member_id = 選定顧客`、`created_by = 'merchant'`
  - `order_items`：`product_id`、`variant_id`、`quantity`、`unit_price = variant.price`
- AC-18.18：建立成功 → Toast「訂單已建立」→ 導回 `/admin/orders`，新訂單出現在列表最上方
- AC-18.19：商家建立的訂單顧客端同樣可在 `/store/{slug}/orders` 看到（共用同一 orders table）；顧客端訂單來源不特別標示

---

### US-19：商家出貨管理

```
As a 商家,
I want to 查看已結單顧客的收件資訊並填入物流單號,
So that 我能完成出貨並讓顧客追蹤包裹。
```

**Acceptance Criteria：**

- AC-19.1：`/admin/orders` 篩選「已結單」顯示所有 `status = 'settled'` 訂單，展開後顯示顧客結單填寫的收件資訊：
  - 物流方式（自取 / 超商店到店 / 賣貨便 / 宅配）
  - 收件人姓名、手機
  - 依物流方式顯示對應欄位（超商名稱 / 地址）
  - 付款方式
- AC-19.2：每筆已結單訂單提供「複製收件資訊」按鈕，點擊後複製格式化文字至剪貼簿，方便到賣貨便建單
- AC-19.3：商家填入物流單號（文字欄位）＋ 選擇物流商（黑貓 / 7-11 / 全家 / 賣貨便 / 其他）
- AC-19.4：點擊「確認出貨」→ `status = 'shipped'`，物流單號存入 `orders.shipping_number`
- AC-19.5：已出貨訂單展開後顯示已填入的物流單號與物流商（唯讀）

---

### US-20：顧客結單流程

```
As a 已審核通過的顧客,
I want to 對已到貨的訂單進行結單並填寫收件資訊,
So that 商家能準備將商品出貨給我。
```

**Acceptance Criteria：**

**結單入口**

- AC-20.1：`/store/{slug}/orders` 中，`status = 'allocated'`（顧客端顯示：已到貨）的訂單卡顯示「結單」按鈕
- AC-20.2：點擊「結單」→ 進入 `/store/{slug}/checkout/{orderId}` 結單頁
- AC-20.3：`status` 非 `allocated` 的訂單不顯示結單按鈕

**結單頁**

- AC-20.4：頁面頂部顯示訂單摘要（商品名稱、規格、數量、小計）
- AC-20.5：物流方式選擇（單選，4 種），選取後顯示對應表單欄位：
  - **自取**：確認取貨備註（選填文字欄位）
  - **超商店到店**：收件人姓名（必填）、手機（必填，格式驗證）、超商名稱（必填，如「全家台北信義店」）
  - **賣貨便**：同超商店到店欄位
  - **宅配**：收件人姓名（必填）、手機（必填）、地址（必填）；固定運費 NT$210 顯示於訂單摘要
- AC-20.6：付款方式選擇依物流方式聯動（單選）：
  - 自取 → 只顯示「現金自取」
  - 超商店到店 / 宅配 → 只顯示「匯款」
  - 賣貨便 → 只顯示「賣貨便貨到付款」
- AC-20.7：底部「確認結單」按鈕；必填欄位未填時 disabled，顯示欄位錯誤提示
- AC-20.8：點擊「確認結單」→ 確認 dialog（「確認送出結單？結單後無法修改收件資訊」）→ 確認後：
  - `orders.status = 'settled'`
  - 新增一筆 `settlements` 資料（含物流與付款資訊）
- AC-20.9：結單成功 → Toast「結單成功！商家將盡快為您出貨」→ 導回 `/store/{slug}/orders`
- AC-20.10：已結單（`settled`）的訂單顧客端維持顯示「已到貨」badge（`settled` 和 `allocated` 同映射「已到貨」，維持 Sprint 3 AC-16.3 的邏輯）

---

### US-21：顧客取消訂單

```
As a 顧客,
I want to 取消「待採買」狀態的訂單,
So that 我能在商家尚未向廠商下單前撤回購買意願。
```

**Acceptance Criteria：**

- AC-21.1：`/store/{slug}/orders` 中，`status = 'pending_purchase'` 的訂單卡顯示「取消訂單」按鈕
- AC-21.2：點擊取消 → 確認 dialog（「確認取消此訂單？取消後無法復原」）
- AC-21.3：確認後：
  - `orders.status = 'cancelled'`
  - `orders.cancelled_at = now()`
  - `orders.cancelled_by = 'customer'`
- AC-21.4：取消後訂單在列表中顯示「已取消」紅色 badge，無取消按鈕
- AC-21.5：`status` 非 `pending_purchase` 的訂單不顯示取消按鈕（前端控制；後端 API 同樣驗證，非 `pending_purchase` 拒絕取消）

---

### US-22：顧客許願池

```
As a 已審核通過的顧客,
I want to 向商家送出代購許願,
So that 商家能參考我的需求考慮上架商品。
```

**Acceptance Criteria：**

- AC-22.1：底部導覽列新增第四個 Tab「許願池」（導覽由三 Tab 擴展為四 Tab：商品 / 我的訂單 / 許願池 / 我的帳戶）
- AC-22.2：`/store/{slug}/wishlist` 顯示顧客自己在此賣場的許願清單，依送出時間倒序
- AC-22.3：每筆許願顯示：商品照片 thumbnail、商品名稱、型號（若有填）、狀態 badge（待處理 / 已注意 / 已上架）
- AC-22.4：右下角浮動「＋ 許願」按鈕，點擊 → 進入許願表單頁或開啟 bottom sheet
- AC-22.5：許願表單欄位：
  - 商品名稱（必填，上限 100 字）
  - 商品照片（必填，從相簿或相機上傳，上傳至 `wishlist-images` Supabase Storage bucket）
  - 商品連結（選填，URL 格式驗證）
  - 型號 / 規格（選填，上限 100 字）
- AC-22.6：送出 → `wishlists` 新增一筆（`status = 'pending'`）→ Toast「許願已送出，等待商家確認」
- AC-22.7：無許願時顯示空狀態「還沒有許願，快去送出你的第一個許願吧！」＋「＋ 許願」按鈕

---

### US-23：許願池後台（商家）

```
As a 商家,
I want to 查看所有顧客的代購許願並標記處理狀態,
So that 我能系統化管理採購需求，也讓顧客知道許願進度。
```

**Acceptance Criteria：**

- AC-23.1：後台側邊欄新增「許願池」選單項目，進入 `/admin/wishlists`
- AC-23.2：顯示此賣場所有顧客的許願，依送出時間倒序，欄位：顧客姓名、商品照片、商品名稱、型號、商品連結（可點擊開新分頁）、狀態、送出時間
- AC-23.3：頂部狀態篩選（全部 / 待處理 / 已注意 / 已上架）
- AC-23.4：每筆許願的狀態可 inline 下拉更改（待處理 / 已注意 / 已上架），選取後即時更新，顯示 Toast
- AC-23.5：無許願時顯示「目前沒有顧客許願」空狀態

---

## 範圍邊界

### In Scope（Sprint 4 要做）

- 商家訂單管理後台（`/admin/orders`）含狀態篩選與狀態更新（待採買→已訂購→已配單）
- **商家協助建立訂單**（`/admin/orders/new`，代客登記）
- 商家出貨管理（填物流單號 → 已出貨）
- 顧客結單流程（4 種物流方式 + 付款方式）
- 顧客取消訂單（限 `pending_purchase`）
- 顧客許願池（送出）+ 許願池後台（商家）
- `settlements` 資料表建立（儲存結單物流與付款資訊）
- `wishlists` 資料表建立
- `orders` 表補充欄位（`cancelled_by`、`cancelled_at`、`shipping_number`、`shipping_vendor`、**`created_by`**）

### Out of Scope（Sprint 4 不做）

- 顧客確認收到（`shipped → completed`）→ 未來版本
- 商家取消訂單 → 未來版本
- 自動 / 手動配單升級版（按下單時間自動分配）→ Sprint 5
- 商家配貨數據 Dashboard → Sprint 5
- 賣貨便 / 超商 API 串接（維持手動填單）→ 明確排除（PRD 第十一節）
- LINE Messaging API 推播通知 → 整個產品完成後再開發（商家目前透過 US-18 依顧客分組檢視後手動開 LINE 聯絡）
- 許願上架時 LINE 通知顧客 → 同上，與 LINE 通知一起規劃

---

## 技術依賴

| 項目 | 說明 | 狀態 |
|---|---|---|
| Sprint 3 完成 | orders / order_items / store_members table 存在，下單流程完整 | ⬜ 確認 Sprint 3 已 merge |
| Supabase Storage bucket | `wishlist-images` bucket 建立，RLS 允許顧客上傳自己的圖片 | ⬜ migration 建立 |

---

## 資料模型（Sprint 4 新增）

### settlements 表（顧客結單收件資訊）

```sql
CREATE TABLE settlements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES orders(id),
  shipping_method   text NOT NULL CHECK (shipping_method IN ('pickup', 'convenience', 'takkyubin', 'home_delivery')),
  payment_method    text NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'cod')),
  recipient_name    text,
  recipient_phone   text,
  recipient_address text,
  store_name        text,   -- 超商名稱（超商/賣貨便時填）
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

### wishlists 表

```sql
CREATE TABLE wishlists (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id),
  member_id    uuid NOT NULL REFERENCES store_members(id),
  product_name text NOT NULL,
  image_url    text NOT NULL,
  product_url  text,
  spec_note    text,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'noted', 'listed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

### orders 表補充欄位

```sql
ALTER TABLE orders
  ADD COLUMN cancelled_by     text CHECK (cancelled_by IN ('customer', 'merchant')),
  ADD COLUMN cancelled_at     timestamptz,
  ADD COLUMN shipping_number  text,
  ADD COLUMN shipping_vendor  text CHECK (shipping_vendor IN ('黑貓', '7-11', '全家', '賣貨便', '其他')),
  ADD COLUMN created_by       text NOT NULL DEFAULT 'customer' CHECK (created_by IN ('customer', 'merchant'));
```

> ℹ️ `created_by`：記錄訂單由誰建立（顧客自行下單 vs 商家代客建立），預設 `'customer'`。不影響顧客端顯示，供後台統計與稽核用。

---

## 風險與緩解

| 風險 | 影響 | 緩解方式 |
|---|---|---|
| 顧客結單依賴「已配單」狀態，但 Sprint 5 才有完整配單 | Sprint 4 Checkout 無法端對端測試 | Sprint 4 的 US-18「標記已到貨」提供足夠測試條件；seed.sql 補充 `allocated` 狀態測試資料 |
| Sprint 4 功能量偏大（6 個 US） | Sprint 可能延遲 | 優先完成 US-18～US-21（訂單閉環），US-22/23（許願池）若時間不足移至 Sprint 5 |
| 許願池圖片上傳在 LINE 內建瀏覽器的相機/相簿權限 | 顧客無法上傳照片 | 測試 LIFF 環境下 `<input type="file">` 行為；相簿選取優先於相機拍照 |

---

## Sprint 4 完成後的可驗收流程

```
商家端（訂單管理）：
1. 登入後台 → 側邊欄「訂單管理」→ 顯示所有訂單，Tab 顯示各狀態筆數
2. 篩選「待採買」→ 點「標記已訂購」→ 確認 dialog → Toast 成功，狀態更新
3. 篩選「已訂購」→ 點「標記已到貨」→ 顧客端同步顯示「已到貨」badge
4. 顧客結單後，篩選「已結單」→ 展開查看收件資訊 → 複製 → 填物流單號 → 確認出貨 → 已出貨

商家協助建立訂單（代客登記）：
5. `/admin/orders` 點「代客建立訂單」→ 選顧客「王小明」→ 選商品 → 選規格 → 數量 2
6. 送出 → Toast「訂單已建立」→ 新訂單出現在列表最上方（待採買）
7. 以王小明 LINE 帳號前台登入 → `/store/{slug}/orders` → 看到剛建立的訂單（顧客端可見）

顧客端：
8. 訂單列表看到「已到貨」badge + 「結單」按鈕
9. 點結單 → 選「宅配」→ 填收件人資訊 → 選「匯款」→ 確認結單 → Toast 成功
10. 「待採買」訂單點「取消訂單」→ 確認 → 訂單顯示「已取消」紅色 badge

商家依顧客查看到貨狀況：
11. 篩選「已配單」→ 切換「依顧客分組」→ 看到顧客 A 有 2 件已到貨 → 展開看到其全部訂單（含未到的）→ 複製顧客 LINE ID → 手動開 LINE 通知

許願池：
12. 顧客點底部「許願池」Tab → 點「＋ 許願」→ 填商品名 + 上傳照片 → 送出 → Toast 成功
13. 商家後台「許願池」→ 看到許願 → 狀態下拉改「已注意」→ Toast 成功
```

---

## ⚠️ 開發約束（Claude 必讀，Cheryl 已確認）

```
認證：
✅ 前台顧客只用 LINE LIFF 登入，seed 資料用 line_id，禁止建 email/password 給前台用
✅ 後台商家用 Supabase Auth（email/password）

種子資料（Sprint 4 必須包含）：
✅ 1 筆 status = 'pending_purchase' 訂單（測試商家標記用）
✅ 1 筆 status = 'allocated' 訂單（測試顧客結單用）
✅ 以上訂單的 member_id 對應有 line_id 的顧客（非 email 帳號）
✅ 1 位已 approved 的顧客（供「代客建立訂單」測試選取用）

訂單流向（不可跳過）：
✅ 顧客下單 → orders 表建立 → 商家後台 /admin/orders 立即出現
✅ 商家代客建立訂單 → 顧客前台 /store/{slug}/orders 同樣可見
✅ created_by 欄位必須設定（'customer' 或 'merchant'），不得省略
```

---

## 待 Cheryl 於 Sprint 4 開始前確認

```
□ Sprint 3 所有功能已完成且測試通過（sprint3-my-orders 已 merge）
□ Sprint 4 功能範圍是否接受（特別確認：若功能量過大，US-22/23（許願池）移至 Sprint 5）
□ settlements 表設計是否符合預期（物流方式 / 付款方式的 enum 值）
□ 商家「標記已到貨」簡化版設計是否接受（Sprint 5 升級為按下單時間自動配）
□ 底部導覽列從三 Tab 擴展為四 Tab 是否接受（順序：商品 / 我的訂單 / 許願池 / 我的帳戶）
□ 顧客確認收到（shipped → completed）確認 Sprint 4 不做，留 Out of Scope
□ 確認 LINE Messaging API 推播留待整個產品完成後開發，Sprint 4 以依顧客分組查看替代
□ ✅ 商家協助建立訂單（代客登記）— Sprint 4 in scope（2026-05-24 Cheryl 確認）
□ ✅ 現場連線區域（快速上架）— 確認 Sprint 5，不影響 Sprint 4（2026-05-24 Cheryl 確認）
```

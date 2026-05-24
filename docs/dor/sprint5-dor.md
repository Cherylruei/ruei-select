# Sprint 5 — Definition of Ready (DoR)

**版本：** v0.1 草稿
**建立日期：** 2026-05-24
**Sprint 目標：** TBD（待 Sprint 4 完成後與 Cheryl 確認）

> ⚠️ **此文件為草稿**，僅記錄已確認的功能方向。正式 DoR 待 Sprint 4 merge 後補完。
> Sprint 5 開始前，所有 Acceptance Criteria 必須經 Cheryl 確認才能開發。

---

## 背景（暫定）

Sprint 4 完成了訂單完整閉環（下單→採買→到貨→結單→出貨）。
Sprint 5 的核心方向：

1. **現場連線區域**（快速上架）— 商家現場擺攤 / 直播時快速建立商品
2. **自動 / 手動配單升級**（Sprint 4 Out of Scope 延後項目）
3. **商家配貨數據 Dashboard**（Sprint 4 Out of Scope 延後項目）
4. TBD — 待 Sprint 4 Retro 後補充

---

## Features 與執行順序（草稿）

```
sprint5-quick-listing    現場連線區域 — 快速上架（依賴：Sprint 4 Storage 基礎設施）
sprint5-auto-alloc       自動配單升級版（依賴：Sprint 4 allocated 流程）
sprint5-dashboard        商家配貨 Dashboard（依賴：Sprint 4 訂單閉環）
```

---

## User Stories（草稿）

---

### US-24：現場連線區域 — 快速上架

```
As a 商家,
I want to 在現場擺攤或直播時，用手機拍照後快速建立商品並立即上架,
So that 顧客能立即在前台看到商品並下單，不需要等待完整商品編輯流程。
```

> ℹ️ **適用情境**：商家在實體展場 / 直播現場，手上有現貨，需要 30 秒內快速上架讓顧客搶購。
> 與一般商品管理（`/admin/products/new`）並存，提供簡化版快速入口。

**Acceptance Criteria（草稿，待 Cheryl 確認）：**

**快速上架入口**

- AC-24.1：後台側邊欄或 `/admin/products` 頁面提供「現場快速上架」入口（與一般新增商品分開）
- AC-24.2：快速上架頁面 `/admin/products/quick`，設計針對手機操作優化（大按鈕、少欄位）

**必填欄位（精簡，追求速度）**

- AC-24.3：商品照片（必填，優先開啟相機拍攝，也可從相簿選取；上傳至 `product-images` Supabase Storage）
- AC-24.4：商品名稱（必填，上限 60 字，大字號輸入框）
- AC-24.5：售價（必填，數字鍵盤，NT$ 前綴）
- AC-24.6：數量 / 庫存備註（選填，自由文字，如「現貨 3 件」，存入商品描述）

**選填欄位（可跳過直接上架）**

- AC-24.7：規格（選填；若不填，系統自動建立一個預設 variant，price = 售價）
- AC-24.8：商品分類（選填，下拉選取此賣場已有的 category）

**上架確認**

- AC-24.9：底部「立即上架」大按鈕；必填欄位未填時 disabled
- AC-24.10：點擊「立即上架」→ 確認 dialog（「確認上架？上架後顧客可立即看到」）
- AC-24.11：確認後：
  - 建立 `products`（`status = 'active'`、`store_id`、`name`、`description`）
  - 建立 `product_variants`（單一預設規格或填入的規格）
  - 建立 `product_images`（上傳的照片）
- AC-24.12：上架成功 → Toast「商品已上架，顧客可立即瀏覽」→ 顯示「繼續快速上架」和「前往商品管理」兩個按鈕
- AC-24.13：顧客前台 `/store/{slug}` 立即可看到新上架商品（`status = 'active'`）

**與一般商品的關係**

- AC-24.14：快速上架建立的商品和一般新增的商品共用同一個 `products` table
- AC-24.15：快速上架後可到 `/admin/products/{id}/edit` 補充完整資料（圖片補充、詳細描述、多規格）

---

### US-25：自動配單升級版（草稿）

> ℹ️ 此 US 為 Sprint 4 Out of Scope 的延後項目，細節待確認。

```
As a 商家,
I want to 系統自動依下單時間將到貨商品分配給對應顧客,
So that 我不需要手動逐一比對哪位顧客應該拿到哪件商品。
```

**待確認項目：**
- 配單邏輯：先進先出（FIFO）？還是商家可手動指定？
- 同一商品多顧客下單時的配單順序
- Acceptance Criteria 待 Sprint 4 完成後補充

---

### US-26：商家配貨數據 Dashboard（草稿）

> ℹ️ 此 US 為 Sprint 4 Out of Scope 的延後項目，細節待確認。

```
As a 商家,
I want to 在 Dashboard 一眼看到訂單狀態分佈與待處理事項,
So that 我能快速掌握今日需要處理哪些訂單。
```

**待確認項目：**
- Dashboard 要顯示哪些指標？
- 是替換現有 Dashboard，還是新增一個訂單 Dashboard 頁？
- Acceptance Criteria 待 Sprint 4 完成後補充

---

## 範圍邊界（草稿）

### 可能 In Scope（待確認）

- 現場快速上架（US-24）— 已確認為 Sprint 5
- 自動配單升級（US-25）
- 商家配貨 Dashboard（US-26）

### Out of Scope

- LINE Messaging API 推播通知 → 整個產品完成後再開發
- 顧客確認收到（shipped → completed）→ 未來版本
- 商家取消訂單 → 未來版本
- 賣貨便 / 超商 API 串接 → 明確排除

---

## ⚠️ 開發約束（Sprint 5 延續 Sprint 4 約束，Cheryl 確認後才能開發）

```
認證：
□ 前台顧客只用 LINE LIFF 登入，seed 資料用 line_id，禁止建 email/password 給前台用
□ 後台商家用 Supabase Auth（email/password）

Storage：
□ 快速上架照片上傳至 product-images bucket（與一般商品共用）
□ 不得另建新 bucket（除非有明確理由且 Cheryl 確認）

訂單流向（延續 Sprint 4 約束）：
□ 顧客下單 → orders 表 → 商家後台立即可見
□ 商家代客建立訂單 → 顧客前台同樣可見
□ created_by 欄位必須設定
```

---

## 待 Cheryl 確認（Sprint 5 開始前）

```
□ Sprint 4 所有功能已完成且測試通過
□ 確認 Sprint 5 功能範圍（US-24 快速上架確定做；US-25/26 是否同 Sprint？）
□ US-24 快速上架：單一規格自動建立邏輯是否符合預期？
□ US-24 快速上架：成功後「繼續快速上架」vs「前往商品管理」按鈕順序是否正確？
□ US-25 自動配單：配單邏輯確認（FIFO / 手動指定）
□ US-26 Dashboard：要顯示的指標確認
□ 現場連線區域入口位置確認（側邊欄獨立項目 or /admin/products 頁面內按鈕）
```

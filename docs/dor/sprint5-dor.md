# Sprint 5 — Definition of Ready (DoR)

**版本：** v0.2
**建立日期：** 2026-05-24
**更新日期：** 2026-06-02（Sprint 4 Retro 補完）
**Sprint 目標：** 訂單後台 UX 升級、商品詳細頁重建、庫存管理、許願池、快速上架

> ⚠️ **此文件仍為草稿**，多數 US 的 Acceptance Criteria 待 Cheryl 確認後才能開發。
> Sprint 5 正式開始前必須補完所有 AC 並逐一確認。
> **Retro 紀錄：** [km/decisions/sprint4-retro.md](../../km/decisions/sprint4-retro.md)

---

## 背景

Sprint 4 完成了訂單完整閉環（下單→採買→到貨→結單→出貨）並追加了 Design System 重建。
Sprint 5 的核心方向（依 Cheryl 優先序排列）：

1. **後台訂單系統 UX 升級**（B-Light 商品視圖 + 批次操作 + 顧客訂單展開）— 商家日常使用影響最大
2. **前台商品詳細頁重建**（按 store-product-detail.html mockup）— 補上現貨/預購狀態顯示，為庫存 UI 鋪路
3. **顧客管理後台重設計** — 視覺統一，套用設計系統
4. **規格庫存管理**（現貨/預購雙模式）— 依賴商品詳細頁已重建
5. **許願池**（US-22/23，從 Sprint 4 移入）— 依賴商品詳細頁有 wishlist nudge
6. **現場快速上架**（US-24）— 商家新工具，獨立功能
7. **輕量收尾**（顧客個人檔案編輯、結單資料預填）— 隨時可插入
8. **自動配單升級**（US-25）— 最複雜，放最後

---

## Features 與執行順序（建議）

> 依照「優先序 × 依賴關係」排列，帶 ⚠️ 者表示有前置依賴。

```
# ── 高優先（Cheryl 確認：優先序 1~3）──────────────────────
sprint5-order-ux         訂單管理 UX 升級
                         （AC-18.12 顧客訂單展開 + B-Light 商品分組視圖 + 批次操作）

sprint5-product-detail   前台商品詳細頁重建
                         （按 store-product-detail.html mockup 全頁重建，移除舊 desktop dual-column）

sprint5-customers-ui     顧客管理後台重設計
                         （待 Cheryl 提供 mockup 後確認 AC）

# ── 中優先（依賴 product-detail 完成）───────────────────────
sprint5-inventory        規格庫存管理                ⚠️ 依賴 sprint5-product-detail
                         （在重建好的商品詳細頁上疊加庫存 UI）

sprint5-wishlist         許願池 US-22/23             ⚠️ 依賴 sprint5-product-detail
                         （商品詳細頁底部 wishlist nudge 已完成）

# ── 後段（獨立功能）──────────────────────────────────────────
sprint5-quick-listing    現場快速上架 US-24
                         （後台獨立功能，不影響前台）

sprint5-profile          顧客個人檔案編輯 + 結單資料預填
                         （輕量，可隨時插入任一段）

sprint5-auto-alloc       自動配單升級 US-25          ← 最後執行，邏輯最複雜
```

---

## User Stories（草稿）

---

### US-NEW：前台商品詳細頁重建

> ℹ️ 設計依據：`docs/design/mockups/store-product-detail.html`
> 此頁面是規格庫存管理（US-NEW-INV）的前置條件：庫存 UI（售完 badge、剩 N 件）將疊加在重建好的頁面上。

```
As a 已加入賣場的顧客,
I want to 在視覺清晰、操作直覺的商品詳細頁瀏覽商品並下單,
So that 我能快速理解商品資訊並完成下單，不被不必要的元素干擾。
```

**Acceptance Criteria：**

**頁面整體結構**

- AC-PD1：移除現有 desktop dual-column layout（左圖右資訊），改為 mobile-first 單欄設計；桌面以最大寬 420px 置中顯示（模擬手機 frame）
- AC-PD2：移除現有的「加入收藏」愛心按鈕（已完成，2026-06-02）

**浮動頂部導航**

- AC-PD3：頁面頂部浮動導航列（`bg-white/90 backdrop-blur`），左側返回按鈕（pill 形白色半透明 + card-line）、右側分享按鈕（同樣式）
- AC-PD4：分享按鈕點擊呼叫 `navigator.share`（若瀏覽器支援）；不支援時靜默不處理

**圖片輪播**

- AC-PD5：圖片區改為全寬 scroll-snap 輪播（`overflow-x: auto; scroll-snap-type: x mandatory`），支援滑動切換；無左右箭頭
- AC-PD6：輪播右下角顯示「{目前}/{ 總張數}」計數器（`font-mono`，`bg-black/45 backdrop-blur`）
- AC-PD7：dot 指示器顯示於輪播底部置中，當前項目 dot 拉長為 18px，其餘 6px
- AC-PD8：無圖片時顯示 placeholder 漸層（`ph1` 樣式，同 ProductCard）

**商品資訊區**

- AC-PD9：標題區依序：分類 pill（`bg-sunken text-fg-muted`）→ 商品名稱（`text-xl font-display font-bold`）→ 商品描述（`text-[13px] text-fg-muted`，預設展開，不折疊）→ 售價（`text-3xl font-display font-bold text-primary`，前綴 NT$ 用 `font-mono text-xs`）
- AC-PD10：售價在頁面載入後即顯示（若有規格顯示價格區間，選定規格後更新為單一價格）；不再等待選規格後才出現

**購買狀態提示**

- AC-PD11：商品資訊下方顯示「預購/現貨」狀態卡片（`bg-[#FBEBD2] border-[#F0D9A8] rounded-xl`）：
  - 預購：卡車 icon（橘色）+ 「預購商品」+ `PRE-ORDER` badge + 說明文字「下單後由商家向廠商調貨，到貨後通知你出貨」
  - 現貨（`stock_qty > 0`）：Sprint 5 庫存 US 實作後補上（此處先顯示預購樣式）
- AC-PD12：此區塊於 Sprint 5 庫存管理（US-NEW-INV）完成後替換為規格選擇 + 售完 badge（AC-INV9~11）

**數量選擇器（重新設計）**

- AC-PD13：數量選擇器改為 pill 按鈕樣式：「-」使用 `bg-surface card-line-strong`，「+」使用 `bg-primary text-white shadow-pink`；數量數字顯示於兩按鈕中間（`font-display font-bold text-lg`）
- AC-PD14：「-」按鈕在數量為 1 時 disabled；數量上限 99

**資訊列卡片**

- AC-PD15：數量選擇器下方顯示圓角卡片（`bg-surface card-line`），包含兩列 info row：
  - 「✓ 驗貨保證」（綠色圓形核取圖示）+ 說明文字
  - 「下單即購買」（橘色盾牌圖示）+ 「無購物車，送出即向商家登記，請確認規格」

**你可能還會喜歡**

- AC-PD16：商品資訊下方顯示「你可能還會喜歡」區塊，從同賣場其他商品（`status = 'active'`，排除當前商品）隨機取最多 4 件
- AC-PD17：相關商品以 2×2 grid 呈現，每張卡片與 ProductCard 樣式一致（圓角、售價、分類 pill），點擊跳至對應商品詳細頁
- AC-PD18：同賣場無其他商品時省略此區塊
- AC-PD19：相關商品由 `/api/store-products?slug={slug}&exclude={id}&limit=4` 取得（擴充現有 API，加入 `exclude` 與 `limit` 參數）

**許願池引導卡**

- AC-PD20：相關商品區塊下方顯示許願池 nudge 卡片（紫色系漸層背景），連結至 `/store/{slug}/wishlist`；點擊進入許願池

**固定底部 CTA**

- AC-PD21：底部固定列（`bg-surface/95 backdrop-blur-md`）顯示「立即下單」按鈕（`flex-1 rounded-pill bg-primary`）；按鈕右側以「`·` NT$ {價格}」顯示已選規格價格，未選規格時不顯示價格
- AC-PD22：有規格未選時「立即下單」按鈕 disabled，底部列顯示「請先選擇規格」提示

**下單確認 Bottom Sheet（取代 Modal）**

- AC-PD23：點擊「立即下單」開啟 bottom sheet（從底部滑入動畫），不再使用置中 Modal
- AC-PD24：Bottom sheet 頂部拖曳把手（`w-10 h-1.5 rounded-pill bg-line-strong mx-auto`），點擊把手或遮罩關閉
- AC-PD25：Bottom sheet 內容依序：商品摘要（縮圖 + 名稱 + 預購 badge）→ 價格明細列（單價、數量、小計）→「確認下單」按鈕
- AC-PD26：下單成功後顯示 success overlay（置中 modal）：✓ 圖示 + 「下單成功 ✿」+ 說明文字 + 兩個 CTA（「繼續逛」導回商品列表、「看訂單」導至訂單頁）

**測試完成標準**

```
單元測試（vitest）：
□ GET /api/store-products?slug=X&exclude=Y&limit=4 — 回傳排除指定商品的其他商品，上限 4 件
□ GET /api/store-products?slug=X&exclude=Y&limit=4 — 無其他商品時回傳空陣列
□ 現有下單邏輯（POST /api/orders）不受頁面重建影響

E2E 測試（playwright）：
□ 進入商品詳細頁 → 圖片輪播顯示，滑動可切換，counter 更新
□ 有規格商品：未選規格 → 下單按鈕 disabled → 選規格 → 按鈕 enabled，底部列顯示價格
□ 無規格商品：直接點「立即下單」→ bottom sheet 開啟
□ Bottom sheet：顯示商品摘要 + 價格明細 → 點「確認下單」→ success overlay 出現
□ Success overlay：點「看訂單」→ 導至 /store/{slug}/orders
□ 「你可能還會喜歡」顯示最多 4 件同賣場其他商品
□ 許願池 nudge 點擊導至 /store/{slug}/wishlist
```

**技術驗收標準**

- 現有下單 API（`POST /api/orders`）邏輯不變，只改前端頁面結構
- 相關商品 API 擴充為可選參數（`exclude`、`limit`），不影響現有呼叫方
- Bottom sheet 使用 CSS animation（`translateY`），不引入新動畫 library

---

### US-NEW：規格庫存管理（現貨 / 預購雙模式）

> ℹ️ 確認時間：2026-06-02 Cheryl 確認。現貨採下單即扣減（方案 A），原子操作防超賣。
> **同一商品可同時有預購規格和現貨規格**（NULL vs 有值）。

```
As a 商家,
I want to 為每個規格選擇「預購」或「現貨」模式並設定庫存數量，
So that 顧客只能在有貨時下單現貨商品，售完自動鎖定，不會超賣。
```

**核心資料模型：**

```sql
-- NULL  = 預購制（不限量，維持現有行為）
-- > 0   = 現貨有庫存
-- = 0   = 現貨售完（顯示 badge，無法下單）
ALTER TABLE product_variants
  ADD COLUMN stock_qty INTEGER CHECK (stock_qty >= 0);
```

**Acceptance Criteria：**

**資料與防超賣**

- AC-INV1：`stock_qty = NULL` 的規格維持現有行為，可無限下單（預購）
- AC-INV2：下單時 `stock_qty IS NOT NULL`，使用 Supabase RPC 原子操作 `stock_qty - quantity`，防止並發超賣
- AC-INV3：`stock_qty < quantity` 時 API 回傳 `{ error: '庫存不足' }`，前台顯示提示
- AC-INV4：migration 新增 `stock_qty`，原有資料預設 `NULL`（不影響現有商品）

**商家後台 — 規格編輯**

- AC-INV5：每個規格新增「預購 / 現貨」切換：預購不填庫存；現貨填數量（整數 ≥ 0，必填）
- AC-INV6：切回預購 → `stock_qty = NULL`；填數字 → 現貨模式
- AC-INV7：商品列表顯示規格庫存狀態（有N件 / 售完）
- AC-INV8：商家可在規格編輯頁直接調整庫存數量（補貨更新）

**顧客前台 — 商品詳情頁**

- AC-INV9：`stock_qty = 0` 的規格顯示「售完」badge，disabled，無法選取
- AC-INV10：輸入數量超過 `stock_qty` 時自動 cap，提示「最多 N 件」
- AC-INV11：預購規格旁顯示「預購」label；現貨 ≤ 5 件時顯示「剩 N 件」（避免暴露完整庫存）

**庫存歸還（本 Sprint 簡化）**

- AC-INV12：本 Sprint 不實作訂單取消的自動庫存回補（US-21 尚未實作）
- AC-INV13：商家手動在規格編輯頁調整庫存數量，處理取消 / 退貨回補

---

### US-NEW：訂單管理 UX 升級（B-Light + 批次操作）

> ℹ️ 此 US 源自 Sprint 4 討論的「B-Light 商品分組視圖」與「批次狀態更新」需求（2026-06-01 Cheryl 確認方向）。

```
As a 商家,
I want to 以商品為主軸查看待採買訂單，並能批次更新多筆訂單狀態，
So that 我的操作流程貼近真實代購採買習慣（整批訂、整批到貨、整批出貨）。
```

**Acceptance Criteria：**

**B-Light：待採買 / 已訂購 商品分組視圖**

- AC-B1：待採買 Tab 新增「依商品分組」切換（預設為商品列表，可切換成訂單列表）
- AC-B2：依商品分組視圖顯示：供應商 → 商品 → 訂購顧客清單（姓名 + 數量），每組商品顯示總需求量
- AC-B3：每個商品群組左側提供「部分勾選或全部勾選標記已訂購」按鈕，點擊後批次更新該商品所有相關訂單 `status → ordered`
- AC-B4：已訂購 Tab 同樣提供「依商品分組」視圖，每組提供「部分勾選或全部標記已到貨（已配單）」按鈕
- AC-B5：批次更新成功顯示 Toast「已更新 N 筆訂單為已訂購/已配單」

**批次勾選出貨（已結單 Tab）**

- AC-B6：已結單 Tab 每列訂單右側加入 checkbox，可多選
- AC-B7：有勾選時，底部浮現 batch action bar：「已選 N 筆 [ 確認出貨 ] [ 取消選取 ]」
- AC-B8：點擊「確認出貨」→ 填入物流商 + 單號（共用同一筆適用所有選取訂單）→ 批次更新 `status → shipped`
- AC-B9：新增 `PATCH /api/admin/orders/batch` endpoint 接受 `orderIds[]` 批次狀態更新

**已出貨自動完成（14 天）**

- AC-B10：`status = 'shipped'` 超過 14 天的訂單，系統自動更新為 `status = 'completed'`
- AC-B11：實作方式：Supabase Edge Function（cron job）或每次載入時 lazy 更新

**AC-18.12：顧客訂單展開（從 Sprint 4 移入，2026-06-02 確認）**

- AC-18.12a：後台顧客 Tab 的 CustomerCard 可點擊展開，inline 顯示該顧客在此賣場的所有訂單（含未到貨灰色項目）
- AC-18.12b：展開後顯示訂單狀態、商品名稱、金額；已到貨（allocated）訂單右側有 checkbox
- AC-18.12c：勾選一或多筆 allocated 訂單後，提供「代客結單」按鈕，點擊後導向 `/admin/orders/{id}/checkout`（本 Sprint 先支援單筆）
- AC-18.12d：未到貨訂單（pending_purchase / ordered）以灰色呈現，checkbox disabled

---

### US-NEW：顧客管理頁重設計

> ℹ️ 現有顧客管理頁（待審核 + 會員名單）使用舊樣式，需套用設計系統並參考 design/mockups/admin-customers。

```
As a 商家,
I want to 在風格一致的介面中管理顧客審核和會員名單,
So that 後台視覺統一，操作體驗更流暢。
```

**Acceptance Criteria：**

- AC-C1：待審核 Tab 使用設計系統卡片元件，顯示顧客姓名、LINE ID、申請時間、邀請來源
- AC-C2：待審核卡片提供「通過」/ 「拒絕」按鈕，樣式符合 forest 主題
- AC-C3：會員名單使用 design token 表格，欄位：姓名、手機、LINE ID、加入時間
- AC-C4：兩個 Tab 樣式與訂單管理、商品管理保持一致

---

### US-22：顧客許願池（從 Sprint 4 移入，2026-06-01 確認）

```
As a 已審核通過的顧客,
I want to 向商家送出代購許願,
So that 商家能參考我的需求考慮上架商品。
```

**Acceptance Criteria：** 參見 docs/dor/sprint4-dor.md US-22（AC-22.1～22.7），原文不重複，此處僅記錄移入原因。

> 移入原因：Sprint 4 訂單管理功能量足，US-22/23 確認移至 Sprint 5 以確保訂單閉環品質（2026-06-01 Cheryl 確認）。

---

### US-23：許願池後台（從 Sprint 4 移入，2026-06-01 確認）

```
As a 商家,
I want to 查看所有顧客的代購許願並標記處理狀態,
So that 我能系統化管理採購需求，也讓顧客知道許願進度。
```

**Acceptance Criteria：** 參見 docs/dor/sprint4-dor.md US-23（AC-23.1～23.5）。

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

- 配單邏輯：商家可手動指定配單，若沒先做手動配單直接點選自動配單，就預設先進先出（FIFO）
- 同一商品多顧客下單時的配單順序
- Acceptance Criteria 待 Sprint 4 完成後補充

---

---

### US-NEW：顧客個人檔案編輯（草稿）

> ℹ️ 2026-06-02 Cheryl 提出，待確認優先順序。

```
As a 已審核通過的顧客,
I want to 在前台編輯我的姓名與聯絡電話,
So that 商家能聯繫到最新的收件人資訊。
```

**Acceptance Criteria（草稿，待確認）：**

- AC-PROF1：顧客前台「帳戶」頁或個人資訊入口，提供「編輯基本資料」按鈕
- AC-PROF2：可編輯欄位：姓名（必填）、手機（選填）
- AC-PROF3：儲存後更新 `store_members` 表中該會員的 `name` / `phone`
- AC-PROF4：LINE 顯示名稱與大頭貼維持從 LIFF 自動取得，不開放顧客自行修改

---

### US-NEW：結單資料預填（上次使用的出貨資訊）（草稿）

> ℹ️ 2026-06-02 Cheryl 提出，可行性：高（localStorage 即可，不需額外 DB）。

```
As a 顧客,
I want to 結單時自動帶入我上次填過的收件資訊，
So that 我不需要每次重新輸入姓名、電話、地址。
```

**Acceptance Criteria（草稿，待確認）：**

- AC-FILL1：結單 checkout 頁面載入時，若 localStorage 有上次填過的資料，自動帶入所有欄位
- AC-FILL2：預填的欄位：收件人姓名、手機、地址、出貨方式、超商門市（若適用）
- AC-FILL3：顧客可手動修改預填資料，送出後更新 localStorage
- AC-FILL4：每次成功提交結單後，自動更新 localStorage 為最新填入資料
- AC-FILL5：不儲存付款方式（每次需主動選擇）

> **技術說明**：資料存在 `localStorage` 鍵值 `ruei-checkout-last`，JSON 格式。跨裝置不共享（可升級至 DB，但 localStorage 足以滿足大部分使用場景）。

---

## 範圍邊界（草稿）

### In Scope（已確認）

- 訂單管理 UX 升級（AC-18.12 + B-Light + 批次操作）— 優先序 1
- 前台商品詳細頁重建（US-NEW-PD）— 優先序 2，規格庫存 UI 前置條件
- 顧客管理後台重設計（US-NEW-CUI）— 優先序 3
- 規格庫存管理（US-NEW-INV）— 依賴商品詳細頁重建
- 許願池（US-22/23，從 Sprint 4 移入）— 依賴商品詳細頁重建
- 現場快速上架（US-24）— 已確認為 Sprint 5

### 待 Cheryl 確認優先序

- 自動配單升級（US-25）— 複雜度高，確認是否同 Sprint
- 顧客個人檔案編輯（US-NEW-PROF）
- 結單資料預填（US-NEW-FILL）

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
□ 確認 Sprint 5 功能範圍（US-24 快速上架確定做；US-25 是否同 Sprint？）
□ US-24 快速上架：單一規格自動建立邏輯是否符合預期？
□ US-24 快速上架：成功後「繼續快速上架」vs「前往商品管理」按鈕順序是否正確？
□ US-25 自動配單：配單邏輯確認（FIFO / 手動指定）
□ 現場連線區域入口位置確認（側邊欄獨立項目 or /admin/products 頁面內按鈕）
```

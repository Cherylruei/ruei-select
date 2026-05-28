# Sprint 4 開發指令包（給 Claude Code）

> 怎麼用：每次新開 Claude Code session，先貼 **§0 開場**，再貼那個任務的 **§N prompt**。一次只做一個任務。

---

## §0 · Session 開場（每次都先貼）

```
你正在協助開發「芮選系統」(ruei-select) Sprint 4。

【技術棧】
Next.js 15 (App Router · Turbopack) + React 19 + TypeScript + Tailwind CSS + Supabase

【設計系統位置】
- docs/design/sprint-4-mockups/        ← 高擬真參考頁面（最終長相）
- docs/design/handoff/                  ← Token / Tailwind 設定 / 元件配方
- src/styles/design-tokens.css          ← 已導入的 token
- src/components/ui/                    ← Phase B 已重構好的共用元件

【兩個變體】
- /admin/*  → data-variant="forest"（沉穩，森林綠 + 櫻花粉）
- /store/*  → data-variant="candy"  （俏皮，糖果粉 + 薰衣草）

【鐵則】
1. 用既有 ui/ 元件組合（Button / Input / Card / Modal / Toast / StatusBadge…），
   不要重複造輪子。如果需要新元件，先停下來問我。
2. 顏色一律走 token：bg-primary、text-fg-muted、border-line…
   絕對不要 hardcode hex 或用 Tailwind 預設 gray-*。
3. 圓角統一用 token：rounded-md / lg / xl / 2xl / pill。
4. 字體：標題 font-display、內文 font-body、數字/編號 font-mono。
5. 訂單狀態一律用 <StatusBadge status="..." />，不要在頁面手刻顏色。
6. 不要動其他 Sprint 的程式碼（不在這次任務範圍內的檔案）。
7. 每完成一個檔案，停下來等我確認，再做下一個。

【驗收】
完成後告訴我：
- 改了哪些檔案
- 是否要跑 migration / 更新 Supabase schema
- 有沒有遇到需要決策的點
```

---

## §1 · sprint4-admin-orders（商家訂單管理後台）

**狀態：** 基底任務，後面三個都依賴

```
任務：sprint4-admin-orders · 商家訂單管理後台

【設計參考】
- 視覺：docs/design/sprint-4-mockups/admin-dashboard.html 的「最近訂單」表格
- 元件：docs/design/handoff/component-recipes.html 的 09 Tables / 07 Order Status / 08 Customer Card
- PRD：§七 Sprint 4 / §六 訂單狀態機

【要做什麼】
1. /admin/orders 列表頁
   - 上方 stats：總筆數、待處理、已配單、本月營收（用 StatCard）
   - 篩選 pills：全部 / 待採買 / 已訂購 / 已配單 / 已結單 / 已出貨
   - 表格欄位：訂單編號（mono）、顧客（avatar + 名字）、商品、金額（右對齊 mono）、
     狀態（StatusBadge）、操作（→ icon）
   - 點訂單列 → /admin/orders/[id]
   - 切換「依顧客分組」檢視 → 變成 CustomerCard 網格，
     每張卡列出該顧客的所有待出貨商品 + 「代客結單」按鈕

2. /admin/orders/[id] 訂單詳細頁
   - 顧客資訊區（avatar + 姓名 + LINE ID + 電話）
   - 商品清單區
   - 採購進度時間軸：待採買 → 已訂購 → 已配單（用 StatusBadge）
   - 商家操作區：依當前狀態顯示對應動作
     - 待採買 → 「向廠商下單」按鈕
     - 已訂購 → 「標記已到貨」+ 配貨方式（自動 FIFO / 手動）radio
     - 已配單 → 「代客結單」+「等待顧客結單」狀態

3. /admin/orders/new 商家代客建單
   - 選顧客（Select with avatar）
   - 選商品（從供應商商品庫帶出）
   - 規格選擇
   - 數量
   - 確認建立（created_by = 'merchant'）

【資料層】
- orders table 應該已存在（Sprint 3）
- 補欄位：ordered_at, product_category, total_amount, cost_amount, shipping_method（PRD §十）
- 確認 order_items 有 supplier_id

【非目標】
- 不做物流串接（Sprint 4 範圍外）
- 不做配貨自動化邏輯（Sprint 5）
- 不做數據圖表（Sprint 5）

開始前請列出你打算建立 / 修改的檔案，我確認後再開工。
```

---

## §2 · sprint4-checkout（顧客結單流程）

**依賴：** §1 完成（商家能標記「已配單」）

```
任務：sprint4-checkout · 顧客結單流程

【設計參考】
- 視覺：docs/design/sprint-4-mockups/store-orders.html
  - 重點看「可結單」聚焦粉色漸層卡片（含勾選 + 即時小計 + 前往結單）
- 元件：docs/design/handoff/component-recipes.html 的
  - 05 Radio Card（物流四選一，最關鍵）
  - 03 Inputs（收件資訊表單）
  - 10 Modal（確認結單）
  - 10 Toast（結單成功）
- PRD：§五 Flow 5 顧客結單流程

【要做什麼】
1. /store/[slug]/orders 訂單列表
   - 頂部 stats 3 格：待採買 / 可結單 / 已出貨（PRD 對應狀態：待採買/已配單/已出貨）
   - 「可結單」聚焦卡片：粉色漸層背景，列出所有「已配單」商品
     - 每項可勾選
     - 即時計算「已選 X 件 · 合計 NT$ Y」
     - 「前往結單」CTA 跳 /store/[slug]/orders/checkout

2. /store/[slug]/orders/checkout 結單頁
   - 帶上選中的訂單 ID 陣列
   - 物流方式（RadioCard 四選一）
     - 自取：跳出「確認取貨時間」picker
     - 超商店到店：姓名 / 手機 / 超商名稱
     - 賣貨便：姓名 / 手機 / 超商名稱（現金貨到付款，後面付款方式自動鎖定）
     - 宅配：姓名 / 手機 / 地址（顯示「運費 NT$ 210」）
   - 付款方式 RadioCard：依物流方式聯動
     - 自取 → 現金 / 匯款
     - 店到店 / 宅配 → 匯款
     - 賣貨便 → 鎖定貨到付款（不可選其他）
   - 訂單摘要：商品清單 + 小計 + 運費 + 總計
   - 「確認結單」按鈕 → 開 Modal 二次確認
   - Modal 確認 → 寫入 settlements table → Toast「已完成結單」→ 回 /store/[slug]/orders

【互動細節】
- 物流選擇切換時，下方欄位動畫式切換（淡入淡出）
- 表單欄位失焦時驗證（手機格式、地址不空）
- 「確認結單」按鈕 disabled 直到所有必填欄位完成

【非目標】
- 不串接超商 / 賣貨便 API（PRD §十一明確排除）
- 不做運費計算複雜邏輯（宅配固定 NT$ 210）

開始前請列出你打算建立 / 修改的檔案，我確認後再開工。
```

---

## §3 · sprint4-shipping（商家出貨管理）

**依賴：** §2 完成（有 settlement 紀錄）

```
任務：sprint4-shipping · 商家出貨管理

【設計參考】
- 視覺：admin-dashboard.html 的訂單表，篩選「已結單」狀態
- 元件：recipes 09 Tables、03 Input（單號）、10 Modal（填單號）、10 Toast
- PRD：§五 Flow 6 商家出貨

【要做什麼】
1. /admin/orders 已結單篩選 view 強化
   - 顯示每筆訂單的收件資訊（姓名、手機、地址 / 超商）
   - 「複製收件資訊」按鈕（複製成可貼到賣貨便 / 7-11 的格式）
   - 「填入物流單號」按鈕 → 開 Modal

2. 出貨 Modal
   - Input 物流單號（自動偵測格式）
   - 物流商下拉（賣貨便 / 7-11 / 全家 / 黑貓 / 其他）
   - 確認 → 訂單狀態 → 已出貨 → Toast「已標記出貨」
   - 同步顯示在顧客前台訂單頁的「已出貨」區

3. /admin/orders/[id] 詳細頁的出貨區
   - 已出貨：顯示物流單號 + 物流商 + 出貨時間
   - 「修改單號」次要按鈕

【資料層】
- shipments table（或 orders 加欄位 tracking_number / shipping_carrier / shipped_at）

【非目標】
- 不串接物流 API
- 不做配送進度即時追蹤

開始前請列出你打算建立 / 修改的檔案，我確認後再開工。
```

---

## §4 · sprint4-wishlist（顧客許願池送出）

**依賴：** Sprint 3 的顧客前台框架

```
任務：sprint4-wishlist · 顧客許願池

【設計參考】
- 視覺：candy 變體個性主場，類似 store-products.html 的卡片風格
- 元件：recipes 03 Inputs（textarea / file upload）、06 Badges、08 Cards、11 Empty State
- PRD：§五 Flow 7 顧客許願池流程

【要做什麼】
1. /store/[slug]/wishlist 列表頁
   - 頂部：吉祥物 + 標題「我的許願池」+ 「+ 許願」CTA
   - 過去許願清單（卡片網格，2 欄）
     - 每張卡：商品照片 + 標題 + 狀態 badge（待處理 / 已注意 / 已上架）+ 許願時間
     - 點卡片 → 詳細頁
   - 空狀態：吉祥物 + 「還沒有許願喔，把你想要的丟過來吧」+ CTA

2. /store/[slug]/wishlist/new 新增許願頁
   - 商品名稱 Input（必填）
   - 商品照片 Dropzone（必填，可從相簿 / 相機）
   - 商品連結 Input（選填，URL）
   - 型號 / 規格 Textarea（選填）
   - 「送出許願」CTA → Toast「許願已送出，等待小美確認」→ 回 /wishlist

3. /store/[slug]/wishlist/[id] 詳細頁
   - 大圖
   - 商品資訊
   - 狀態變更時間軸
   - 「取消這個許願」按鈕（次要）

【資料層】
- wishlists table：id, customer_id, store_id, name, photo_url, link, spec, status, created_at
- status enum: 'pending' / 'noted' / 'listed'

【非目標】
- 不做 LINE 私訊通知（PRD 明確：LINE Messaging API 整個產品完成後才做）
- 不做許願量限制

開始前請列出你打算建立 / 修改的檔案，我確認後再開工。
```

---

## §5 · sprint4-wishlist-admin（許願池後台）

**依賴：** §4 完成

```
任務：sprint4-wishlist-admin · 商家許願池後台

【設計參考】
- 視覺：forest 變體，類似 admin-dashboard.html 的卡片網格
- 元件：recipes 08 Cards、06 Badges、12 Filter Pills、10 Modal（狀態變更）
- PRD：§五 Flow 7 後段、§七 Sprint 4

【要做什麼】
1. /admin/wishlists 列表
   - 頂部 stats：總筆數、待處理、已上架
   - 篩選 pills：全部 / 待處理 / 已注意 / 已上架
   - 卡片網格 3 欄：商品照片 + 顧客 avatar + 商品名 + 狀態 badge + 許願時間
   - 點卡片 → 開 Drawer 或進詳細頁

2. 許願詳細 view（Drawer 或頁）
   - 完整商品資訊 + 顧客資訊 + 原始連結
   - 狀態切換器（3 段 Radio）：待處理 / 已注意 / 已上架
   - 切換 → Toast「已更新狀態」
   - 「上架對應商品」按鈕 → 跳到 /admin/products/new 並帶入許願資料

3. 連結到商品上架
   - 上架時可標記「來自許願 #ID」，許願狀態自動變「已上架」

【非目標】
- 不做 LINE 私訊通知
- 不做許願趨勢分析（Sprint 5）

開始前請列出你打算建立 / 修改的檔案，我確認後再開工。
```

---

## 📋 開發順序總覽

```
Week 1
├── sprint4-admin-orders        ★ 基底
│   └── sprint4-checkout        ★ 結單閉環
│       └── sprint4-shipping
└── 平行進行：
    └── sprint4-wishlist
        └── sprint4-wishlist-admin
```

每個任務開工前，先複習：
1. PRD 對應段落（§五 / §七）
2. mockups 對應 HTML
3. 對應 recipes 元件

---

## 🚦 給商家賣家的回饋管道

開發到一半如果遇到設計沒覆蓋到的場景（例如某個 edge case 的 UI），
**先停下來問我，不要自己發明新的視覺。** 我會回去補 mockup 或 recipe。

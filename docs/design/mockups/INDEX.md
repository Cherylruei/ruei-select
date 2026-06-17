# Mockups · Index

> Claude Code 實作頁面前，**先打開對應的 mockup HTML**。Mockup 是該頁面的權威 spec。
> 衝突時遵守 `CLAUDE.md` §1 的優先序。
>
> 這份是 **Sprint 1–5 完整頁面藍圖**。標 ✅ 的已繪製可實作；標 ⬜ 的*尚未繪製*，開發到該畫面請停下通知設計補 mockup。
> 視覺化版本見 [index.html](./index.html)。

---

## Admin（forest variant · desktop 1280px · `<html data-variant="forest">`）

| Sprint | 路由 | 元件 | 狀態 | Mockup | 主要內容 |
|---|---|---|---|---|---|
| 1 | `/admin/login` | `<AdminLogin/>` | ⬜ | _尚未繪製_ | 商家 LINE LIFF 登入 + 取得賣場身份 |
| 1 | `/admin/setup` | `<StoreSetup/>` | ⬜ | _尚未繪製_ | 賣場建立精靈：名稱 / 介紹 / 頭像上傳 + 供應商 + 生成邀請連結 |
| 1 | `/admin/suppliers` | `<AdminSuppliers/>` | ⬜ | _尚未繪製_ | 供應商 CRUD 列表 + 新增 / 編輯 |
| 1 | `/admin/customers` | `<AdminCustomers/>` | ⬜ | _尚未繪製_ | 顧客審核名單：待審核 → 通過 / 拒絕（含空狀態） |
| 3 | `/admin` | `<AdminDashboard/>` | ✅ | [admin-dashboard.html](./admin-dashboard.html) | Sidebar + 4 stat 卡 + 最近訂單表 + 今日待辦 + 熱銷排行 + 廠商表現 |
| 2 | `/admin/products` | `<AdminProducts/>` | ⬜ | _尚未繪製_ | 商品管理列表，依廠商分類 + 上 / 下架 |
| 2 | `/admin/products/new` | `<AdminProductNew/>` | ⬜ | _尚未繪製_ | 貼原文 → AI 文案優化（對比預覽）→ 規格自動偵測 → 匯率換算 → 圖片上傳 |
| 2 | `/admin/products/[id]/edit` | `<AdminProductEdit/>` | ⬜ | _尚未繪製_ | 同新增結構，帶入既有資料 |
| 4 | `/admin/orders` | `<AdminOrders/>` | ✅ | [admin-orders.html](./admin-orders.html) | 5 階段 pipeline + 狀態 tabs + 批次選取 / 向廠商下單 + 行內展開時程 |
| 4 | `/admin/orders/new` | `<AdminOrdersNew/>` | ✅ | [admin-orders-new.html](./admin-orders-new.html) | 分步表單 + sticky 訂單摘要。Step 2 商品 3 種輸入方式 |
| 4 | `/admin/orders/[id]` | `<AdminOrderDetail/>` | ⬜ | _尚未繪製_ | 顧客資訊 + 商品 + 採購時間軸 + 配貨（自動 / 手動）+ 狀態相依操作 |
| 4 | `/admin/orders/[id]/checkout` | `<AdminOrderCheckout/>` | ✅ | [admin-orders-checkout.html](./admin-orders-checkout.html) | 代客結單。結單對象提示卡 + 物流四選一 RadioCard + 收件 / 付款聯動 + sticky 結單摘要 |
| 4 | `/admin/orders/[id]/shipping` | `<AdminOrderShipping/>` | ⬜ | _尚未繪製_ | 出貨管理：已結單收件資訊 + 複製至賣貨便 + 填物流單號 → 已出貨 |
| 4 | `/admin/wishlists` | `<AdminWishlists/>` | ⬜ | _尚未繪製_ | 許願池後台：顧客許願清單 + 標記狀態（待處理 / 已注意 / 已上架）。視覺參考 dashboard 卡片網格 |
| 5 | `/admin/products/quick` | `<AdminProductQuick/>` | ⬜ | _尚未繪製_ | **手機優化** 現場快速上架：拍照 + 商品名 + 售價 → 30 秒上架 |
| 5 | `/admin/analytics` | `<AdminAnalytics/>` | ⬜ | _尚未繪製_ | 數據 Dashboard：月營業額 / 毛利 / 顧客消費 / 廠商排行 / 下單時段 / 到貨週期 |
| — | `/admin/ui-demo` | live | — | (live) | 元件 gallery —— 不要動 |

## Store（candy variant · 預設 mobile 390px · `max-w-[420px]` · `<html data-variant="candy">`）

> 多數 store 頁面提供 PC 版（`*-pc.html` 後綴 · desktop 1280px），與 mobile 版互為同一 component 的不同 viewport layout。

| Sprint | 路由 | 元件 | 狀態 | Mockup | 主要內容 |
|---|---|---|---|---|---|
| 3 | `/store/[slug]/login` | `<StoreLogin/>` | ✅ | [store-login.html](./store-login.html) · [PC](./store-login-pc.html) | 顧客 LINE LIFF 快速登入 ｜PC: 置中分割卡（左 brand hero + 右 LINE 登入） |
| 3 | `/store/[slug]/register` | `<StoreRegister/>` | ✅ | [store-register.html](./store-register.html) · [PC](./store-register-pc.html) | 顧客申請：姓名 / 手機 / LINE ID → 「待商家核准」狀態 ｜PC: 頂欄 + 2-col（表單 + 接下來會發生什麼）+ 送出後狀態畫面 |
| 3 | `/store/[slug]` | `<StoreProducts/>` | ✅ | [store-products.html](./store-products.html) · [PC](./store-products-pc.html) | Hero banner + 分類 pills + 商品 grid + 許願池 CTA + bottom tab ｜PC: top nav + sidebar 篩選 + 4 欄 grid |
| 3 | `/store/[slug]/products/[id]` | `<StoreProductDetail/>` | ⬜ | _尚未繪製_ | 商品詳細：圖片輪播 + 規格選擇 + 數量 + 下單確認彈窗（無購物車） |
| 4 | `/store/[slug]/orders` | `<StoreOrders/>` | ✅ | [store-orders.html](./store-orders.html) · [PC](./store-orders-pc.html) | stats + 可結單漸層卡（勾選與小計）+ 其他訂單列表 ｜PC: 5 stats + 2-col hero + 卡片網格 |
| 4 | `/store/[slug]/orders/checkout` | `<StoreCheckout/>` | ✅ | [store-orders-checkout.html](./store-orders-checkout.html) · [PC](./store-orders-checkout-pc.html) | 物流四選一 RadioCard + 收件 / 付款聯動（含超商 SPEC 變化）+ sticky 底欄 CTA ｜PC: form 2-col + sticky 費用明細 |
| 4 | `/store/[slug]/wishlist` | `<StoreWishlist/>` | ⬜ | _尚未繪製_ | 顧客許願清單（含狀態）+ 「＋ 許願」入口 |
| 4 | `/store/[slug]/wishlist/new` | `<StoreWishlistNew/>` | ⬜ | _尚未繪製_ | 新增許願：商品名（必填）/ 照片（必填上傳）/ 連結（選填）/ 型號規格（選填） |

---

## 訂單狀態詞彙

顧客前台與商家後台的狀態詞彙不一樣（依 PRD §六 狀態機）：

| 顧客看到 | 商家看到 | 說明 |
|---|---|---|
| — | `待採買` | 訂單建立但商家尚未向廠商下單（顧客不需知道這個中間狀態） |
| `已訂購` | `已訂購` | 商家已向廠商下單 · 預計到貨 |
| `可結單` | `已配單` | 貨已到並完成配單 · 顧客可結單付款 |
| `已結單` | `已結單` | 顧客（或商家代客）已填物流並送單 · 待付款 / 待出貨 |
| `已出貨` | `已出貨` | 商家建立出貨單、填入物流單號 |
| `已完成` | `已完成` | 顧客確認收到 |

註：商家代客下單時，訂單建立後狀態即為 `待採買`（但顧客 LIFF 看到的都是 `已訂購` 以上）。
顧客前台**只有 `已訂購`**、沒有 `待採買` 類別；賣貨便物流只支援 **7-11**（無蝦皮店到店）。

---

## 設計系統提醒

- 兩個變體靠 `data-variant` attr 切換：
  - `<html data-variant="forest">` → admin
  - `<html data-variant="candy">` → store
- Mockup 引用的 `design-tokens.css` 與 src 共用同一份 token 變數（檔案維護於 `src/styles/design-tokens.css`）
- Mockup 不會手 import 元件，但 class 組合就是元件對應的組合方式 —— CC 應該識別出來並對應到 `<Button variant="...">` / `<StatusBadge status="...">` 等

---

## 使用方式（給 Claude Code）

實作一個畫面時，依序：

1. **打開該路由對應的 mockup HTML**，讀完整檔（狀態 ⬜ 的請勿自行發明視覺，停下通知設計）
2. **辨識用了哪些既有元件**（Button / Card / StatusBadge / StatCard / RadioCard / SearchSelect…）
3. **辨識區塊組合方式**（stats 列、filter pills、表格、聚焦卡…）
4. **用既有 `src/components/ui/` 元件實作**，不要重新刻 markup
5. **token 對應**：mockup 用 `bg-primary` → src 也用 `bg-primary`，不要替換成 `pink-500` 等預設色

---

## 加新 mockup 的流程

1. 設計師（Claude Design）產出 `mockups/foo-bar.html`（引用 `../src/styles/design-tokens.css`）
2. **把此 INDEX.md 對應列的 ⬜ 改成 ✅ 並補連結** —— 不用新增列，藍圖已排好
3. `mockups/index.html` 的 gallery 是 data-driven，改 `PAGES` 陣列裡那筆的 `status: 'done'` + `file` 即可
4. 通知開發（CC）對應的元件可以開工

---

## 跨 Sprint 維護

- Mockup **不分 sprint 資料夾**，全部扁平在 `mockups/` 底下，用上表 Sprint 欄位區分
- 已被新版取代的舊 mockup 命名為 `foo-bar.v1.html` 並標註 _archived_

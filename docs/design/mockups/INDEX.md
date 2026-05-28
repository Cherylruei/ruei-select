# Mockups · Index

> Claude Code 實作頁面前，**先打開對應的 mockup HTML**。Mockup 是該頁面的權威 spec。
> 衝突時遵守 `CLAUDE.md` §1 的優先序。

---

## 路由 ↔ 元件 ↔ Mockup 對照

### Admin（forest variant · desktop · 1280px）

| Sprint | 路由 | 元件 | Mockup | 主要內容 |
|---|---|---|---|---|
| 3 | `/admin` | `<AdminDashboard/>` | [admin-dashboard.html](./admin-dashboard.html) | Sidebar + 4 個 stat 卡 + 最近訂單表 + 今日待辦 + 熱銷排行 + 廠商表現 |
| 4 | `/admin/orders` | `<AdminOrders/>` | [admin-orders.html](./admin-orders.html) | 5 階段 pipeline + 狀態 tabs + 批次選取 / 向廠商下單 + 行內展開時程 |
| 4 | `/admin/orders/new` | `<AdminOrdersNew/>` | [admin-orders-new.html](./admin-orders-new.html) | 分步表單 + sticky 訂單摘要。Step 2 商品 3 種輸入方式 |
| 4 | `/admin/orders/[id]` | `<AdminOrderDetail/>` | _尚未繪製_ | 顧客資訊 + 商品 + 採購時間軸 + 狀態相依操作 |
| 4 | `/admin/wishlists` | `<AdminWishlists/>` | _尚未繪製_ | 許願池後台。視覺參考 admin-dashboard 卡片網格 |
| — | `/admin/ui-demo` | live | (live) | 元件 gallery —— 不要動 |

### Store（candy variant · mobile · 390px · `max-w-[420px]`）

| Sprint | 路由 | 元件 | Mockup | 主要內容 |
|---|---|---|---|---|
| 3 | `/store/[slug]` | `<StoreProducts/>` | [store-products.html](./store-products.html) | Hero banner + 分類 pills + 2 欄商品 grid + 許願池 CTA + bottom tab |
| 4 | `/store/[slug]/orders` | `<StoreOrders/>` | [store-orders.html](./store-orders.html) | 3 個 stats + 可結單漸層卡（含勾選與小計） + 其他訂單列表 |
| 4 | `/store/[slug]/orders/checkout` | `<StoreCheckout/>` | _尚未繪製_ | 物流四選一 RadioCard + 付款方式聯動 + 訂單摘要 |
| 4 | `/store/[slug]/wishlist` | `<StoreWishlist/>` | _尚未繪製_ | 顧客許願池清單 |
| 4 | `/store/[slug]/wishlist/new` | `<StoreWishlistNew/>` | _尚未繪製_ | 新增許願（商品名 / 照片 / 連結 / 規格） |

---

## 設計系統提醒

- 兩個變體靠 `data-variant` attr 切換：
  - `<html data-variant="forest">` → admin
  - `<html data-variant="candy">` → store
- Mockup 引用的 `design-tokens.css` 與 src 共用同一份 token 變數
- Mockup 不會手 import 元件，但 class 組合就是元件對應的組合方式 —— CC 應該識別出來並對應到 `<Button variant="...">` / `<StatusBadge status="...">` 等

---

## 使用方式（給 Claude Code）

實作一個畫面時，依序：

1. **打開該路由對應的 mockup HTML**，讀完整檔
2. **辨識用了哪些既有元件**（Button / Card / StatusBadge / StatCard / RadioCard / SearchSelect…）
3. **辨識區塊組合方式**（stats 列、filter pills、表格、聚焦卡…）
4. **用既有 `src/components/ui/` 元件實作**，不要重新刻 markup
5. **token 對應**：mockup 用 `bg-primary` → src 也用 `bg-primary`，不要替換成 `pink-500` 等預設色

---

## 標註 _尚未繪製_ 的畫面

清單中標 _尚未繪製_ 的畫面：
- **不要自己發明視覺**
- 開發到該畫面時，停下來通知設計補 mockup
- 或先用 placeholder + `// TODO: awaiting design` 註解

---

## 加新 mockup 的流程

1. 設計師（Claude Design）產出 `mockups/foo-bar.html`
2. **同步更新此 INDEX.md**：加一列 / 改 _尚未繪製_ → 連結
3. 通知開發（CC）對應的元件可以開工

---

## 跨 Sprint 維護

- Mockup **不分 sprint 資料夾**，全部扁平在 `mockups/` 底下
- 用上表 Sprint 欄位區分
- 已被新版取代的舊 mockup 命名為 `foo-bar.v1.html` 並標註 _archived_

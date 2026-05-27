# 芮選 Design System · Migration Notes

> 給開發者（你 + Claude Code）的導入指南。Sprint 4 開工前先讀。

---

## 0. 交接包檔案

| 檔案 | 用途 |
|---|---|
| `design-tokens.css` | 所有色彩 / 圓角 / 字體 / 陰影的 CSS 變數。**直接拷貝**到專案 |
| `tailwind.config.ts` | 把 CSS 變數接成 Tailwind utility。**合併**到現有設定 |
| `component-recipes.html` | 每個元件的視覺 + Tailwind JSX code。**參考** |
| `migration-notes.md` | 你正在讀的這份 |

---

## 1. 安裝 step-by-step

### 1.1 放入 token
```bash
cp design-tokens.css <project>/src/styles/design-tokens.css
```

### 1.2 在 globals.css 第一行 import
```css
@import "./styles/design-tokens.css";
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 1.3 合併 tailwind.config.ts
把 `theme.extend` 裡的 `colors / borderRadius / boxShadow / fontFamily / fontSize / transitionTimingFunction / transitionDuration` 合併進去。如果有衝突，**以 handoff 版為準**。

### 1.4 載入字體（layout.tsx）
```tsx
import { Zen_Maru_Gothic, Noto_Sans_TC, JetBrains_Mono } from "next/font/google";

const display = Zen_Maru_Gothic({
  subsets: ["latin"], weight: ["400","500","700","900"],
  variable: "--font-display-loaded",
});
const body = Noto_Sans_TC({
  subsets: ["latin"], weight: ["400","500","600","700"],
  variable: "--font-body-loaded",
});
const mono = JetBrains_Mono({
  subsets: ["latin"], variable: "--font-mono-loaded",
});

// <html className={`${display.variable} ${body.variable} ${mono.variable}`}>
```

### 1.5 兩個 Route Group Layout
```
app/
├── (admin)/
│   ├── layout.tsx       ← <body data-variant="forest">
│   └── admin/...
└── (store)/
    ├── layout.tsx       ← <body data-variant="candy">
    └── store/[slug]/...
```

```tsx
// app/(admin)/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div data-variant="forest" className="min-h-screen bg-app text-fg">{children}</div>;
}

// app/(store)/layout.tsx
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <div data-variant="candy" className="min-h-screen bg-app text-fg">{children}</div>;
}
```

---

## 2. 重構順序（推薦給 Claude Code）

按這個順序改，每一步都能獨立 deploy、不會打斷 Sprint 4 開發：

### Phase A · 基礎建設（半天）
1. ✅ Token + Tailwind 設定 + 字體
2. ✅ 兩個 layout 加 data-variant
3. ✅ 跑一次 build 確認沒壞

### Phase B · 共用元件（1–2 天）
依照 `component-recipes.html`，重構 `src/components/ui/` 底下的：

| 順序 | 元件 | 為什麼先做 |
|---|---|---|
| 1 | `Button` | 散布最廣，影響最大 |
| 2 | `Badge` | 訂單狀態、廠商標籤都靠它 |
| 3 | `Input` / `Textarea` / `Select` | 表單元件，Sprint 4 很多 |
| 4 | `Card` | 商品卡、訂單卡的容器 |
| 5 | `Table` | 訂單管理頁主角 |
| 6 | `Modal` | 結單確認、刪除確認 |
| 7 | `Toast` | 操作回饋 |
| 8 | `EmptyState` | 還沒訂單、還沒商品時 |
| 9 | `Switch` / `Checkbox` / `Radio` | 設定頁、表單細節 |

### Phase C · 既有頁面套用（依 Sprint 區分）
Sprint 1–3 的頁面只要元件換好就會自動更新。不需要逐頁改。

只有「硬編色」的地方需要手動修：
- `bg-gray-100` → `bg-sunken` 或 `bg-ink-100`
- `text-gray-500` → `text-fg-muted`
- `border-gray-200` → `border-border-default`
- `rounded-md` → 保留（不衝突）
- 任何 `#FF...` / `#3C...` 之類的 hex → 改 token

### Phase D · Sprint 4 新功能
直接照 `component-recipes.html` 寫，token 都到位了，會很順。

---

## 3. Sprint 4 各頁面建議

### `/admin/orders` 訂單管理列表
- Layout：`Table` 為主，上方 filter pills 用 `Badge`
- 狀態欄一定用 status badge（不要寫純文字）
- 「依顧客分組」用 `Tabs` 切換

### `/admin/orders/new` 代客建單
- 用 `Card` 包整個表單
- 顧客選擇用 `Select` with avatar
- 商品選擇可以另開一個 modal 或 popover

### `/admin/orders/{id}/checkout` 代客結單
- 頂部放一塊提示卡片：`bg-primary-bg text-primary-hv` 顯示「正在為 OOO 顧客結單」
- 物流方式四選一用大 `Radio Card`（不是普通 radio）
- 付款方式聯動顯示

### `/store/{slug}/orders` 顧客結單流程（蜜糖可愛）
- 注意這頁在 `(store)/` 底下，會自動切到 candy 變體
- 物流四選一用 emoji + 大圓角 card
- 確認結單用 modal + 粉色 CTA

### `/store/{slug}/wishlist` 許願池
- candy 變體主場
- 上傳照片用大圓角 dropzone
- 已許願清單用卡片網格
- 狀態（待處理 / 已注意 / 已上架）用 badge

### `/admin/wishlists` 許願池後台
- 卡片網格 + 狀態 badge filter
- 點卡片開 detail drawer，更新狀態

---

## 4. 不要做的事

- ❌ 不要為了「裝飾」加額外動畫；按鈕的點擊 scale 已內建在 token
- ❌ 不要在 admin 區用蜜糖可愛的 hot pink (#FF6E94)，會太鬧
- ❌ 不要 hardcode 顏色；一律走 token
- ❌ 不要在 candy 區用直角；圓角才有個性
- ❌ 商品圖、頭像佔位請用 `bg-sunken` 配 `text-fg-subtle` 文字，不要用灰色 box

---

## 5. 給 Claude Code 的開工提示詞

複製這段給 Claude Code：

```
我有一份 design system handoff（在 handoff/ 資料夾）。請按以下步驟導入：

【Phase A · 基礎建設】
1. 把 design-tokens.css 放到 src/styles/，從 globals.css 第一行 import
2. 把 tailwind.config.ts 的 theme.extend 合併到我現有的 tailwind 設定
3. 用 next/font 載入 Zen Maru Gothic / Noto Sans TC / JetBrains Mono
4. 在 app/(admin)/layout.tsx 加 data-variant="forest"
   在 app/(store)/layout.tsx 加 data-variant="candy"
5. 跑 build 確認沒壞

【Phase B · 共用元件】
對照 handoff/component-recipes.html，按以下順序重構：
Button → Badge → Input/Textarea/Select → Card → Table → Modal → Toast → EmptyState → Switch/Checkbox/Radio

每個元件都把 className 改成 recipes 裡的版本。保持原本的 props 介面、業務邏輯、API。

完成後列出你改了哪些檔案。Phase C 我會另外指示。
```

---

## 6. 驗收清單

完成 Phase A + B 後，跑一遍：

- [ ] 商家後台任一頁，顏色是森林綠 + 櫻花粉
- [ ] 顧客前台任一頁，顏色是糖果粉 + 薰衣草紫
- [ ] 切換 admin / store 路徑，視覺有明顯個性差異
- [ ] 訂單狀態 badge 六種狀態顏色各異
- [ ] Modal 開啟有圓潤陰影
- [ ] 按鈕點擊有 scale 回饋
- [ ] 字體是 Zen Maru Gothic（標題）+ Noto Sans TC（內文）
- [ ] 數字、訂單編號是 JetBrains Mono
- [ ] 沒有殘留的 Tailwind 預設灰（gray-100, gray-500 等）

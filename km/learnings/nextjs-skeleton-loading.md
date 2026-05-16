# 學習：Next.js App Router 的 Skeleton Loading 模式

**記錄時間：** Sprint 1（2026-05-16）
**適用範圍：** Next.js App Router，任何有 Server Component 資料等待的頁面

---

## 問題背景

Next.js App Router 使用 Server Component，資料在 server 端 fetch 完才回傳 HTML 給瀏覽器。問題在於：

- 側邊欄點擊切換頁面時，使用者看到的是**空白畫面**，等到 Server Component fetch 完才出現內容
- 沒有任何「正在載入」的視覺回饋，體驗差
- 這與「Next.js 很快」的印象矛盾 — 快是指 **SPA 導航後的初始 HTML 不需要二次請求**，但 Server Component 的資料等待本身還是會讓使用者等

## Next.js 的解法：`loading.tsx` + React Suspense

Next.js App Router 有一個**約定俗成的機制**：在任何 `page.tsx` 旁邊放一個 `loading.tsx`，Next.js 會自動用它包成 `<Suspense>`：

```
src/app/admin/(protected)/
├── page.tsx          ← 真正的內容（Server Component，需要等待）
├── loading.tsx       ← 骨架畫面（立即顯示，不等待）
├── suppliers/
│   ├── page.tsx
│   └── loading.tsx
└── store/
    ├── page.tsx
    └── loading.tsx
```

原理：
1. 使用者點擊導航
2. **瀏覽器立即顯示 `loading.tsx` 的內容**（不等 server）
3. Server Component 資料 fetch 完成後，**React streaming 把真實內容替換進來**
4. 使用者感受到「有反應」，而非空白等待

## 共用的 Skeleton 元件

為了避免每個 `loading.tsx` 各自寫一堆重複的閃爍動畫，抽出共用元件：

```tsx
// src/app/admin/components/Skeleton.tsx

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 ${className ?? ''}`}
    />
  )
}
```

Tailwind 的 `animate-pulse` 提供淡入淡出的閃爍效果，不需要自己寫 keyframe。

## loading.tsx 的寫法原則

`loading.tsx` 的 UI **結構要盡量模仿真實頁面的 layout**，讓替換時不會跳動（避免 CLS）：

```tsx
// src/app/admin/(protected)/suppliers/loading.tsx
import { Skeleton } from '@/app/admin/components/Skeleton'

export default function SuppliersLoading() {
  return (
    <div className="p-6">
      {/* 標題區 */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* 表格骨架：模仿真實表格的欄位比例 */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 注意事項

### `loading.tsx` 是 per-segment 的

每個路由段（route segment）的 `loading.tsx` 只覆蓋該段的內容區域。`layout.tsx` 的部分（Sidebar、Header）**不會被 loading 替換** — 它們在第一次載入後就固定了。

這表示：
- 側邊欄不會在頁面切換時消失 ✅
- 只有主內容區會顯示骨架畫面 ✅
- 符合 SPA 的導航體驗 ✅

### Client-side 導航（`<Link>`）vs 首次載入

| 情境 | loading.tsx 行為 |
|------|-----------------|
| 首次載入（F5、直接輸入 URL） | 顯示（streaming SSR） |
| `<Link>` 點擊切換頁面 | 顯示（prefetch 完後 transition） |
| `router.push()` | 顯示 |

### 不要在 `loading.tsx` 放互動邏輯

`loading.tsx` 應該是純展示、無狀態的元件。互動邏輯全在 `page.tsx` 或 Client Component 裡。

## 為什麼這比 client-side spinner 好

傳統做法：在 Client Component 用 `useEffect` + `useState` 控制 loading spinner。

| 比較項目 | Client spinner | loading.tsx |
|---------|----------------|-------------|
| 初次頁面載入 | 必須等 JS bundle 載入才顯示 | Server streaming 立即顯示 |
| SEO | 內容在 JS 執行後才出現 | Server 回傳骨架 HTML |
| 實作複雜度 | 每個元件自己管 loading state | 放一個檔案就好 |
| 閃爍（FOUC） | 可能有 | 幾乎沒有（streaming 替換） |

## 參考

- [Next.js 官方文件：loading.js](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [React 官方文件：Suspense](https://react.dev/reference/react/Suspense)
- 本專案骨架元件：[src/app/admin/components/Skeleton.tsx](../../src/app/admin/components/Skeleton.tsx)

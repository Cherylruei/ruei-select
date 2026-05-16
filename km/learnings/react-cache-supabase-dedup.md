# 學習：React cache() 搭配 Supabase 做 Server Component 請求去重

**記錄時間：** Sprint 1（2026-05-16）
**適用範圍：** Next.js App Router + Supabase（任何 Server Component 資料存取）

---

## 問題背景

Next.js App Router 的架構中，`layout.tsx` 和 `page.tsx` 都是獨立的 Server Component，各自執行。如果兩者都需要「目前登入的使用者」，最直覺的寫法是各自呼叫一次 Supabase：

```ts
// layout.tsx
const { data: { user } } = await supabase.auth.getUser() // 第 1 次網路請求

// page.tsx（同一個 render，但 layout 執行完才執行）
const { data: { user } } = await supabase.auth.getUser() // 第 2 次網路請求（浪費！）
```

這造成同一個頁面載入發出多次相同的 Supabase API 請求，增加延遲也浪費配額。

## 解法：React `cache()`

React 18 提供了 `cache()` 函式，**在同一個 server render 樹（request）內，相同參數的函式呼叫只執行一次，後續呼叫直接拿快取結果**。

```ts
// src/lib/auth/session.ts
import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// getServerSession 在同一個 request 內只會真正執行一次
export const getServerSession = cache(async () => {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
})

// 同樣的模式套用到 user profile
export const getServerUserProfile = cache(async () => {
  const user = await getServerSession()
  if (!user) return null
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  return data
})

// 也套用到 store 資料
export const getServerStore = cache(async () => {
  const profile = await getServerUserProfile()
  if (!profile?.store_id) return null
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('stores')
    .select('*')
    .eq('id', profile.store_id)
    .single()
  return data
})
```

使用時，`layout.tsx` 和 `page.tsx` 各自 import 並呼叫，但實際只發出一次請求：

```ts
// layout.tsx
const user = await getServerSession()   // 發出 Supabase API 請求

// page.tsx（同一個 render）
const user = await getServerSession()   // 直接從 cache 拿，不重複請求
const store = await getServerStore()    // layout 已取過 user，這裡也是 cache hit
```

## 重要限制

**`cache()` 的有效範圍是「單一 request」**，不是跨 request 的持久快取。

| 特性 | 說明 |
|------|------|
| 作用域 | 單次 HTTP request 的 render 樹 |
| 跨 request | 不共享，每個新請求重新執行 |
| 跨使用者 | 不會混用（每個 request 獨立） |
| 和 `unstable_cache` 差異 | `cache()` 是 request-scoped，`unstable_cache` 是跨 request 的持久快取（需注意 invalidation） |

這表示 `cache()` **天然安全**，不會有 A 使用者看到 B 使用者資料的問題。

## 與 Next.js `fetch` 的去重比較

Next.js 對 `fetch()` 有內建的去重機制（相同 URL + options 自動合併）。但 Supabase 使用的是 `@supabase/ssr` 的自定義 HTTP client，**不走 `fetch()` 的去重邏輯**，所以必須自己用 `cache()` 做。

## 實際效果（Sprint 1 量測）

| 頁面 | 改善前 Supabase 請求數 | 改善後 |
|------|----------------------|--------|
| /admin/suppliers | 4 次（getUser × 2 + users + stores） | 1 次（只剩 suppliers 查詢） |
| /admin/store | 3 次 | 1 次 |

## 這個模式之後會一直用

每個新的 `page.tsx` 只需要呼叫對應的 helper，不用自己重新查詢 user/store：

```ts
// 新頁面的標準寫法
export default async function SomePage() {
  const store = await getServerStore()  // 已包含 user → profile → store 的鏈式查詢
  if (!store) redirect('/admin/login')
  // ... 用 store.id 做這個頁面的業務查詢
}
```

## 參考

- [React 官方文件：cache()](https://react.dev/reference/react/cache)
- 相關 bug 記錄：[supabase-session-vs-user.md](../bugs/supabase-session-vs-user.md)

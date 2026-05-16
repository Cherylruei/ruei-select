# Bug: Supabase Server Component 使用 getSession() 導致 render 錯誤

**發現時間：** Sprint 1（2026-05-16）
**嚴重程度：** HIGH — 生產環境會出現 500 錯誤或 session 讀取失敗

---

## 問題描述

在 Next.js App Router 的 Server Component（`layout.tsx`、`page.tsx`）中呼叫 `supabase.auth.getSession()`，在某些情況下會回傳空的或無效的 session，導致已登入的使用者被錯誤 redirect 到登入頁，甚至觸發 Server Component 500 錯誤。

## 根因

`getSession()` 是從 **cookie 中讀取 JWT，不向 Supabase 驗證**。這表示：

1. **不驗證 token 是否有效**：過期或被撤銷的 token 仍會被當成有效 session 回傳。
2. **在 Server Component 中讀取 cookie 有時機問題**：Next.js 的 cookie API 在某些 render 階段（特別是 streaming RSC）可能讓 `getSession()` 讀不到 cookie，回傳 `null`。
3. **Supabase 官方文件明確警告**：`getSession()` **不應在 server-side 代碼中信任**，因為它可能被 client 偽造。

```
// Supabase 文件原文警告（@supabase/ssr）:
// "Never use getSession() in Server Components, Server Actions or Route Handlers.
//  It is not guaranteed to revalidate the Auth token."
```

## 踩坑過程

Sprint 1 開發時為了「減少一次 Supabase API round-trip」，將 `layout.tsx` 中的 `getUser()`（會向 Supabase server 驗證）改成 `getSession()`（只讀 cookie）。

看起來本地開發正常，但實際上埋了兩個地雷：
- 本地開發 JWT 通常剛簽發，未過期，所以不會觸發問題
- 同一個 render 裡 `layout` 和 `page` 各自呼叫 `getSession()`，等於讀了兩次 cookie，沒有節省任何東西

後來發現問題，必須 revert 回 `getUser()`。

## 正確解法

**一律使用 `getUser()`，再用 React `cache()` 做去重。**

```ts
// src/lib/auth/session.ts
import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const getServerSession = cache(async () => {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
})
```

- `getUser()` 每次都向 Supabase server 驗證 JWT，是唯一安全的 server-side 方式。
- `cache()` 讓同一個 request（同一個 render tree）內多次呼叫只發出一次網路請求。
  - `layout.tsx` 呼叫一次 → `page.tsx` 呼叫一次 → 實際只打一次 Supabase API。

## 判斷準則

| 情境 | 正確 API |
|------|----------|
| Server Component / layout / page | `getUser()` + `cache()` |
| Route Handler（API route） | `getUser()` |
| Client Component | `getSession()`（client 端安全） |
| Middleware | `getUser()`（見 Supabase middleware 範例） |

## 參考

- [Supabase 官方：Using Supabase with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- 相關學習筆記：[react-cache-supabase-dedup.md](../learnings/react-cache-supabase-dedup.md)

# 本地開發踩坑紀錄

> 整理 Sprint 3 整合本地 Supabase 過程中遇到的問題與根本解法。
> 適合下一個 session 或新加入的開發者快速避坑。

---

## 1. Windows 上 `Ctrl+C` 不會清乾淨 node 子進程

**症狀**：跑了幾十次 `npm run dev` 後電腦變超慢、dev server 啟動會失敗或 `ERR_EMPTY_RESPONSE`。

**根因**：
- `npm run dev` 會 spawn 3-5 個 node 進程（Next.js dev server + Turbopack workers + type checker）
- Windows 的 `Ctrl+C` 只送 SIGINT 給 parent process
- Turbopack 開的 worker 進程常清不乾淨 → 累積 60+ 殘留進程

**檢查**：
```powershell
Get-Process node
```

**根治**：用 `npm run dev:clean`（已加在 package.json，啟動前會自動清掉所有 node + `.next`）。

---

## 2. Multi-lockfile 困擾 Turbopack

**症狀**：dev server log 出現
```
We detected multiple lockfiles and selected the directory of C:\Users\heave\package-lock.json as the root directory.
```

**根因**：
- 使用者家目錄 `C:\Users\heave\` 有一個無關的舊 `package-lock.json`（可能是 2024 年某次 `npm install` 在錯目錄留下的）
- Turbopack 從 cwd 往上找 lockfile 決定 root，找到家目錄那個就停了

**解法**：刪掉孤兒 lockfile
```powershell
Remove-Item C:\Users\heave\package-lock.json -Force
```

> 不要在 `next.config.ts` 加 `turbopack: { root: ... }`，會造成 dev server 啟動異常變慢。

---

## 3. Supabase JS client `as` 型別轉換吞掉錯誤

**症狀**：`/api/store-auth` 一直回傳 `status: 'none'`，但手動 SQL 查 DB 資料完全正確。

**根因**：
原本程式碼把錯誤型別轉成 `unknown` 後丟掉：
```typescript
const { data: member } = (await db.from(...).select(...).maybeSingle()) as {
  data: MemberRow | null
  error: unknown  // ← 這裡被吞掉
}
```

實際上 PostgREST 回傳的錯誤是 `column store_members.created_at does not exist`（資料表欄位實際是 `applied_at`）。錯誤被吞掉後 `data` 是 null，函式回傳 `status: 'none'`。

**根治**：
1. 不要用 `as` 蓋掉 error 型別
2. dev 模式下 `console.error` 印出 query error
3. 已套用在 `src/lib/store-auth/index.ts`

**教訓**：寫 Supabase query 時，永遠檢查 error。**型別轉換不是好藉口**。

---

## 4. `store_members.created_at` 不存在

**症狀**：上面那個錯誤的根因。

**根因**：`store_members` 資料表的時間欄位是 `applied_at` 和 `reviewed_at`，**沒有 `created_at`**。

**檢查**：直接看 migration `supabase/migrations/0001_initial.sql` 的 schema 定義。

**教訓**：跨資料表查詢時，不要假設每張表都有 `created_at`。看 migration 不是看 type definition。

---

## 5. placehold.co 預設回傳 SVG 被 Next.js Image 擋掉

**症狀**：seed 用 placehold.co 當測試圖，console 出現
```
The requested resource has type "image/svg+xml" but dangerouslyAllowSVG is disabled
```

**根因**：placehold.co 預設回 SVG，Next.js Image 為了安全預設擋 SVG。

**解法（推薦）**：seed URL 加 `.png` 副檔名
```
https://placehold.co/400x400/fce4ec/c2185b.png?text=面膜
```

**不推薦**：開 `dangerouslyAllowSVG: true`（會放行所有 SVG，安全風險）。

---

## 6. LIFF dev bypass 鏈條斷掉造成 `status: 'none'`

**症狀**：本地 `/store/test-store` 顯示「您尚未加入此賣場」，但 DB 有對應的 approved 會員。

**根因**：dev bypass 必須**整條鏈**都通：
1. `verifyLiffToken('dev-mock-token')` → `{ lineId: 'U_dev_mock' }`
2. seed 必須有 `users.line_id = 'U_dev_mock'`
3. seed 必須有 `store_members` 把該 user 連到目標 store + status = 'approved'

任何一環斷掉都會回傳 `status: 'none'`（store 找得到，但 user / member 找不到）。

**檢查**：寫一個 `/api/debug-env` route 跑完整流程印出每一步結果，找出哪一步斷掉。
（用完記得刪掉，dev-only。）

---

## 7. Next.js dev server 編譯快取累積

**症狀**：`.next/` 目錄越來越大，HMR 越來越慢，奇怪的舊版程式碼還在跑。

**根治**：`npm run dev:clean` 會自動清掉 `.next`。或手動：
```powershell
Remove-Item .next -Recurse -Force
```

---

## 重啟 SOP（每次卡住時）

```powershell
# 1. 清掉所有殘留進程
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 確認 Supabase 在跑
npx supabase status

# 3. 清快取 + 重啟（用新加的 script）
npm run dev:clean
```

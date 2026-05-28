# claude.md — 芮選系統開發工作合約

> 每次開啟 session 必須先讀完這份文件，再開始任何工作。
> 如需修改本文件，必須提出變更內容請 Cheryl 確認後才能執行。

---

## ⚠️ 語言規則（強制）

**所有回覆、說明、程式碼註解一律使用繁體中文。禁止使用韓文、日文或其他語言。**
**若發現自己輸出非繁體中文，必須立即停止並以繁體中文重新回答。**

---

## ⛔ 常見錯誤禁止清單（每次開 session 必讀，違反即停止）

這些是過去實際發生的錯誤，不得重蹈：

```
❌ 禁止把 dev-mock-token bypass 當成功能測試或驗收依據
   → dev-mock-token 只用於本地開發啟動，不代表真實 LIFF 流程可用

❌ 禁止為前台顧客建立 email/password 帳號（seed.sql 或任何地方）
   → 前台只有 LINE LIFF 登入，顧客測試帳號使用 line_id

❌ 禁止建立「前後台不串聯」的種子資料
   → seed.sql 必須包含完整旅程：顧客 → 下單 → 商家後台可見
   → 建立前先讀 docs/USER_JOURNEYS.md

❌ 禁止以「單功能跑通」作為完成標準
   → 驗收必須包含：顧客操作 → 商家後台反映（或反向）

❌ 禁止自行決定「這個 sprint 做 LINE Messaging API」
   → LINE Messaging API 不在 Sprint 1–5 範圍，整個產品完成後才開發
```

> 詳細架構約束見 [docs/SYSTEM_CONSTRAINTS.md](docs/SYSTEM_CONSTRAINTS.md)
> 使用者旅程與前後台串聯見 [docs/USER_JOURNEYS.md](docs/USER_JOURNEYS.md)

---

## 1. 專案簡介

**專案名稱：** 芮選系統（ruei-select）
**產品定位：** 以 LINE 生態系為核心的代購賣場管理平台
**目標用戶：** 台灣代購賣家（商家）、買家（顧客）
**核心價值：** 讓代購賣家把時間花在選品和顧客關係上，而不是手動整理訂單和撰寫文案
**技術棧：** Next.js 15 (App Router · Turbopack) · React 19 · TypeScript · Supabase · Tailwind CSS · LINE LIFF
**部署：** Vercel
**PRD：** docs/PRD.md

---

## 2. 設計系統

### 設計真相來源（優先序，高 → 低）

| # | 來源 | 角色 |
|---|---|---|
| 1 | `src/components/ui/*.tsx` | **元件實作（最高權威）** |
| 2 | `/admin/ui-demo`（live page） | **元件實況** |
| 3 | `docs/design/mockups/*.html` | **頁面 spec** |
| 4 | `docs/design/handoff/component-recipes.html` | **設計意圖（補充）** |
| 5 | `src/styles/design-tokens.css` | **Token 真相** |

**衝突仲裁**：
- recipes 與 ui-demo 衝突 → 以 **ui-demo（真實 code）** 為準，回報差異
- mockup 與 ui-demo 衝突 → **停下來問**
- mockup 未覆蓋的場景 → **停下來問**，不要自己發明視覺

### 設計鐵則

1. **顏色一律走 token**：`bg-primary` / `text-fg-muted` / `border-line`…
   ❌ 禁止 hardcode hex（`#F25C7A`）；❌ 禁止 Tailwind 預設 `gray-*` / `pink-*` / `slate-*`
2. **圓角統一 token**：`rounded-md` / `lg` / `xl` / `2xl` / `pill`
3. **字體 token**：標題 → `font-display`（Zen Maru Gothic）／內文 → `font-body`（Noto Sans TC）／數字編號 → `font-mono`（JetBrains Mono）
4. **訂單狀態用** `<StatusBadge status="..." />`，不要在頁面手刻顏色
5. **需要新元件 → 先停下來問**，不要重複造輪子
6. **不要動範圍外的檔案**

### UI 作業流程（任何涉及畫面的任務）

```
□ 讀對應 mockup HTML（對照表見 docs/design/mockups/INDEX.md）
□ 對照 component-recipes.html 確認元件用法
□ 確認 src/components/ui/ 已有可用元件
□ 列出將建立/修改的檔案清單 + 有疑慮的決策點
□ 停下來等使用者確認，再開工
□ 一次只動一個檔案，動完停下來等確認，再繼續
```

### 設計未覆蓋的場景

若 mockup / recipes 都沒覆蓋某 edge case：
1. 停下來
2. 描述場景並提出 2–3 個視覺方案
3. 等使用者決定後再實作，不要自己發明新元件或新樣式

---

## 3. 分支策略（GitHub Flow）

每個 feature 獨立從 main 開分支，完成後由 Cheryl merge 回 main。

### 分支命名

```
feature/sprint{n}-{kebab-case-description}
fix/sprint{n}-{kebab-case-description}
docs/sprint{n}-{kebab-case-description}
```

### 禁止事項（Claude Code 不得執行）

- ❌ 直接 push 到 `main`
- ❌ 直接 merge 任何分支進 `main`（只有 Cheryl 可以）
- ❌ feature 分支互相 merge
- ❌ 強制 push（`git push --force`）任何分支
- ❌ 未完成、測試未過的 feature merge 進 main
- ❌ 未經確認修改 `claude.md`

---

## 4. Commit 格式（Conventional Commits）

```
<type>(<scope>): <description>

type：feat / fix / test / docs / refactor / style / chore
scope：store / product / order / customer / shipping / auth / ui / db
```

---

## 5. Task 開始前檢查清單

```
□ 確認目前所在分支正確（git branch --show-current）
□ 確認 docs/dod/sprint{n}-dod.md 存在（不存在 → 停止回報 Cheryl）
□ 測試檔案先於實作檔案建立（TDD：先 Red → 再 Green）
□ 實作完成後全部測試通過才能 commit feat
```

---

## 6. 開發流程

```
DoR → SDD(delta) → DoD → TDD → Code → Verify → Done → KM
```

| 步驟 | 說明 | 產出位置 |
|------|------|----------|
| DoR | 需求定義，**未完成不得開發** | docs/dor/sprint{n}-dor.md |
| SDD delta | 本 Sprint 新增的資料模型、API、元件 | docs/sdd/sprint{n}-delta.md |
| DoD | 每個 User Story 完成標準 | docs/dod/sprint{n}-dod.md |
| TDD | 先寫測試（Red→Green→Refactor），需問 Cheryl 確認 UI 行為 | *.test.ts |
| Code | feature 分支開發，遵守 Conventional Commits | — |
| Verify | 見下方清單 | — |
| Done | 通知 Cheryl review + 提供截圖 + 等待 merge | — |
| KM | 將踩坑、架構決策、可複用知識寫入 km/ | km/bugs/ · km/decisions/ · km/learnings/ |

### Verify 清單

```
□ npm run test          vitest 全部通過
□ npm run test:e2e      playwright 全部通過
□ npm run type-check    TypeScript 無 error
□ npm run lint          ESLint 無 error
□ UI 截圖等待 Cheryl 視覺驗收
```

---

## 7. 本地開發環境 SOP

### 環境差異對照

| 項目 | 本地開發 | Production |
|------|---------|-----------|
| 資料庫 | Docker `127.0.0.1:54321` | Supabase Cloud |
| 環境變數 | `.env.development.local`（覆蓋 `.env.local`） | Vercel 環境變數 |
| 前台登入 | `dev-mock-token` bypass → `U_dev_mock` 用戶 | LIFF SDK 真實 token |
| 後台登入 | Supabase Auth（Email/Password） | 同左 |
| 測試資料 | `supabase/seed.sql`（`db:reset` 時注入） | 真實資料 |

### 啟動順序（每次開發）

```
1. 開 Docker Desktop（系統托盤綠燈）
2. npx supabase start        ← 啟動 Postgres 容器
3. npm run dev:clean         ← 清舊進程+快取後啟動 dev server
4. 開 localhost:3000/store/ruiruidaigou-5e8w 開始測試（前台）
```

### npm scripts 速查

| 指令 | 用途 |
|------|------|
| `npm run dev:clean` | 清掉殘留 node 進程 + `.next` 後啟動 dev server（**推薦平常用這個**） |
| `npm run dev:check` | 檢查 Supabase 狀態 + 顯示目前 node 進程數 |
| `npm run dev` | 純啟動 dev server（不清快取，環境穩定時可用） |
| `npm run db:reset` | 重置本地 DB + 重新跑 seed.sql |

### 卡住時的恢復步驟

若遇到 `ERR_EMPTY_RESPONSE` / webpack-hmr 連線失敗 / 莫名 404，依序：
1. `npm run dev:check` 確認 Supabase 在跑、node 進程數合理（< 10）
2. `npm run dev:clean` 重啟
3. 若仍異常，看 [km/learnings/local-dev-debugging.md](km/learnings/local-dev-debugging.md) 對照踩坑紀錄

### dev bypass 鏈條完整性

修改 LIFF 認證相關程式碼時，**必須整條鏈**都通：
1. `verifyLiffToken('dev-mock-token')` → 回傳 `{ lineId: 'U_dev_mock' }`
2. `users` 表必須有 `line_id = 'U_dev_mock'` 的 row（在 seed.sql）
3. `store_members` 表必須有對應 `user_id` + 目標 `store_id` + `status = 'approved'`

任一環斷掉會回傳 `status: 'none'`（顯示「您尚未加入此賣場」）。

---

## 8. 目前狀態

> 每個 feature 開始和完成時更新此區塊。
> 完整 sprint 進度索引見 [SPRINT_PLAN.md](SPRINT_PLAN.md)。

```
目前 Sprint：   Sprint 3（收尾）
目前分支：      feature/sprint3-my-orders

Sprint 1 ✅ 完成（已 merge to main）
Sprint 2 ✅ 完成（已 merge to main）

Sprint 3 進度：
- [x] feature/sprint3-store-auth       顧客前台 auth guard（LIFF 登入）
- [x] feature/sprint3-products         顧客前台商品列表 + 詳細頁
- [x] feature/sprint3-order            顧客下單流程
- [ ] feature/sprint3-my-orders        顧客訂單查詢（US-16 測試型別問題處理中）
- [ ] feature/sprint3-account          顧客帳戶頁（US-17）

Sprint 4 待開始（DoR 已備妥，等 Sprint 3 merge）：
→ 詳見 docs/dor/sprint4-dor.md
```

---

## 9. 專案文件結構

```
ruei-select/
├── CLAUDE.md                 ← 本文件（開發工作合約）
├── SPRINT_PLAN.md            ← Sprint 狀態索引（輕量，每次 session 先讀）
├── tailwind.config.ts        ← Tailwind 全專案設定
├── src/
│   ├── styles/
│   │   └── design-tokens.css ← Token 真相來源（唯一一份）
│   ├── components/
│   │   └── ui/               ← 共用元件（Button / Input / Card / StatusBadge…）
│   └── app/
│       ├── admin/
│       │   ├── ui-demo/      ← live style guide（forest variant）
│       │   └── ...           ← forest variant 頁面
│       └── store/[slug]/     ← candy variant 頁面
├── docs/
│   ├── PRD.md                ← 完整產品需求（細節查閱用）
│   ├── SYSTEM_CONSTRAINTS.md ← 架構約束與禁止事項（必讀）
│   ├── USER_JOURNEYS.md      ← 使用者旅程（建種子資料前必讀）
│   ├── sdd/                  ← 系統架構（system-sdd.md + sprint delta）
│   ├── dor/                  ← Sprint 需求定義（sprint{n}-dor.md）
│   ├── dod/                  ← Sprint 完成標準（sprint{n}-dod.md）
│   └── design/
│       ├── mockups/          ← 高擬真頁面 spec（INDEX.md 有路由對照表）
│       └── handoff/          ← component-recipes.html + sprint 任務包
└── km/
    ├── bugs/                 ← 重要 bug 根因分析
    ├── decisions/            ← 架構決策紀錄（ADR）
    └── learnings/            ← 技術筆記、踩坑總結
```

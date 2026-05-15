# claude.md — 芮選系統開發工作合約

> 每次開啟 session 必須先讀完這份文件，再開始任何工作。
> 如需修改本文件，必須提出變更內容請 Cheryl 確認後才能執行。

> **語言規則（強制）：所有回覆、說明、程式碼註解一律使用繁體中文。禁止使用韓文、日文或其他語言。**

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

## 2. 分支策略

**採用 GitHub Flow（簡化版）**
一人開發 + Claude Code 線性推進，不需要 develop 整合分支。
每個 feature 獨立完成、獨立驗收、獨立 merge，互不干擾。

```
main
├── feature/sprint1-init-setup      ← 從 main 開，完成後 merge 回 main
├── feature/sprint1-line-auth       ← 從最新 main 開，完成後 merge 回 main
├── feature/sprint1-admin-layout    ← 從最新 main 開，完成後 merge 回 main
└── ...（後續 feature 同理）
```

### 每個 feature 的完整生命週期

```
1. 從最新 main 開分支
   git checkout main && git pull origin main
   git checkout -b feature/sprint{n}-{description}

2. Claude Code 在此分支開發（TDD → Code → Verify）

3. 所有測試通過 + Cheryl 視覺驗收

4. Merge 進 main（由 Cheryl 執行）
   git checkout main
   git merge feature/sprint{n}-{description}
   git push origin main

5. 刪除已完成的 feature 分支
   git branch -d feature/sprint{n}-{description}
   git push origin --delete feature/sprint{n}-{description}

6. 下一個 feature 從步驟 1 重新開始
```

### 分支命名規則

```
feature/sprint{n}-{kebab-case-description}
fix/sprint{n}-{kebab-case-description}
docs/sprint{n}-{kebab-case-description}

範例：
feature/sprint1-init-setup       ← DB migration + Supabase client + types + middleware
feature/sprint1-line-auth        ← LINE 登入流程
feature/sprint1-admin-layout     ← 後台 Sidebar 框架
feature/sprint1-store-settings   ← 賣場設定頁
feature/sprint1-suppliers        ← 供應商管理
feature/sprint1-invite-link      ← 邀請連結
feature/sprint1-customers-frame  ← 顧客審核框架
fix/sprint2-duplicate-order
docs/sprint1-update-dor
```

### 禁止事項（Claude Code 不得執行）

- ❌ 直接 push 到 `main`
- ❌ 直接 merge 任何分支進 `main`（只有 Cheryl 可以）
- ❌ feature 分支互相 merge
- ❌ 強制 push（`git push --force`）任何分支
- ❌ 未完成、測試未過的 feature merge 進 main
- ❌ 未經確認修改 `claude.md`

---

## 3. Commit 格式（Conventional Commits）

```
<type>(<scope>): <description>

type：
  feat      新功能
  fix       修復 bug
  test      新增或修改測試
  docs      文件更新
  refactor  重構（不影響功能）
  style     樣式調整（不影響邏輯）
  chore     工具、設定變更

scope：
  store / product / order / customer / shipping / auth / ui / db

範例：
  feat(product): add product card component
  fix(order): resolve duplicate order submission
  test(store): add unit tests for store setup flow
  docs(sprint1): update DoR acceptance criteria
```

---

## 4. 每個 Task 開始前的檢查清單

Claude Code 在開始任何開發任務前，必須依序執行以下確認：

```
□ 1. 確認目前所在分支正確（git branch --show-current）
      不正確 → 切換到正確分支或建立新 feature 分支後再開始

□ 2. 確認對應的 DoD 文件存在（docs/dod/sprint{n}-dod.md）
      不存在 → 停止，回報給 Cheryl

□ 3. 確認測試檔案先於實作檔案建立（TDD 原則）
      先寫 *.test.ts，讓測試失敗，再寫實作讓測試通過

□ 4. 實作完成後執行全部測試
      npm run test（vitest）
      npm run test:e2e（playwright）
      全部通過才能說「完成」，不通過不得 commit feat
```

---

## 5. 開發流程（每個 Sprint）

```
DoR → Explore① → SDD(delta) → DoD → TDD → Explore② → Code → Verify → Done → Retro
```

### DoR（Definition of Ready）

`docs/dor/sprint{n}-dor.md`

- 背景與問題定義
- 目標用戶與使用情境
- User Stories（格式：As a [role], I want [action], so that [value]）
- 驗收標準（Acceptance Criteria）
- 範圍邊界（In scope / Out of scope）
- 依賴項目與風險

**DoR 未完成 → 不得開始開發**

### Explore①

閱讀 DoR，列出技術疑問、設計疑問，回報給 Cheryl 確認。

### SDD delta

`docs/sdd/sprint{n}-delta.md`

- 本 Sprint 新增的資料模型（Supabase table schema）
- 新增的 API routes
- 新增的 component 結構
- 與既有系統的介面變更

### DoD（Definition of Done）

`docs/dod/sprint{n}-dod.md`
每個 User Story 的完成標準，格式見第 6 節。

### TDD

- 先建立測試檔案（vitest unit tests）
- 執行 → 確認失敗（Red）
- 寫實作 → 確認通過（Green）
- 重構（Refactor）

### Explore②

- 確認 UI 元件與 Design System（design-tokens.css）對齊
- 有疑問的 UI 行為先問 Cheryl

### Code

- 在正確的 feature 分支上開發
- 每個有意義的進度 commit 一次
- 遵守 Conventional Commits 格式

### Verify

```
□ vitest 全部通過（npm run test）
□ playwright E2E 全部通過（npm run test:e2e）
□ TypeScript 無 error（npm run type-check）
□ ESLint 無 error（npm run lint）
□ UI 視覺截圖產出，等待 Cheryl 確認
```

### Done

- 所有 Verify 項目通過
- 通知 Cheryl：「feature/sprint{n}-xxx 已完成，請 review 並 merge 進 main」
- 提供完成項目清單、截圖、測試結果摘要
- 等待 Cheryl review、視覺驗收、執行 merge

### Retro

自動產出 `docs/sprint-retro/sprint{n}-retro.md`，格式見第 7 節。

---

## 6. DoD 文件格式

`docs/dod/sprint{n}-dod.md`

```markdown
# Sprint {n} — Definition of Done

## User Story: {標題}

### 功能完成標準

- [ ] {具體可驗證的功能項目}

### 測試完成標準

- [ ] 單元測試覆蓋率 ≥ 80%
- [ ] E2E 測試涵蓋 happy path 和主要 error path
- [ ] 所有測試通過

### 技術完成標準

- [ ] TypeScript 無 error
- [ ] ESLint 無 error
- [ ] 無 console.log 殘留
- [ ] 環境變數未 hardcode

### UI 完成標準

- [ ] 與 design-tokens.css 對齊
- [ ] RWD：mobile 375px / desktop 1280px 正常顯示
- [ ] 載入狀態、錯誤狀態皆已處理
```

---

## 7. Retro 文件格式

`docs/sprint-retro/sprint{n}-retro.md`

```markdown
# Sprint {n} Retro

## 本 Sprint 完成項目

- {User Story 標題}：{完成狀態}

## 測試結果

- 單元測試：{通過數}/{總數}
- E2E 測試：{通過數}/{總數}

## 技術債

- {發現的問題，尚未修復}

## 踩坑記錄（草稿，待 Cheryl 補充）

| 問題       | 原因       | 解法       | 預防方式       |
| ---------- | ---------- | ---------- | -------------- |
| {問題描述} | {根本原因} | {如何解決} | {下次如何避免} |

## claude.md 建議修改

- {如有發現規則不清楚或需要補充的地方，列在這裡供 Cheryl 確認}

## 下個 Sprint 注意事項

- {帶進下個 Sprint 的觀察}
```

---

## 8. KM（知識庫）格式

`km/` 目錄下跨 Sprint 累積，不屬於單一 Sprint。

```
km/
├── bugs/           ← 重要 bug 的根因分析
├── decisions/      ← 架構決策紀錄（ADR）
└── learnings/      ← 技術筆記、踩坑總結
```

### ADR 格式（Architecture Decision Record）

`km/decisions/adr-{n}-{title}.md`

```markdown
# ADR-{n}: {決策標題}

**日期：** YYYY-MM-DD
**狀態：** 提議中 / 已採用 / 已廢棄

## 背景

{為什麼需要做這個決定}

## 決策

{決定做什麼}

## 理由

{為什麼這樣決定，考慮過哪些替代方案}

## 後果

{這個決定帶來什麼影響，包含優缺點}
```

---

## 9. 目前狀態

> 這個區塊在每個 feature 開始和完成時更新。

```
目前 Sprint：   Sprint 1
目前分支：      feature/sprint1-adjust-defaultpage
進行中 feature：sprint1-suppliers（待 Cheryl 視覺驗收後 merge）
上次 Retro：    尚未開始

Sprint 1 feature 進度：
- [x] feature/sprint1-init-setup       DB migration + Supabase client + types + middleware
- [x] feature/sprint1-line-auth        LINE 登入流程
- [x] feature/sprint1-admin-layout     後台 Sidebar 框架 + Dashboard
- [x] feature/sprint1-store-settings   賣場設定頁（含頭像上傳、邀請連結）
- [x] feature/sprint1-suppliers        供應商管理（待 Cheryl 視覺驗收 + merge）
- [ ] feature/sprint1-invite-link      邀請連結（已併入 store-settings）
- [ ] feature/sprint1-customers-frame  顧客審核框架

環境準備狀態：
- [x] LINE Login Channel 建立完成
- [x] LIFF App 建立完成
- [x] GitHub repo：ruei-select
- [x] Next.js 16 專案初始化
- [x] design-tokens.css 放入 src/app/
- [x] docs/ 和 km/ 資料夾結構建立
- [x] Supabase Project 建立 + .env.local 完成
- [x] Vercel 部署設定（env vars 需在 Vercel Dashboard 確認）

Sprint 2 feature 預計清單：
- [ ] feature/sprint2-landing-page     品牌首頁（根目錄 /）
- [ ] feature/sprint2-customers        顧客審核完整功能
- [ ] feature/sprint2-products         商品管理
- [ ] feature/sprint2-orders           訂單管理
```

---

## 10. 專案文件結構

```
ruei-select/
├── claude.md                          ← 本文件（根目錄）
├── src/
│   └── app/
│       ├── design-tokens.css          ← Design System tokens
│       ├── globals.css
│       └── layout.tsx
├── docs/
│   ├── PRD.md
│   ├── sdd/
│   │   └── system-sdd.md              ← 系統整體架構
│   ├── dor/
│   │   └── sprint1-dor.md
│   ├── dod/
│   │   └── sprint1-dod.md
│   ├── design/
│   │   ├── admin-login-final.html     ← 登入頁設計稿（定稿）
│   │   ├── admin-pages-design.html   ← 後台各頁面設計稿
│   │   └── design-system-final.html  ← Design System 參考
│   └── sprint-retro/
└── km/
    ├── bugs/
    ├── decisions/
    └── learnings/
```

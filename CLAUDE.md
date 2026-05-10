# claude.md — 芮選系統開發工作合約

> 每次開啟 session 必須先讀完這份文件，再開始任何工作。
> 如需修改本文件，必須提出變更內容請 Cheryl 確認後才能執行。

---

## 1. 專案簡介

**專案名稱：** 芮選系統（ruei-select）
**產品定位：** 以 LINE 生態系為核心的代購賣場管理平台
**目標用戶：** 台灣代購賣家（商家）、買家（顧客）
**核心價值：** 讓代購賣家把時間花在選品和顧客關係上，而不是手動整理訂單和撰寫文案
**技術棧：** Next.js 16.2 (App Router · Turbopack) · React 19.2 · TypeScript · Supabase · Tailwind CSS · LINE LIFF
**部署：** Vercel
**PRD：** docs/PRD.md

---

## 2. 分支策略

```
main          ← 正式版本，Claude Code 禁止直接 push 或 merge
develop       ← 整合分支，feature 開發完成後 merge 至此
feature/*     ← 功能分支，命名規則見下方
fix/*         ← 修復分支
docs/*        ← 文件更新分支
```

### 分支命名規則

```
feature/sprint{n}-{kebab-case-description}
fix/sprint{n}-{kebab-case-description}
docs/sprint{n}-{kebab-case-description}

範例：
feature/sprint1-store-setup
feature/sprint1-product-create
fix/sprint2-duplicate-order
docs/sprint1-update-dor
```

### 禁止事項（Claude Code 不得執行）

- ❌ 直接 push 到 `main`
- ❌ 將 `develop` merge 進 `main`
- ❌ 強制 push（`git push --force`）任何分支
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
- PR 開至 `develop`，描述清楚變更內容
- 等待 Cheryl review 並 merge

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

> 這個區塊在每個 Sprint 開始時更新。

```
目前 Sprint：  Sprint 0（準備階段）
目前分支：     develop
進行中 feature：無
上次 Retro：   尚未開始

待確認事項：
- [ ] Next.js 專案初始化
- [ ] Supabase 專案建立
- [ ] Sprint 1 DoR 完成

```

桌機（≥ 768px）
Sidebar 展開 220px，可收合到 64px（只剩 icon）
Grid 維持多欄

手機（< 768px）
Sidebar 隱藏，頂部出現 Hamburger 按鈕
點擊後 Sidebar 從左側滑出覆蓋頁面
Grid 全部變單欄
Drawer 改為從底部滑出（Bottom Sheet）

---

## 10. 專案文件結構

```
ruei-select/
├── claude.md                          ← 本文件
├── src/
│   └── app/
│       ├── design-tokens.css
│       ├── globals.css
│       └── layout.tsx
├── docs/
│   ├── sdd/
│   │   ├── system-sdd.md              ← 系統整體架構（寫一次，持續更新）
│   │   └── sprint{n}-delta.md        ← 每個 Sprint 的設計變動
│   ├── dor/
│   │   └── sprint{n}-dor.md
│   ├── dod/
│   │   └── sprint{n}-dod.md
│   └── sprint-retro/
│       └── sprint{n}-retro.md
└── km/
    ├── bugs/
    ├── decisions/
    └── learnings/
```

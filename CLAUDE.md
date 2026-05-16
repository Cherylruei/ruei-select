# claude.md — 芮選系統開發工作合約

> 每次開啟 session 必須先讀完這份文件，再開始任何工作。
> 如需修改本文件，必須提出變更內容請 Cheryl 確認後才能執行。

---

## ⚠️ 語言規則（強制）

**所有回覆、說明、程式碼註解一律使用繁體中文。禁止使用韓文、日文或其他語言。**

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

## 2. 分支策略（GitHub Flow）

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

## 3. Commit 格式（Conventional Commits）

```
<type>(<scope>): <description>

type：feat / fix / test / docs / refactor / style / chore
scope：store / product / order / customer / shipping / auth / ui / db
```

---

## 4. Task 開始前檢查清單

```
□ 確認目前所在分支正確（git branch --show-current）
□ 確認 docs/dod/sprint{n}-dod.md 存在（不存在 → 停止回報 Cheryl）
□ 測試檔案先於實作檔案建立（TDD：先 Red → 再 Green）
□ 實作完成後全部測試通過才能 commit feat
```

---

## 5. 開發流程

```
DoR → SDD(delta) → DoD → TDD → Code → Verify → Done → Retro
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
| Retro | 回顧記錄 | docs/sprint-retro/sprint{n}-retro.md |

### Verify 清單

```
□ npm run test          vitest 全部通過
□ npm run test:e2e      playwright 全部通過
□ npm run type-check    TypeScript 無 error
□ npm run lint          ESLint 無 error
□ UI 截圖等待 Cheryl 視覺驗收
```

---

## 6. 目前狀態

> 每個 feature 開始和完成時更新此區塊。

```
目前 Sprint：   Sprint 1
目前分支：      feature/sprint1-customers-frame
上次 Retro：    尚未開始

Sprint 1 進度：
- [x] feature/sprint1-init-setup       DB migration + Supabase client + types + middleware
- [x] feature/sprint1-line-auth        LINE 登入流程
- [x] feature/sprint1-admin-layout     後台 Sidebar 框架 + Dashboard
- [x] feature/sprint1-store-settings   賣場設定（含頭像上傳、邀請連結）
- [x] feature/sprint1-suppliers        供應商管理
- [ ] feature/sprint1-customers-frame  顧客審核框架（進行中）

Sprint 2 預計：
- [ ] feature/sprint2-customers        顧客審核完整功能
- [ ] feature/sprint2-products         商品管理
- [ ] feature/sprint2-orders           訂單管理
```

---

## 7. 專案文件結構

```
ruei-select/
├── claude.md
├── src/app/
│   ├── design-tokens.css     ← Design System tokens
│   └── ...
├── docs/
│   ├── PRD.md
│   ├── sdd/                  ← 系統架構（system-sdd.md + sprint delta）
│   ├── dor/                  ← Sprint 需求定義
│   ├── dod/                  ← Sprint 完成標準
│   ├── design/               ← 設計稿（login / pages / design-system）
│   └── sprint-retro/
└── km/
    ├── bugs/                 ← 重要 bug 根因分析
    ├── decisions/            ← 架構決策紀錄（ADR）
    └── learnings/            ← 技術筆記、踩坑總結
```

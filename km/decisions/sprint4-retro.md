# Sprint 4 Retrospective

**日期：** 2026-06-02
**Sprint 目標：** 訂單閉環（下單 → 採買 → 到貨 → 結單 → 出貨）+ 許願池
**最終狀態：** 訂單閉環 ✅ 完成；許願池移至 Sprint 5

---

## 完成項目（vs 計畫）

| US | 計畫 | 實際 |
|----|------|------|
| US-18 商家訂單管理後台 + 代客建立訂單 | ✅ | ✅ |
| US-19 商家出貨管理 | ✅ | ✅ |
| US-20 顧客結單流程（4 種物流）| ✅ | ✅ |
| US-21 顧客取消訂單 | ❌ 已在 DoR v1.1 移出 | 未實作（保留 DB 欄位）|
| US-22/23 許願池 | 原計畫做 | **移至 Sprint 5**（2026-06-01 Cheryl 確認）|
| AC-18.12 顧客訂單展開 | 原計畫做 | **移至 Sprint 5**（2026-06-02 確認）|

## 追加交付（原 DoR 未列，Sprint 中新增）

這些是 Sprint 4 中途決定加入、未在原始 DoR 出現的工作，完成度高：

- **Design Token 架構重建**：`design-tokens.css` + Tailwind v4 `@theme` 映射，統一 candy（前台）和 forest（後台）token
- **共用 UI 元件庫**：10 個元件（Button、Input、Card、Badge、Modal、Toast、Table、StatCard、Choice、SearchSelect）+ `/admin/ui-demo` live guide
- **後台全頁面重設計**：Dashboard、訂單管理、商品管理、供應商管理，全部遷移至新設計系統
- **前台遷移**：商品列表頁、訂單列表頁遷移至 Candy Design System

---

## 範圍決策紀錄

### 為何許願池移至 Sprint 5
- Sprint 4 訂單閉環工作量比預期大（加上 Design System 重建）
- 優先確保訂單閉環品質：一個穩固的核心 > 兩個做一半的功能
- 許願池是獨立功能，移後不影響訂單流程

### 為何加入 Design System 重建
- Sprint 3 結束後發現前後台視覺一致性問題嚴重
- 後續每個 Sprint 都需要建 UI，沒有設計系統會持續累積技術債
- 在 Sprint 4 一次解決，Sprint 5 起可直接享用成果

### AC-18.12 顧客訂單展開移至 Sprint 5
- 原本計畫：後台點顧客姓名 → inline 展開訂單 → 多筆代客結單
- 本 Sprint 先實作單筆代客結單流程，多筆批次屬於 UX 升級範疇
- 歸類至 Sprint 5 的「訂單管理 UX 升級」一起處理更合適

---

## Sprint 5 帶入項目清單

| 項目 | 來源 | 說明 |
|------|------|------|
| US-22/23 許願池 | Sprint 4 移出 | 完整 AC 在 sprint4-dor.md，直接沿用 |
| AC-18.12a~d 顧客訂單展開 | Sprint 4 移出 | 已在 sprint5-dor.md 補完 AC |
| 前台商品詳細頁重建 | 新增（優先序 #2）| 按 store-product-detail.html mockup 重開發 |
| 顧客管理後台重設計 | Sprint 5 規劃 | 已有 US-NEW 草稿 |

---

## 技術觀察

- **Tailwind v4 `@theme` 語法**：本 Sprint 確認可完全取代舊式 `extend` 方式，token 與元件一對一對應
- **共用結單邏輯**：顧客自行結單與商家代客結單共用同一 `settlements` 表 + 同一 checkout 元件結構，沒有出現雙維護問題
- **seed.sql 完整旅程規則**：本 Sprint 落實「顧客 → 訂單 → 商家後台可見」的完整旅程資料，後續 Sprint 沿用此模式

---

## 下次 Sprint 開始前確認（Sprint 5 DoR 補完）

```
□ Sprint 5 DoR AC 全部補完（目前 v0.1 草稿，多數 AC 待確認）
□ 前台商品詳細頁重建的設計規格確認（store-product-detail.html）
□ 規格庫存管理（現貨/預購）下單原子操作方案確認（已初步定 Supabase RPC）
□ 許願池 AC-22/23 直接沿用 sprint4-dor.md，確認無需修改
□ Sprint 5 開始前確認功能優先序（避免再次超載）
```

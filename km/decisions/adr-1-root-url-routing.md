# ADR-1: 根目錄路由設計

**日期：** 2026-05-16
**狀態：** 已採用

## 背景

系統有兩種使用者：商家（merchant）與顧客（customer）。商家透過 `/admin` 進入後台，顧客透過商家分享的 `/store/[slug]` 進入各自的店舖前台。初始版本將根目錄 `/` 直接 redirect 到 `/admin`，但這在有品牌形象需求或對外推廣時不適合。

## 決策

根目錄 `/` 設計為**品牌首頁（landing page）**，獨立於商家後台與顧客前台之外。

```
/                → 芮選品牌首頁（公開靜態頁，有「進入後台」CTA）
/admin/*         → 商家後台（需要 LINE 登入，merchant role）
/store/[slug]/*  → 顧客前台（需要 LINE 登入，customer role）
```

## 理由

- **顧客不會訪問根目錄**：顧客的入口是商家分享的 `/store/[slug]` 連結，不會自行輸入根目錄。
- **根目錄 redirect 到 /admin 只是過渡方案**：開發期間方便，但長期不適合。
- **考慮過的替代方案**：
  - 根據 session role 動態 redirect（merchant → /admin，customer → 提示頁）：過於複雜，且顧客本就不會從根目錄進入。
  - 保持 redirect 到 /admin：簡單但無品牌形象，對外推廣時尷尬。

## 後果

- Sprint 2 需新增 `feature/sprint2-landing-page`，實作品牌首頁。
- 過渡期間（Sprint 2 完成前）根目錄仍 redirect 到 `/admin`。
- middleware 不需要特別處理根目錄，landing page 是公開靜態頁。

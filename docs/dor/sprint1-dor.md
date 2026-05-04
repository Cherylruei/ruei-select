# Sprint 1 — Definition of Ready (DoR)
**版本：** v1.0 定版
**定版日期：** 2026-05-04
**Sprint 目標：** 商家能夠建立賣場、設定基本資訊、管理供應商、生成顧客邀請連結，並能在後台看到待審核顧客名單框架

---

## 背景與問題定義

台灣代購賣家目前透過 LINE 群組貼文和私訊接單，手動整理訂單資訊、判斷配貨狀況、建立出貨單，全程依賴人工記憶與手動操作。

**主要痛點：**
- 容易漏單，無法系統化追蹤每筆訂單狀態
- 配貨判斷費時，需自行記憶哪個客人的哪件商品到貨
- 商品文案需手動從廠商群組複製再改寫
- 外幣商品（日幣 / 英鎊）需自行換算成本再定售價
- 出貨資訊分散在各個 LINE 私訊，難以統整

**競品參考：**
市面上已有樂樂等代購管理工具，但缺乏 AI 文案生成與匯率自動換算功能。本系統的差異化定位為：具備完整代購管理流程 + 內建 AI 文案優化 + 匯率換算 + LINE 生態系深度整合。

**系統規模（MVP 基準）：**
- 商家：1 人（可擴充多賣場）
- 固定顧客：約 20 人
- 月訂單量：約 50 筆

---

## 系統介面架構（三層）

```
/admin/*              商家後台   ← 商家登入，管理商品、訂單、顧客、配貨
/store/{slug}/*       顧客前台   ← 顧客登入，瀏覽商品（依類型分）、下單、查訂單
LINE 通知             Sprint 4   ← 商家一鍵發 LINE 通知給特定顧客（Messaging API）
```

**Sprint 1 範圍：商家後台 `/admin/*`**

---

## 目標用戶

### Persona A：台灣代購賣家（主要）
- 在台灣經營代購，商品來源為日本 / 英國 / 台灣大批發賣家
- 多數以台幣交易，偶爾需要外幣換算
- 沒有購買代購管理系統，全程手動操作
- 顧客固定約 20 人，月訂單 50 筆左右
- 希望降低手動作業量、減少漏單

### Persona B：海外代購賣家（次要）
- 旅居海外（如日本），代購當地商品
- 常態需要外幣換算（日幣 → 台幣）
- 曾使用樂樂等付費系統，但需要 AI 文案和匯率自動換算功能
- 痛點與 Persona A 相同，外幣需求更高頻

**共同結論：** 兩種賣家核心需求一致，匯率換算內嵌於商品上架流程（Sprint 2），不需要分開設計。

---

## User Stories

### US-1：商家以 LINE 登入後台

```
As a 商家,
I want to 使用 LINE 帳號快速登入商家後台,
So that 不需要額外記憶帳號密碼，一個 LINE 帳號管理所有賣場事務。
```

**Acceptance Criteria：**
- AC-1.1：後台首頁顯示「LINE 登入」按鈕，點擊後跳轉 LINE OAuth 授權
- AC-1.2：授權完成後自動取得 LINE displayName 和 profilePicture
- AC-1.3：首次登入自動建立商家帳號（users table，role = merchant）
- AC-1.4：已登入商家再次進入頁面，自動恢復登入狀態（token refresh）
- AC-1.5：登入失敗顯示錯誤提示，提供重試選項
- AC-1.6：非 LINE 環境開啟（一般瀏覽器）仍可正常登入（LINE Login redirect 方式）

---

### US-2：商家建立賣場基本資訊

```
As a 商家,
I want to 填寫賣場名稱、介紹文字、上傳賣場頭像,
So that 顧客進入賣場時能清楚識別這是誰的賣場。
```

**Acceptance Criteria：**
- AC-2.1：可輸入賣場名稱（必填，2–30 字）
- AC-2.2：可輸入賣場介紹（選填，上限 200 字，顯示字數計算）
- AC-2.3：可上傳賣場頭像（支援 jpg / png / webp，前端壓縮至 800px 以內，2MB 以下）
- AC-2.4：未上傳頭像時，顯示賣場名稱第一個字作為預設頭像（森林綠背景）
- AC-2.5：儲存成功顯示 Toast 提示「賣場資訊已更新」
- AC-2.6：儲存失敗顯示錯誤原因（網路錯誤 / 格式錯誤）
- AC-2.7：商家可隨時回來修改，重新儲存後即時更新

---

### US-3：商家建立供應商資訊

```
As a 商家,
I want to 新增、編輯、刪除供應商資料,
So that 商品上架時可以快速選擇對應廠商，並依廠商整理商品。
```

**Acceptance Criteria：**
- AC-3.1：可新增供應商（名稱必填 1–30 字；備註選填，上限 100 字）
- AC-3.2：可編輯已有供應商的名稱和備註
- AC-3.3：刪除供應商前顯示確認對話框
- AC-3.4：該供應商已有關聯商品時，阻止刪除並顯示「此廠商有 {n} 件商品，請先移除商品再刪除廠商」
- AC-3.5：供應商列表依建立時間倒序顯示（最新在上）
- AC-3.6：供應商列表為空時，顯示「尚未新增廠商」空狀態

---

### US-4：商家生成顧客邀請連結

```
As a 商家,
I want to 取得一個專屬邀請連結並複製分享,
So that 可以把連結貼在 LINE 群組，邀請顧客申請加入賣場。
```

**Acceptance Criteria：**
- AC-4.1：系統自動為賣場產生唯一邀請連結（`{domain}/store/{slug}`）
- AC-4.2：slug 由系統自動產生（賣場名稱拼音 + 4 碼隨機英數，如 `miko-shop-a3f2`）
- AC-4.3：商家可一鍵複製連結，複製後按鈕顯示「已複製 ✓」並在 2 秒後恢復
- AC-4.4：商家可重新產生新連結，操作前顯示警告「舊連結將失效，確定重新產生？」
- AC-4.5：顧客點擊連結進入的是顧客前台登入頁（`/store/{slug}/login`），該頁面 Sprint 3 實作，Sprint 1 先建立靜態佔位頁

---

### US-5：商家後台顧客審核名單框架

```
As a 商家,
I want to 在後台看到待審核與已審核的顧客名單頁面,
So that Sprint 3 顧客申請功能上線後，我可以直接在這裡審核。
```

**Acceptance Criteria：**
- AC-5.1：後台導覽列有「顧客管理」入口
- AC-5.2：進入後顯示兩個 Tab：「待審核」和「會員名單」
- AC-5.3：Sprint 1 兩個 Tab 皆顯示空狀態（「目前沒有待審核申請」/ 「尚未有會員」）
- AC-5.4：資料模型（store_members table）已建立完整，含 status 欄位，為 Sprint 3 做好準備

---

## 範圍邊界

### In Scope（Sprint 1 要做）
- 商家 LINE 登入（LIFF + LINE Login）
- 賣場基本資訊建立與編輯
- 供應商 CRUD
- 邀請連結生成、複製、重新產生
- 商家後台導覽框架（Sidebar）
- 顧客審核名單頁面框架（空狀態）
- 資料模型：users / stores / suppliers / store_members
- Supabase RLS 基本安全設定

### Out of Scope（Sprint 1 不做）
- 顧客端登入與申請流程（Sprint 3）
- 商家審核顧客的實際動作（Sprint 3）
- 商品上架（Sprint 2）
- 訂單管理（Sprint 3–4）
- 匯率換算（Sprint 2，內嵌於商品上架）
- LINE Messaging API 通知（Sprint 4）
- 數據分析 Dashboard（Sprint 5+）
- 賣貨便 / 超商 API 串接（維持手動填單）

---

## 技術依賴與環境準備（Sprint 0 清單）

| 項目 | 說明 | 負責 | 狀態 |
|------|------|------|------|
| LINE Login Channel | 在 LINE Developers Console 建立，取得 Channel ID / Secret | Cheryl | ⬜ 待完成 |
| LIFF App | 建立 LIFF App，取得 LIFF ID，設定 Endpoint URL | Cheryl | ⬜ 待完成 |
| Supabase Project | 建立 Project，取得 URL / anon key / service_role key | Cheryl | ⬜ 待完成 |
| Supabase Storage | 建立 bucket：`store-avatars`（public read） | Cheryl | ⬜ 待完成 |
| Vercel Project | 連結 GitHub repo，設定環境變數 | Cheryl | ⬜ 待完成 |
| Next.js 專案初始化 | `npx create-next-app@latest`，放入 design-tokens.css | Claude Code | ⬜ 待完成 |

---

## 資料模型（預覽）

```sql
-- 使用者（商家與顧客共用）
users
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  line_id       text UNIQUE NOT NULL
  display_name  text NOT NULL
  avatar_url    text
  role          text CHECK (role IN ('merchant', 'customer')) NOT NULL
  created_at    timestamptz DEFAULT now()

-- 賣場
stores
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  owner_id      uuid REFERENCES users(id) NOT NULL
  name          text NOT NULL
  description   text
  avatar_url    text
  slug          text UNIQUE NOT NULL
  invite_token  text UNIQUE NOT NULL DEFAULT gen_random_uuid()
  created_at    timestamptz DEFAULT now()
  updated_at    timestamptz DEFAULT now()

-- 供應商
suppliers
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  store_id      uuid REFERENCES stores(id) NOT NULL
  name          text NOT NULL
  note          text
  created_at    timestamptz DEFAULT now()

-- 賣場會員（顧客申請加入）
store_members
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
  store_id      uuid REFERENCES stores(id) NOT NULL
  user_id       uuid REFERENCES users(id) NOT NULL
  name          text NOT NULL
  phone         text NOT NULL
  line_id       text NOT NULL
  status        text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending'
  applied_at    timestamptz DEFAULT now()
  reviewed_at   timestamptz
  UNIQUE (store_id, user_id)
```

SDD 會補充完整的 RLS policy 和 index 設計。

---

## 風險與緩解方式

| 風險 | 影響 | 緩解方式 |
|------|------|----------|
| LINE LIFF 在一般瀏覽器行為不一致 | 商家後台登入異常 | 加入環境偵測，非 LINE 環境改用 LINE Login redirect 方式 |
| 圖片上傳失敗（格式 / 大小） | 頭像無法儲存 | 前端先做 client-side 壓縮（browser-image-compression 套件） |
| Supabase RLS 設定錯誤 | 跨賣場資料外洩 | 每個 table 的 RLS policy 在 SDD 明確定義，DoD 必須含 RLS 驗證測試 |
| slug 碰撞（極低機率） | 邀請連結重複 | DB UNIQUE constraint + 建立時碰撞重試機制 |

---

## Sprint 1 完成後的可驗收流程

商家可以完整走過以下流程，無需任何 workaround：

```
1. 打開後台網址
2. 點擊 LINE 登入 → 授權 → 進入後台
3. 填寫賣場名稱、介紹、上傳頭像 → 儲存
4. 新增 2–3 個供應商
5. 複製邀請連結
6. 進入「顧客管理」→ 看到空狀態頁面
7. 登出（或關閉視窗再開）→ 自動恢復登入狀態
```

---

## 待 Cheryl 於 Sprint 0 完成的環境準備

```
□ 在 LINE Developers Console 建立 Login Channel
□ 建立 LIFF App，記錄 LIFF ID
□ 建立 Supabase Project，記錄 URL / anon key / service_role key
□ 在 Supabase Storage 建立 store-avatars bucket
□ 在 GitHub 建立 repo（order-system）
□ 在 Vercel 連結 repo
□ 執行 npx create-next-app@latest，放入 design-tokens.css
□ 建立 .env.local，填入所有 key
□ 確認 npm run dev 可以正常跑起來
□ 把 claude.md 放入專案根目錄
```

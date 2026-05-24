# USER_JOURNEYS.md — 芮選系統使用者旅程

> **建立種子資料前必讀。** 每一筆 seed 資料都必須對應至少一條旅程。
> 旅程描述系統的真實流向，不是 mock 或 bypass 的流程。

---

## 角色定義

| 角色 | 登入方式 | 主要介面 |
|------|---------|---------|
| **商家（賣家）** | Supabase Auth（email/password） | `/admin/*` 後台 |
| **顧客（買家）** | LINE LIFF | `/store/{slug}/*` 前台 |

---

## 旅程 A：新顧客申請加入賣場

```
顧客在 LINE 收到商家分享的邀請連結
  → 點連結開啟 /store/{slug}/join（公開，不需登入）
  → 填寫申請表單（姓名、手機、LINE ID）
  → 送出 → store_members 建立（status = 'pending'）

商家後台：
  → /admin/customers → 看到新申請
  → 點「通過」→ store_members.status = 'approved'

顧客再次開啟 /store/{slug}：
  → LIFF 登入 → status = 'approved' → 進入商品列表
```

**seed.sql 必須包含：**
- 1 位 `status = 'approved'` 的顧客（完整旅程測試用）
- 1 位 `status = 'pending'` 的顧客（顯示「審核中」畫面測試用）

---

## 旅程 B：顧客瀏覽商品並自行下單

```
顧客以 LINE LIFF 開啟 /store/{slug}
  → LIFF SDK 取得 token → verifyLiffToken → 取得 lineId
  → 查 store_members（lineId + storeId + status = 'approved'）→ 通過
  → 顯示商品列表（status = 'active' 的商品）

顧客點擊商品：
  → /store/{slug}/products/{id}
  → 選規格（product_variants）→ 選數量
  → 點「立即下單」→ 確認彈窗
  → 確認 → POST /api/orders
    → orders 建立（status = 'pending_purchase'，created_by = 'customer'）
    → order_items 建立
  → Toast「下單成功！」→ 跳至 /store/{slug}/orders
```

**立即串聯（同一時刻）：**
```
商家後台 /admin/orders → 出現新訂單（status：待採買）✅
顧客前台 /store/{slug}/orders → 看到自己的訂單（狀態：已訂購）✅
```

---

## 旅程 C：商家代客建立訂單

```
顧客透過 LINE 私訊告知商家要購買某商品（未自行下單）

商家後台：
  → /admin/orders → 點「代客建立訂單」
  → /admin/orders/new
  → 選顧客（approved store_members 下拉）
  → 選商品 → 選規格 → 填數量
  → 送出 → orders 建立（status = 'pending_purchase'，created_by = 'merchant'）
  → Toast「訂單已建立」
```

**立即串聯：**
```
商家後台 /admin/orders → 出現新訂單 ✅
顧客前台 /store/{slug}/orders → 該顧客可看到此訂單 ✅（不標示商家建立）
```

---

## 旅程 D：商家更新訂單狀態 → 顧客結單 → 出貨

```
商家後台操作（Sprint 4）：
  1. /admin/orders 篩選「待採買」
     → 點「標記已訂購」→ status = 'ordered'（向廠商下單後）
  2. 篩選「已訂購」
     → 點「標記已到貨」→ status = 'allocated'（商品到手後）

顧客前台同步更新：
  → /store/{slug}/orders
  → 訂單卡顯示「已到貨」badge ✅
  → 出現「結單」按鈕

顧客結單：
  → 點「結單」→ /store/{slug}/checkout/{orderId}
  → 選物流（自取/超商/賣貨便/宅配）→ 填收件資訊
  → 選付款方式 → 確認結單
  → settlements 建立，orders.status = 'settled'

商家後台出貨：
  → 篩選「已結單」→ 展開查看收件資訊
  → 複製資訊至賣貨便建單
  → 填物流單號 → 確認出貨
  → orders.status = 'shipped'
  → orders.shipping_number 儲存
```

---

## 旅程 E：顧客取消訂單

```
顧客前台：
  → /store/{slug}/orders
  → 只有 status = 'pending_purchase' 的訂單顯示「取消訂單」按鈕
  → 點取消 → 確認 dialog → 確認
  → orders.status = 'cancelled'
  → orders.cancelled_at = now()
  → orders.cancelled_by = 'customer'
  → 訂單卡更新為「已取消」紅色 badge，無取消按鈕
```

**商家後台同步：**
```
/admin/orders → 該訂單狀態更新為「已取消」✅
```

---

## 旅程 F：顧客送出許願 → 商家回應（Sprint 4）

```
顧客前台：
  → /store/{slug}/wishlist → 點「＋ 許願」
  → 填商品名（必填）+ 上傳照片（必填）+ 商品連結（選填）+ 型號（選填）
  → 送出 → wishlists 建立（status = 'pending'）
  → Toast「許願已送出」

商家後台：
  → /admin/wishlists → 看到新許願
  → 狀態下拉改「已注意」或「已上架」→ 即時更新
  → 顧客前台許願狀態同步更新 ✅
```

---

## 旅程 G：現場快速上架（Sprint 5）

```
商家在現場（擺攤/直播）：
  → /admin/products/quick（手機瀏覽器）
  → 拍照 or 相簿選取 → 填商品名（必填）→ 填售價（必填）
  → 點「立即上架」→ 確認 → 商品建立（status = 'active'）

顧客前台立即可見：
  → /store/{slug}（商品列表）→ 新商品出現 ✅
  → 可立即點擊下單（旅程 B）
```

---

## 旅程間的串聯矩陣

| 顧客操作 | 商家後台立即看到 | 顧客前台立即看到 |
|---------|---------------|---------------|
| 下單（旅程 B） | /admin/orders 新訂單 ✅ | /store/.../orders 訂單 ✅ |
| 取消訂單（旅程 E） | /admin/orders 狀態更新 ✅ | badge 更新 ✅ |
| 送出許願（旅程 F） | /admin/wishlists 新許願 ✅ | /store/.../wishlist 狀態 ✅ |

| 商家操作 | 顧客前台立即看到 |
|---------|---------------|
| 代客建單（旅程 C） | /store/.../orders 訂單 ✅ |
| 標記已到貨（旅程 D） | 已到貨 badge + 結單按鈕 ✅ |
| 許願狀態更新（旅程 F） | 許願狀態 badge 更新 ✅ |
| 快速上架（旅程 G） | 商品列表立即出現 ✅ |

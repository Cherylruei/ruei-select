# 學習：dev bypass 不要另開分支，只能在「取得 token」處分岔

**記錄時間：** Sprint 5（2026-07-05）
**適用範圍：** 所有含 `dev-mock-token` bypass 的前台 client component（LIFF 認證流程）

---

## 問題背景（實際發生的 bug）

已是 approved 會員的顧客，從 `/store/[slug]/login` 用 LINE 登入後，仍被丟到 `/join` 申請表單，無法直接進賣場。

根因在 `src/app/store/[slug]/join/JoinClient.tsx` 的 `useEffect`：dev 與 prod 是**兩條各自獨立的分支**——

```ts
// ❌ 舊寫法：dev 分支直接短路，跳過所有商業邏輯
if (process.env.NODE_ENV === 'development') {
  setLiffToken('dev-mock-token')
  setPageState('form')   // 直接顯示表單，從沒查會員狀態
  return
}

async function initAndLogin() {
  // ...只有這裡（prod）才有「已 approved → 導回賣場」的檢查
}
```

「已 approved → `window.location.replace('/store/'+slug)`」只寫在 prod 分支裡，dev 分支被寫成「跳過一切、直接進表單」。所以本地開發不管你是不是會員，一律看到申請表單。

## 為什麼會「重複發生」

這是 CLAUDE.md 已點名的「dev bypass 鏈條完整性」的又一次翻版。只要 dev 路徑和 real 路徑是**兩條獨立分支**，每次有人往 prod 分支加新邏輯，dev 分支就默默失聯。同一類 bug 會一再冒出來。

## 解法：唯一分岔點只能是「怎麼拿 token」

把 dev/prod 合成同一條流程，環境差異只決定 token 來源，之後的商業邏輯（會員檢查、導向）只有一份：

```ts
async function initAndLogin() {
  // 唯一因環境而異的部分
  let token: string
  let profileName: string
  if (process.env.NODE_ENV === 'development') {
    token = 'dev-mock-token'
    profileName = '測試用戶'
  } else {
    const liff = await initLiff()
    if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return }
    token = liff.getAccessToken() ?? ''
    profileName = (await liff.getProfile()).displayName
  }

  // 以下不分環境，只有一份邏輯
  const authRes = await fetch(`/api/store-auth?slug=${slug}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (authRes.ok && (await authRes.json()).status === 'approved') {
    window.location.replace(`/store/${slug}`)
    return
  }
  setLiffToken(token); setDisplayName(profileName); setPageState('form')
}
```

## 檢查清單（改到 LIFF 認證流程時必看）

- [ ] `process.env.NODE_ENV === 'development'` 的分支，是否只用來決定 **token / 顯示名稱**？
- [ ] 會員狀態檢查、導向、錯誤處理，是否 dev 與 prod 共用同一段程式？
- [ ] 有沒有一支測試，用 `vi.stubEnv('NODE_ENV', 'development')` 明確驗證 dev 路徑？
      （vitest 預設 `NODE_ENV='test'`，不 stub 就永遠只測到 prod 分支，測不到 dev bug）

## 回歸測試

`src/app/store/[slug]/join/__tests__/JoinClient.test.tsx` — dev/prod × approved/none 四種組合，
鎖住「dev 與 prod 會員導向行為一致」。

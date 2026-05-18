# 學習：公開商品頁的 SEO / GEO 結構設計

**記錄時間：** Sprint 2 開始前（2026-05-18）
**適用範圍：** `/p/[slug]`（賣場公開列表頁）、`/p/[slug]/[id]`（商品詳細頁）
**相關 US：** US-9、US-10、US-11

---

## 背景

芮選的公開商品頁主要承擔兩個任務：

1. 讓 Google 等**傳統搜尋引擎**索引商品，帶來自然流量
2. 讓 **ChatGPT、Perplexity、Google AI Overview** 等生成式 AI 引擎能理解並引用商品資訊（GEO / AEO）

這兩件事的基礎工具有重疊，但細節不同。

---

## SEO vs GEO 的核心差異

| | SEO（傳統搜尋） | GEO / AEO（AI 生成式搜尋） |
|---|---|---|
| 爬取目標 | HTML 文字、meta tags、連結結構 | JSON-LD 結構化資料、清楚的散文 |
| 排名邏輯 | 關鍵字密度、反向連結、頁面速度 | 語意正確性、資訊完整性、可被引用性 |
| 最重要的單一技術 | `<title>` + `<meta description>` | JSON-LD schema.org 標記 |
| 當前重要性 | 已成熟，規則穩定 | 快速成長，早布局優勢明顯 |

---

## Sprint 2 DoR 已涵蓋的項目

| AC | 內容 | 覆蓋範圍 |
|---|---|---|
| AC-10.4 | SSG + ISR（可被爬蟲索引） | SEO + GEO 基礎 |
| AC-10.5 | `<meta name="robots" content="index, follow">` | SEO |
| AC-10.6 | Open Graph tags（og:title、og:description、og:image） | SEO / 社群分享 |
| AC-10.11 | JSON-LD Product schema（商品詳細頁） | **GEO 核心** |
| AC-10.12 | 下架商品 404 + noindex | SEO 保護 |

---

## DoR 未涵蓋、需補充的項目

### Sprint 2 一起做（上線就要有）

#### 1. `generateMetadata` 動態 meta（兩頁都要）

Next.js App Router 用 `generateMetadata` 產生每頁獨立的 `<title>` 與 `<meta description>`，這是 SEO 最基本的門票。

```ts
// /p/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const store = await getStore(params.slug)
  return {
    title: `${store.name} 代購商品 | 芮選`,
    description: `瀏覽 ${store.name} 的精選代購商品，申請加入即可下單`,
    alternates: { canonical: `https://ruei.app/p/${params.slug}` },
  }
}
```

```ts
// /p/[slug]/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id)
  return {
    title: `${product.name} | ${store.name} 代購`,
    description: product.description?.slice(0, 155),
    alternates: { canonical: `https://ruei.app/p/${params.slug}/${params.id}` },
  }
}
```

> **為何重要：** canonical URL 防止 ISR 重新生成時產生重複內容，被 Google 降權。

---

#### 2. 賣場列表頁的 Organization + ItemList schema

DoR 的 AC-10.11 只在商品詳細頁放了 Product schema。列表頁 `/p/[slug]` 完全沒有 JSON-LD，GEO 爬蟲無法理解「這個賣場是什麼」。

```ts
// /p/[slug]/page.tsx — JSON-LD
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: store.name,
      url: `https://ruei.app/p/${store.slug}`,
      logo: store.avatar_url,
      description: `${store.name} 是專注於代購的精品賣場`,
    },
    {
      '@type': 'ItemList',
      name: `${store.name} 公開商品`,
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://ruei.app/p/${store.slug}/${p.id}`,
        name: p.name,
      })),
    },
  ],
}
```

> **為何重要：** AI Overview 在回答「哪裡可以買到 XX」時，會優先引用有 ItemList + Organization 的頁面，因為它明確宣告了「這個實體是誰、賣什麼」。

---

#### 3. BreadcrumbList schema（商品詳細頁）

```ts
// /p/[slug]/[id]/page.tsx — 在原有 Product schema 的 @graph 裡加入
{
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://ruei.app' },
    { '@type': 'ListItem', position: 2, name: store.name, item: `https://ruei.app/p/${store.slug}` },
    { '@type': 'ListItem', position: 3, name: product.name },
  ],
}
```

> **為何重要：** BreadcrumbList 讓 Google 在搜尋結果顯示麵包屑路徑（提升點擊率），也讓 AI 引擎理解頁面的層級關係。

---

#### 4. Sitemap 自動生成

Next.js 15 App Router 支援 `src/app/sitemap.ts`，自動產生 `/sitemap.xml`。

```ts
// src/app/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicProducts = await getAllPublicProducts() // 只撈 is_public + active
  return [
    { url: 'https://ruei.app', lastModified: new Date() },
    ...publicProducts.map(p => ({
      url: `https://ruei.app/p/${p.store_slug}/${p.id}`,
      lastModified: p.updated_at,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
```

> **注意：** 已下架（`status = 'inactive'`）或 `is_public = false` 的商品**不得進入 sitemap**，否則爬蟲打到 404 會消耗 crawl budget。

---

### Sprint 3 補齊（有會員後更完整）

#### 5. 商品描述的結構化寫法（影響 GEO 引用率）

AI 文案優化的 Claude API prompt 目前只輸出 `{ name, description }`，但 GEO 更喜歡「能回答問題」的描述。

建議 AI prompt 額外要求輸出：

```
- 適合誰：（一句話，例：「適合喜歡日系風格的族群」）
- 解決什麼：（一句話，例：「省去自行前往日本購買的時間成本」）
```

這兩句話合入 `description` 欄位，能大幅提升 AI Overview 引用的機率。

---

#### 6. FAQ schema（賣場申請流程說明）

在賣場列表頁 `/p/[slug]` 底部加一個視覺上隱藏（或顯示）的 FAQ，並附 JSON-LD：

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "如何購買這些商品？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "點擊申請加入，通過商家審核後即可下單。"
      }
    },
    {
      "@type": "Question",
      "name": "這是什麼樣的賣場？",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "芮選是台灣代購賣場平台，{賣場名稱} 專注於提供精選代購商品。"
      }
    }
  ]
}
```

> **為何重要：** FAQ schema 是 Google AI Overview 最常直接引用的 schema 類型之一。

---

## 各階段補齊建議

```
Sprint 2（公開頁上線當下必備）：
  ✅ Product JSON-LD               已在 DoR AC-10.11
  □  generateMetadata（兩頁）      需補入實作
  □  Organization + ItemList      需補入實作
  □  BreadcrumbList               需補入實作
  □  Sitemap 自動生成              需補入實作
  □  canonical URL                需補入 generateMetadata

Sprint 3（顧客功能完整後補齊）：
  □  AI prompt 加結構化描述欄位    修改 AI 文案 prompt
  □  FAQ schema on /p/[slug]      視賣場是否有說明文字而定

Sprint 4+（規模夠大後評估）：
  □  AggregateRating schema        需有評價系統
  □  speakable schema              語音搜尋，台灣使用率低，低優先
```

---

## 實作注意事項

### ISR 與 JSON-LD 的一致性

ISR 每小時重新生成，JSON-LD 的 `offers.price` 若與頁面顯示的價格不一致（例如規格選項切換），Google 會標記「Rich Result 警告」。

解法：JSON-LD 的 price 使用**最低售價**，並加上 `priceSpecification` 說明有多個規格：

```json
"offers": {
  "@type": "AggregateOffer",
  "lowPrice": "...",
  "priceCurrency": "TWD",
  "offerCount": 3
}
```

### robots.txt

確認 `public/robots.txt` 允許 `/p/` 路徑被爬蟲存取，並指向 sitemap：

```
User-agent: *
Allow: /p/
Disallow: /admin/
Sitemap: https://ruei.app/sitemap.xml
```

---

## 參考資源

- [Google Search Central：Product schema](https://developers.google.com/search/docs/appearance/structured-data/product)
- [schema.org：Organization](https://schema.org/Organization)
- [Next.js 官方文件：generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js 官方文件：sitemap.ts](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- Sprint 2 DoR：[docs/dor/sprint2-dor.md](../../docs/dor/sprint2-dor.md)（AC-10.4 ~ AC-10.12）

'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { MemberOption } from '@/types'
import type { ProductWithVariants } from '@/app/api/admin/products/route'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { useToast, ToastContainer } from '@/components/ui/Toast'

// ── 工具 ───────────────────────────────────────────────────────────────────────

function specLabel(specs: Record<string, string>): string {
  return Object.entries(specs)
    .map(([k, v]) => `${k}：${v}`)
    .join('  /  ')
}

function getSpecDimensions(variants: { specs: Record<string, string> }[]): string[] {
  if (!variants.length) return []
  return Object.keys(variants[0].specs)
}

function getSpecValues(variants: { specs: Record<string, string> }[], dim: string): string[] {
  return [...new Set(variants.map((v) => v.specs[dim]).filter(Boolean))]
}

function findVariant<T extends { id: string; specs: Record<string, string> }>(
  variants: T[],
  selected: Record<string, string>
): T | null {
  return (
    variants.find((v) => Object.entries(selected).every(([dim, val]) => v.specs[dim] === val)) ??
    null
  )
}

const EARTH_SHADES = [
  'var(--earth-300)',
  'var(--earth-400)',
  'var(--earth-500)',
  'var(--earth-200)',
  'var(--forest-300)',
  'var(--forest-400)',
]
function supplierBg(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return EARTH_SHADES[h % EARTH_SHADES.length]
}

type InputMode = 'search' | 'browse' | 'link'

const FLD =
  'w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition placeholder:text-fg-subtle'

// ── 主元件 ─────────────────────────────────────────────────────────────────────

export default function NewOrderClient() {
  const router = useRouter()
  const { toasts, toast, dismiss } = useToast()

  // 選單資料
  const [members, setMembers] = useState<MemberOption[]>([])
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // 表單狀態
  const [memberId, setMemberId] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>({})
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 商品選擇 tab
  const [inputMode, setInputMode] = useState<InputMode>('search')
  const [browseSupId, setBrowseSupId] = useState<string | null>(null)

  // 載入選項資料
  useEffect(() => {
    const load = async () => {
      try {
        const [membersRes, productsRes] = await Promise.all([
          fetch('/api/admin/members'),
          fetch('/api/admin/products'),
        ])
        const membersJson = (await membersRes.json()) as { success: boolean; data: MemberOption[] }
        const productsJson = (await productsRes.json()) as {
          success: boolean
          data: ProductWithVariants[]
        }
        if (membersJson.success) setMembers(membersJson.data)
        if (productsJson.success) setProducts(productsJson.data)
      } catch {
        toast('載入資料失敗，請重新整理', 'error')
      } finally {
        setLoadingOptions(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 選定商品後重置規格
  const handleProductChange = (pid: string | null) => {
    setProductId(pid)
    setVariantId('')
    setSelectedSpecs({})
  }

  // SearchSelect 選項
  const customerOptions = useMemo(
    () =>
      members.map((m) => ({ value: m.id, label: m.name, sublabel: m.line_id, avatar: m.name[0] })),
    [members]
  )
  const productSearchOptions = useMemo(
    () =>
      products.map((p) => ({ value: p.id, label: p.name, sublabel: p.supplier_name ?? undefined })),
    [products]
  )

  // 選定商品 / variant
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  )
  const specDimensions = useMemo(
    () => (selectedProduct ? getSpecDimensions(selectedProduct.variants) : []),
    [selectedProduct]
  )
  const allSpecsSelected = useMemo(
    () => specDimensions.every((dim) => selectedSpecs[dim]),
    [specDimensions, selectedSpecs]
  )

  const matchedVariant = useMemo(() => {
    if (!allSpecsSelected || !selectedProduct) return null
    return findVariant(selectedProduct.variants, selectedSpecs)
  }, [allSpecsSelected, selectedProduct, selectedSpecs])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVariantId(matchedVariant?.id ?? '')
  }, [matchedVariant])

  // 依廠商分組（for browse tab）
  interface SupGroup {
    id: string
    name: string
    tag: string | null
    products: ProductWithVariants[]
  }
  const supplierGroups = useMemo<SupGroup[]>(() => {
    const map = new Map<string, SupGroup>()
    for (const p of products) {
      const key = p.supplier_id ?? 'none'
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: p.supplier_name ?? '未指定廠商',
          tag: p.supplier_tag,
          products: [],
        })
      }
      map.get(key)!.products.push(p)
    }
    return Array.from(map.values()).filter((g) => g.id !== 'none')
  }, [products])

  // 目前瀏覽的廠商商品
  const browseProducts = useMemo(
    () => (browseSupId ? (supplierGroups.find((g) => g.id === browseSupId)?.products ?? []) : []),
    [browseSupId, supplierGroups]
  )

  // 選定顧客
  const selectedMember = useMemo(
    () => members.find((m) => m.id === memberId) ?? null,
    [members, memberId]
  )

  // 小計
  const unitPrice = matchedVariant?.price ?? null
  const subtotal = unitPrice !== null ? unitPrice * quantity : null

  const isValid = memberId !== null && variantId !== '' && quantity >= 1

  // 送出
  const handleSubmit = async () => {
    if (!isValid) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, productId, variantId, quantity, note: note || undefined }),
      })
      const json = (await res.json()) as { success?: boolean; error?: string }
      if (json.success) {
        toast('訂單已建立', 'success')
        setTimeout(() => router.push('/admin/orders'), 1000)
      } else {
        toast(json.error ?? '建立失敗，請重試', 'error')
      }
    } catch {
      toast('建立失敗，請重試', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingOptions) return <FormSkeleton />

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className='p-8 grid grid-cols-3 gap-6 max-w-[1100px]'>
        {/* ── 左欄：表單 ───────────────────────────────────────────────── */}
        <div className='col-span-2 space-y-5'>
          {/* Step 1: 選顧客 */}
          <div className='bg-surface border border-line rounded-xl p-6'>
            <StepHeader step={1} label='選擇顧客' required note='只能選已通過審核的顧客' />
            <div className='ml-8 max-w-md'>
              <SearchSelect
                options={customerOptions}
                value={memberId}
                onChange={setMemberId}
                placeholder='搜尋顧客姓名 / LINE ID…'
                emptyMessage='找不到此顧客，請先審核加入申請'
              />
              {members.length === 0 && (
                <p className='text-xs text-fg-subtle mt-1'>目前沒有已審核的顧客</p>
              )}
            </div>
          </div>

          {/* Step 2: 選商品 */}
          <div className='bg-surface border border-line rounded-xl p-6'>
            <StepHeader step={2} label='選擇商品' required note='從商品庫中選擇，或依廠商瀏覽' />

            {/* Tab switcher */}
            <div className='ml-8 inline-flex p-1 rounded-pill bg-sunken mb-4'>
              {[
                { key: 'search' as InputMode, icon: <SearchIcon />, label: '搜尋商品' },
                { key: 'browse' as InputMode, icon: <BrowseIcon />, label: '依供應商瀏覽' },
                { key: 'link' as InputMode, icon: <LinkIcon />, label: '貼商品連結' },
              ].map(({ key, icon, label }) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => setInputMode(key)}
                  className={[
                    'inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill font-display font-semibold text-xs transition',
                    inputMode === key
                      ? 'bg-surface shadow-sm text-fg'
                      : 'text-fg-muted hover:text-fg',
                  ].join(' ')}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Tab: 搜尋 */}
            {inputMode === 'search' && (
              <div className='ml-8 max-w-md'>
                <SearchSelect
                  options={productSearchOptions}
                  value={productId}
                  onChange={handleProductChange}
                  placeholder='搜尋商品名稱、供應商…'
                  emptyMessage='找不到此商品'
                />
              </div>
            )}

            {/* Tab: 依供應商瀏覽 */}
            {inputMode === 'browse' && (
              <div className='ml-8 rounded-md border border-line bg-surface overflow-hidden grid grid-cols-12 max-w-2xl'>
                {/* 廠商列表 */}
                <div className='col-span-4 bg-ink-50 border-r border-line py-1.5 max-h-72 overflow-auto'>
                  {supplierGroups.length === 0 && (
                    <p className='px-3 py-2 text-xs text-fg-subtle'>尚無廠商</p>
                  )}
                  {supplierGroups.map((g) => (
                    <button
                      key={g.id}
                      type='button'
                      onClick={() => setBrowseSupId(g.id)}
                      className={[
                        'w-full px-3 py-2 flex items-center gap-2 cursor-pointer text-left transition',
                        browseSupId === g.id
                          ? 'bg-surface border-l-2 border-primary'
                          : 'hover:bg-sunken border-l-2 border-transparent',
                      ].join(' ')}
                    >
                      <div
                        className='w-6 h-6 rounded-md flex items-center justify-center text-white font-display font-bold text-[10px] shrink-0'
                        style={{ background: supplierBg(g.name) }}
                      >
                        {g.name.charAt(0)}
                      </div>
                      <div className='flex-1 leading-tight min-w-0'>
                        <div className='font-display font-semibold text-xs truncate'>{g.name}</div>
                        <div className='font-mono text-[9px] text-fg-subtle'>
                          {g.products.length} 商品
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {/* 該廠商商品 */}
                <div className='col-span-8 py-1.5 max-h-72 overflow-auto'>
                  {!browseSupId && (
                    <div className='px-3 py-4 text-center text-xs text-fg-subtle'>
                      ← 請先選擇供應商
                    </div>
                  )}
                  {browseSupId && browseProducts.length === 0 && (
                    <div className='px-3 py-4 text-center text-xs text-fg-subtle'>
                      此廠商尚無商品
                    </div>
                  )}
                  {browseSupId && browseProducts.length > 0 && (
                    <>
                      <div className='px-3 py-2 font-mono text-[10px] text-fg-subtle border-b border-line'>
                        {supplierGroups.find((g) => g.id === browseSupId)?.name} ·{' '}
                        {browseProducts.length} 件商品
                      </div>
                      {browseProducts.map((p) => (
                        <button
                          key={p.id}
                          type='button'
                          onClick={() => handleProductChange(p.id)}
                          className={[
                            'w-full flex items-center gap-3 px-3 py-2 cursor-pointer text-left transition',
                            productId === p.id ? 'bg-primary-bg' : 'hover:bg-sunken',
                          ].join(' ')}
                        >
                          <div className='w-9 h-9 rounded-md shrink-0 flex items-center justify-center bg-ink-50 border border-line overflow-hidden'>
                            <div
                              className='w-full h-full'
                              style={{
                                background:
                                  'repeating-linear-gradient(135deg,var(--ink-100),var(--ink-100) 5px,var(--ink-50) 5px,var(--ink-50) 10px)',
                              }}
                            />
                          </div>
                          <div className='flex-1 leading-tight min-w-0'>
                            <div className='font-display font-semibold text-xs truncate'>
                              {p.name}
                            </div>
                            <div className='flex items-center gap-1.5 mt-0.5'>
                              {p.variants[0] && (
                                <span className='font-mono text-[9px] text-fg-subtle'>
                                  NT$ {p.variants[0].price.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {productId === p.id && (
                            <svg
                              width='13'
                              height='13'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2.5'
                              strokeLinecap='round'
                              className='text-primary-hv shrink-0'
                            >
                              <path d='M5 12l4 4 10-10' />
                            </svg>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab: 貼商品連結 */}
            {inputMode === 'link' && (
              <div className='ml-8 max-w-md'>
                <div className='flex items-center gap-2.5 px-4 py-3 rounded-lg bg-sunken border border-line text-sm text-fg-muted'>
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    className='shrink-0 text-fg-subtle'
                  >
                    <circle cx='12' cy='12' r='10' />
                    <path d='M12 8v4M12 16h.01' />
                  </svg>
                  貼上連結功能即將推出，請改用搜尋商品。
                </div>
              </div>
            )}

            {/* 已選定商品預覽 */}
            {selectedProduct && (
              <div className='ml-8 mt-4 max-w-md'>
                <div className='flex items-center gap-3 px-3 py-2 rounded-md border-[1.5px] border-primary bg-surface shadow-[0_0_0_4px_var(--c-primary-bg)]'>
                  <div className='w-10 h-10 rounded-md shrink-0 overflow-hidden border border-line bg-ink-50'>
                    <div
                      className='w-full h-full'
                      style={{
                        background:
                          'repeating-linear-gradient(135deg,var(--ink-100),var(--ink-100) 5px,var(--ink-50) 5px,var(--ink-50) 10px)',
                      }}
                    />
                  </div>
                  <div className='flex-1 leading-tight min-w-0'>
                    <div className='font-display font-semibold text-sm truncate'>
                      {selectedProduct.name}
                    </div>
                    <div className='flex items-center gap-1.5 mt-0.5'>
                      {selectedProduct.supplier_tag && (
                        <span className='inline-flex items-center h-4 px-1.5 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[9px]'>
                          {selectedProduct.supplier_tag}
                        </span>
                      )}
                      {selectedProduct.variants[0] && (
                        <span className='font-mono text-[10px] text-fg-subtle'>
                          NT$ {selectedProduct.variants[0].price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => handleProductChange(null)}
                    className='w-6 h-6 rounded-pill hover:bg-sunken flex items-center justify-center text-fg-muted shrink-0'
                    aria-label='清除選擇'
                  >
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      strokeLinecap='round'
                    >
                      <path d='M6 6l12 12M6 18L18 6' />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: 規格 */}
          {selectedProduct && specDimensions.length > 0 && (
            <div className='bg-surface border border-line rounded-xl p-6'>
              <StepHeader
                step={3}
                label='規格'
                note={`此商品設定了 ${specDimensions.length} 種規格維度`}
              />
              <div className='ml-8 space-y-4'>
                {specDimensions.map((dim) => (
                  <div key={dim}>
                    <label className='block text-sm font-semibold mb-2'>{dim}</label>
                    <div className='flex flex-wrap gap-2'>
                      {getSpecValues(selectedProduct.variants, dim).map((val) => {
                        const isSelected = selectedSpecs[dim] === val
                        return (
                          <button
                            key={val}
                            type='button'
                            onClick={() => setSelectedSpecs((prev) => ({ ...prev, [dim]: val }))}
                            className={[
                              'h-9 px-4 rounded-pill font-display font-semibold text-sm border-[1.5px] transition',
                              isSelected
                                ? 'bg-primary-bg text-primary-hv border-primary'
                                : 'bg-surface text-fg border-line hover:border-fg-muted',
                            ].join(' ')}
                          >
                            {val}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {allSpecsSelected && !matchedVariant && (
                  <p className='text-xs text-danger font-mono'>此規格組合不存在，請選擇其他組合</p>
                )}
                {matchedVariant && (
                  <div className='flex items-center gap-2 text-xs text-fg-muted font-mono'>
                    <svg
                      width='13'
                      height='13'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2.2'
                      strokeLinecap='round'
                      className='text-success'
                    >
                      <path d='M5 12l4 4 10-10' />
                    </svg>
                    規格已選定：{specLabel(matchedVariant.specs)} · NT${' '}
                    {matchedVariant.price.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 (無規格) / Step 4: 數量 + 備註 */}
          <div className='bg-surface border border-line rounded-xl p-6'>
            <StepHeader
              step={selectedProduct && specDimensions.length > 0 ? 4 : 3}
              label='數量與備註'
            />
            <div className='ml-8 space-y-5 max-w-md'>
              {/* 數量 */}
              <div>
                <label className='block text-sm font-semibold mb-2'>
                  數量 <span className='text-danger'>*</span>
                </label>
                <div className='flex items-center gap-3'>
                  <button
                    type='button'
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className='w-9 h-9 rounded-md border border-line text-fg-muted flex items-center justify-center hover:bg-sunken transition'
                    aria-label='減少數量'
                  >
                    <svg
                      viewBox='0 0 24 24'
                      width='16'
                      height='16'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      aria-hidden='true'
                    >
                      <path d='M5 12h14' />
                    </svg>
                  </button>
                  <input
                    type='number'
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className='w-20 text-center font-mono px-3 py-2 rounded-md border-[1.5px] border-line bg-surface text-fg text-sm outline-none focus:border-primary focus:shadow-[0_0_0_4px_var(--c-primary-bg)] transition [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                  />
                  <button
                    type='button'
                    onClick={() => setQuantity((q) => q + 1)}
                    className='w-9 h-9 rounded-md border border-line text-fg-muted flex items-center justify-center hover:bg-sunken transition'
                    aria-label='增加數量'
                  >
                    <svg
                      viewBox='0 0 24 24'
                      width='16'
                      height='16'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                      aria-hidden='true'
                    >
                      <path d='M12 5v14M5 12h14' />
                    </svg>
                  </button>
                </div>
              </div>
              {/* 備註 */}
              <div>
                <label className='block text-sm font-semibold mb-2'>備註（選填）</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder='商家內部備註，顧客不可見'
                  className={`${FLD} resize-y`}
                />
              </div>
              {/* 送出按鈕 */}
              <button
                type='button'
                disabled={!isValid || submitting}
                onClick={handleSubmit}
                className='w-full h-11 rounded-pill bg-secondary text-white font-display font-semibold text-sm shadow-green hover:bg-secondary-hv active:scale-[.97] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {submitting ? (
                  <>
                    <Spinner />
                    建立中…
                  </>
                ) : (
                  '建立訂單'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── 右欄：訂單摘要 ────────────────────────────────────────── */}
        <div className='col-span-1'>
          <div className='bg-surface border border-line rounded-xl p-5 sticky top-24 space-y-4'>
            <h3 className='font-display font-bold text-base'>訂單摘要</h3>

            {/* 顧客 */}
            <div>
              <div className='font-mono text-[10px] text-fg-subtle uppercase tracking-wider mb-2'>
                顧客
              </div>
              {selectedMember ? (
                <div className='flex items-center gap-2.5'>
                  <div className='w-8 h-8 rounded-pill bg-secondary text-white font-display font-bold text-xs flex items-center justify-center shrink-0'>
                    {selectedMember.name.charAt(0)}
                  </div>
                  <div className='leading-tight min-w-0'>
                    <div className='font-semibold text-sm'>{selectedMember.name}</div>
                    <div className='font-mono text-[10px] text-fg-subtle truncate'>
                      {selectedMember.line_id}
                    </div>
                  </div>
                </div>
              ) : (
                <p className='text-sm text-fg-subtle'>尚未選擇</p>
              )}
            </div>
            <hr className='border-line' />

            {/* 商品 */}
            <div>
              <div className='font-mono text-[10px] text-fg-subtle uppercase tracking-wider mb-2'>
                商品
              </div>
              {selectedProduct ? (
                <div>
                  <div className='font-display font-semibold text-sm'>{selectedProduct.name}</div>
                  {selectedProduct.supplier_tag && (
                    <span className='inline-flex items-center h-4 px-1.5 rounded-pill bg-earth-100 text-earth-700 font-display font-semibold text-[9px] mt-1'>
                      {selectedProduct.supplier_tag}
                    </span>
                  )}
                </div>
              ) : (
                <p className='text-sm text-fg-subtle'>尚未選擇</p>
              )}
            </div>

            {/* 規格 */}
            {matchedVariant && (
              <>
                <hr className='border-line' />
                <div>
                  <div className='font-mono text-[10px] text-fg-subtle uppercase tracking-wider mb-2'>
                    規格
                  </div>
                  <div className='text-sm'>{specLabel(matchedVariant.specs)}</div>
                  <div className='font-mono text-xs text-fg-muted mt-0.5'>
                    NT$ {matchedVariant.price.toLocaleString()}
                  </div>
                </div>
              </>
            )}
            <hr className='border-line' />

            {/* 數量 */}
            <div className='flex items-center justify-between text-sm'>
              <span className='text-fg-muted'>數量</span>
              <span className='font-mono font-semibold'>{quantity}</span>
            </div>

            {/* 小計 */}
            <div className='bg-ink-50 rounded-lg px-4 py-3 flex items-center justify-between'>
              <span className='text-sm text-fg-muted'>小計</span>
              {subtotal !== null ? (
                <span className='font-display font-bold text-base text-fg'>
                  NT$ <span className='font-mono'>{subtotal.toLocaleString()}</span>
                </span>
              ) : (
                <span className='font-display font-bold text-base text-fg-subtle'>—</span>
              )}
            </div>

            {/* 狀態提示 */}
            <p className='text-xs text-fg-subtle leading-relaxed'>
              訂單建立後狀態為「待採買」，商家可至訂單管理更新後續狀態。
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── 小元件 ────────────────────────────────────────────────────────────────────

function StepHeader({
  step,
  label,
  required,
  note,
}: {
  step: number
  label: string
  required?: boolean
  note?: string
}) {
  return (
    <div className='flex items-start gap-2 mb-3'>
      <div className='w-6 h-6 rounded-pill bg-primary text-white font-display font-bold text-xs flex items-center justify-center shrink-0 mt-0.5'>
        {step}
      </div>
      <div>
        <h3 className='font-display font-bold text-base'>
          {label} {required && <span className='text-danger'>*</span>}
        </h3>
        {note && <p className='text-xs text-fg-subtle mt-0.5'>{note}</p>}
      </div>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className='p-8 max-w-2xl'>
      <div className='bg-surface rounded-xl border border-line p-6 animate-pulse space-y-5'>
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className='h-4 w-16 bg-ink-100 rounded mb-2' />
            <div className='h-10 bg-ink-50 rounded-md' />
          </div>
        ))}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className='animate-spin'
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      aria-hidden='true'
    >
      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
    >
      <circle cx='11' cy='11' r='6' />
      <path d='M20 20l-4-4' strokeLinecap='round' />
    </svg>
  )
}
function BrowseIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
    >
      <path d='M4 9c0-3 3-5 8-5s8 2 8 5-3 5-8 5l-3 3v-3c-3-1-5-3-5-5z' />
    </svg>
  )
}
function LinkIcon() {
  return (
    <svg
      width='13'
      height='13'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
    >
      <path d='M10 14a4 4 0 005.66 0l3-3a4 4 0 10-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1' />
    </svg>
  )
}

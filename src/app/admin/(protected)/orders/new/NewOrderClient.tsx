'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { MemberOption } from '@/types'
import type { ProductWithVariants } from '@/app/api/admin/products/route'
import { SearchSelect } from '@/components/ui/SearchSelect'
import { Field, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast, ToastContainer } from '@/components/ui/Toast'

// ── 工具 ───────────────────────────────────────────────────────────────────────

function specLabel(specs: Record<string, string>): string {
  return Object.entries(specs)
    .map(([k, v]) => `${k}：${v}`)
    .join('  /  ')
}

// ── 主元件 ─────────────────────────────────────────────────────────────────────

export default function NewOrderClient() {
  const router = useRouter()
  const { toasts, toast, dismiss } = useToast()

  // ── 選單資料 ────────────────────────────────────────────────
  const [members, setMembers] = useState<MemberOption[]>([])
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // ── 表單狀態 ────────────────────────────────────────────────
  const [memberId, setMemberId] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── 載入選項資料 ─────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [membersRes, productsRes] = await Promise.all([
          fetch('/api/admin/members'),
          fetch('/api/admin/products'),
        ])
        const membersJson = (await membersRes.json()) as {
          success: boolean
          data: MemberOption[]
        }
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
  }, [toast])

  // ── SearchSelect 選項 ────────────────────────────────────────

  const customerOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.name,
        sublabel: m.line_id,
        avatar: m.name[0],
      })),
    [members]
  )

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.name,
      })),
    [products]
  )

  // ── 選定商品的 variants ──────────────────────────────────────

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId]
  )

  const selectedVariant = useMemo(
    () => selectedProduct?.variants.find((v) => v.id === variantId) ?? null,
    [selectedProduct, variantId]
  )

  // 切換商品時重置規格
  const handleProductChange = (pid: string | null) => {
    setProductId(pid)
    setVariantId('')
  }

  // ── 表單驗證 ─────────────────────────────────────────────────

  const isValid = memberId !== null && productId !== null && variantId !== '' && quantity >= 1
  const subtotal = selectedVariant ? selectedVariant.price * quantity : 0

  // ── 送出 ──────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!isValid) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          productId,
          variantId,
          quantity,
          note: note || undefined,
        }),
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

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className='max-w-lg mx-auto'>
        {/* 頁面 Header */}
        <div className='flex items-center gap-3 mb-8'>
          <Button
            type='button'
            variant='ghost'
            iconOnly
            onClick={() => router.back()}
            aria-label='返回'
            className='rounded-md'
          >
            <svg
              viewBox='0 0 24 24'
              width='18'
              height='18'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
            >
              <path d='M15 18l-6-6 6-6' />
            </svg>
          </Button>
          <div>
            <h1 className='text-xl font-display font-bold text-fg'>代客建立訂單</h1>
            <p className='text-xs text-fg-subtle mt-0.5'>為顧客代為登記購買意願</p>
          </div>
        </div>

        {loadingOptions ? (
          <FormSkeleton />
        ) : (
          <div className='bg-surface rounded-xl border border-line shadow-sm p-6 flex flex-col gap-5'>
            {/* 顧客選取 */}
            <Field label='顧客' required>
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
            </Field>

            {/* 商品選取 */}
            <Field label='商品' required>
              <SearchSelect
                options={productOptions}
                value={productId}
                onChange={handleProductChange}
                placeholder='搜尋商品名稱…'
                emptyMessage='找不到此商品'
              />
            </Field>

            {/* 規格選取（動態載入，選項少 → native select）*/}
            {selectedProduct && (
              <Field label='規格' required hint={!variantId ? '請選擇規格' : undefined}>
                <Select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                  <option value=''>請選擇規格</option>
                  {selectedProduct.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {specLabel(v.specs)}　NT${v.price.toLocaleString()}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {/* 數量 */}
            <Field label='數量' required>
              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className='w-9 h-9 rounded-md border border-line text-fg-muted flex items-center justify-center hover:bg-sunken transition-colors'
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
                  className='w-9 h-9 rounded-md border border-line text-fg-muted flex items-center justify-center hover:bg-sunken transition-colors'
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
            </Field>

            {/* 備註（選填） */}
            <Field label='備註（選填）'>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder='商家內部備注，顧客不可見'
              />
            </Field>

            {/* 小計預覽 */}
            {selectedVariant && (
              <div className='bg-ink-50 rounded-lg px-4 py-3 flex items-center justify-between'>
                <span className='text-sm text-fg-muted'>訂單小計</span>
                <span className='font-display font-bold text-base text-fg'>
                  NT$
                  <span className='font-mono ml-0.5'>{subtotal.toLocaleString()}</span>
                </span>
              </div>
            )}

            {/* 送出按鈕 */}
            <Button
              type='button'
              variant='secondary'
              size='lg'
              className='w-full'
              disabled={!isValid || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <Spinner />
                  建立中…
                </>
              ) : (
                '建立訂單'
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

// ── 小元件 ────────────────────────────────────────────────────────────────────

function FormSkeleton() {
  return (
    <div className='bg-surface rounded-xl border border-line shadow-sm p-6 animate-pulse space-y-5'>
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className='h-4 w-16 bg-ink-100 rounded mb-2' />
          <div className='h-10 bg-ink-50 rounded-md' />
        </div>
      ))}
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

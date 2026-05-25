'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { MemberOption } from '@/types'
import type { ProductWithVariants } from '@/app/api/admin/products/route'

// ── 工具 ───────────────────────────────────────────────────────────────────────

function specLabel(specs: Record<string, string>): string {
  return Object.entries(specs)
    .map(([k, v]) => `${k}：${v}`)
    .join('  /  ')
}

// ── 主元件 ─────────────────────────────────────────────────────────────────────

export default function NewOrderClient() {
  const router = useRouter()

  // ── 選單資料 ────────────────────────────────────────────────
  const [members, setMembers] = useState<MemberOption[]>([])
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)

  // ── 表單狀態 ────────────────────────────────────────────────
  const [memberId, setMemberId] = useState('')
  const [productId, setProductId] = useState('')
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

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
        setToast({ message: '載入資料失敗，請重新整理', type: 'error' })
      } finally {
        setLoadingOptions(false)
      }
    }
    load()
  }, [])

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
  const handleProductChange = (pid: string) => {
    setProductId(pid)
    setVariantId('')
  }

  // ── 表單驗證 ─────────────────────────────────────────────────
  const isValid = memberId && productId && variantId && quantity >= 1

  const subtotal = selectedVariant ? selectedVariant.price * quantity : 0

  // ── Toast 自動消失 ────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  // ── 送出 ──────────────────────────────────────────────────────
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
        setToast({ message: '訂單已建立', type: 'success' })
        setTimeout(() => router.push('/admin/orders'), 1000)
      } else {
        setToast({ message: json.error ?? '建立失敗，請重試', type: 'error' })
      }
    } catch {
      setToast({ message: '建立失敗，請重試', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='max-w-lg mx-auto'>
      {/* Toast */}
      {toast && (
        <div
          className={[
            'fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg',
            toast.type === 'success'
              ? 'bg-[var(--forest-base)] text-white'
              : 'bg-[var(--color-error)] text-white',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}

      {/* 頁面 Header */}
      <div className='flex items-center gap-3 mb-8'>
        <button
          onClick={() => router.back()}
          className='w-9 h-9 rounded-xl bg-[var(--neutral-100)] flex items-center justify-center text-[var(--neutral-500)] hover:bg-[var(--neutral-200)] transition-colors cursor-pointer border-0'
          aria-label='返回'
        >
          <svg
            viewBox='0 0 24 24'
            width='18'
            height='18'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <path d='M15 18l-6-6 6-6' />
          </svg>
        </button>
        <div>
          <h1 className='text-xl font-bold text-[var(--neutral-800)] [font-family:var(--font-zen-maru-gothic)]'>
            代客建立訂單
          </h1>
          <p className='text-xs text-[var(--neutral-400)] mt-0.5'>為顧客代為登記購買意願</p>
        </div>
      </div>

      {loadingOptions ? (
        <FormSkeleton />
      ) : (
        <div className='bg-white rounded-2xl border border-[var(--neutral-200)] shadow-sm p-6 flex flex-col gap-5'>
          {/* 顧客選取 */}
          <FormField label='顧客' required>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className='w-full px-3.5 py-2.5 rounded-xl border border-[var(--neutral-200)] text-sm text-[var(--neutral-800)] bg-white focus:outline-none focus:border-[var(--forest-base)] focus:ring-2 focus:ring-[var(--forest-base)]/20 transition-all cursor-pointer'
            >
              <option value=''>請選擇顧客</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}（LINE: {m.line_id}）
                </option>
              ))}
            </select>
            {members.length === 0 && (
              <p className='text-xs text-[var(--neutral-400)] mt-1'>目前沒有已審核的顧客</p>
            )}
          </FormField>

          {/* 商品選取 */}
          <FormField label='商品' required>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className='w-full px-3.5 py-2.5 rounded-xl border border-[var(--neutral-200)] text-sm text-[var(--neutral-800)] bg-white focus:outline-none focus:border-[var(--forest-base)] focus:ring-2 focus:ring-[var(--forest-base)]/20 transition-all cursor-pointer'
            >
              <option value=''>請選擇商品</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* 規格選取（動態載入） */}
          {selectedProduct && (
            <FormField label='規格' required>
              <select
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                className='w-full px-3.5 py-2.5 rounded-xl border border-[var(--neutral-200)] text-sm text-[var(--neutral-800)] bg-white focus:outline-none focus:border-[var(--forest-base)] focus:ring-2 focus:ring-[var(--forest-base)]/20 transition-all cursor-pointer'
              >
                <option value=''>請選擇規格</option>
                {selectedProduct.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {specLabel(v.specs)}　NT${v.price.toLocaleString()}
                  </option>
                ))}
              </select>
              {!variantId && <p className='text-xs text-amber-600 mt-1'>請選擇所有規格</p>}
            </FormField>
          )}

          {/* 數量 */}
          <FormField label='數量' required>
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className='w-9 h-9 rounded-xl border border-[var(--neutral-200)] text-[var(--neutral-600)] flex items-center justify-center hover:bg-[var(--neutral-100)] transition-colors cursor-pointer'
                aria-label='減少數量'
              >
                <svg
                  viewBox='0 0 24 24'
                  width='16'
                  height='16'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M5 12h14' />
                </svg>
              </button>
              <input
                type='number'
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className='w-20 text-center px-3 py-2 rounded-xl border border-[var(--neutral-200)] text-sm text-[var(--neutral-800)] focus:outline-none focus:border-[var(--forest-base)] focus:ring-2 focus:ring-[var(--forest-base)]/20'
              />
              <button
                type='button'
                onClick={() => setQuantity((q) => q + 1)}
                className='w-9 h-9 rounded-xl border border-[var(--neutral-200)] text-[var(--neutral-600)] flex items-center justify-center hover:bg-[var(--neutral-100)] transition-colors cursor-pointer'
                aria-label='增加數量'
              >
                <svg
                  viewBox='0 0 24 24'
                  width='16'
                  height='16'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M12 5v14M5 12h14' />
                </svg>
              </button>
            </div>
          </FormField>

          {/* 備註（選填） */}
          <FormField label='備註（選填）'>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder='商家內部備注，顧客不可見'
              className='w-full px-3.5 py-2.5 rounded-xl border border-[var(--neutral-200)] text-sm text-[var(--neutral-800)] bg-white focus:outline-none focus:border-[var(--forest-base)] focus:ring-2 focus:ring-[var(--forest-base)]/20 transition-all resize-none placeholder:text-[var(--neutral-300)]'
            />
          </FormField>

          {/* 小計預覽 */}
          {selectedVariant && (
            <div className='bg-[var(--neutral-50)] rounded-xl px-4 py-3 flex items-center justify-between'>
              <span className='text-sm text-[var(--neutral-500)]'>訂單小計</span>
              <span className='text-base font-bold text-[var(--neutral-800)]'>
                NT${subtotal.toLocaleString()}
              </span>
            </div>
          )}

          {/* 送出按鈕 */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className={[
              'w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
              isValid && !submitting
                ? 'bg-[var(--forest-base)] text-white hover:bg-[var(--forest-deep)] cursor-pointer'
                : 'bg-[var(--neutral-200)] text-[var(--neutral-400)] cursor-not-allowed',
            ].join(' ')}
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
      )}
    </div>
  )
}

// ── 小元件 ────────────────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className='block text-sm font-semibold text-[var(--neutral-700)] mb-1.5'>
        {label}
        {required && <span className='text-[var(--color-error)] ml-0.5'>*</span>}
      </label>
      {children}
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className='bg-white rounded-2xl border border-[var(--neutral-200)] shadow-sm p-6 animate-pulse space-y-5'>
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className='h-4 w-16 bg-[var(--neutral-200)] rounded mb-2' />
          <div className='h-10 bg-[var(--neutral-100)] rounded-xl' />
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
    >
      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
    </svg>
  )
}

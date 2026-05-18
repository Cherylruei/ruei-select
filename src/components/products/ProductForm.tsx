'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DimensionConfigurator,
  VariantPricingTable,
  cartesian,
  specsKey,
  type DimensionDef,
  type VariantRow,
} from './VariantBuilder'
import ImageUploader, { type UploadedImage } from './ImageUploader'
import AiTemplateSelector from './AiTemplateSelector'
import { useAiTemplates } from '@/hooks/useAiTemplates'
import type { Product, ProductWithDetails, Supplier, ProductCategory } from '@/types'

interface Props {
  mode: 'new' | 'edit'
  product?: ProductWithDetails
  suppliers: Supplier[]
  categories: ProductCategory[]
  storeId: string
}

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
}

function extractDimensions(variants: VariantRow[]): DimensionDef[] {
  if (!variants.length) return []
  const allKeys = [...new Set(variants.flatMap((v) => Object.keys(v.specs)))]
  return allKeys.map((key) => ({
    name: key,
    options: [...new Set(variants.map((v) => v.specs[key]).filter(Boolean))],
  }))
}

export default function ProductForm({ mode, product, suppliers, categories, storeId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toDatetimeLocal(isoString: string): string {
    const d = new Date(isoString)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [supplierId, setSupplierId] = useState(product?.supplier_id ?? '')
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '')
  const [originalText, setOriginalText] = useState(product?.description_raw ?? '')
  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [isPublic, setIsPublic] = useState(product?.is_public ?? false)
  const [endsAt, setEndsAt] = useState(product?.ends_at ? toDatetimeLocal(product.ends_at) : '')

  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const { templates, addTemplate, updateTemplate, deleteTemplate, setDefault } = useAiTemplates()

  const [defaultPrice, setDefaultPrice] = useState<number>(0)

  const initVariants: VariantRow[] = (product?.variants ?? []).map((v) => ({
    specs: v.specs,
    price: v.price,
    cost: v.cost,
    cost_currency: v.cost_currency,
  }))
  const [dimensions, setDimensions] = useState<DimensionDef[]>(extractDimensions(initVariants))
  const [variants, setVariants] = useState<VariantRow[]>(
    initVariants.length > 0
      ? initVariants
      : [{ specs: {}, price: 0, cost: null, cost_currency: 'TWD' }]
  )

  const [images, setImages] = useState<UploadedImage[]>(
    (product?.product_images ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ id: img.id, url: img.url, sort_order: img.sort_order }))
  )
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])

  const [toast, setToast] = useState<ToastState | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function buildVariants(
    newDims: DimensionDef[],
    existingVariants: VariantRow[],
    fallbackPrice: number,
    priceMap?: Map<string, number> | null
  ): VariantRow[] {
    const validDims = newDims.filter((d) => d.name.trim() && d.options.length > 0)
    const combos = cartesian(validDims)
    if (combos.length === 0 || (combos.length === 1 && Object.keys(combos[0]).length === 0)) {
      return [{ specs: {}, price: fallbackPrice || 0, cost: null, cost_currency: 'TWD' }]
    }
    const existingMap = new Map(existingVariants.map((v) => [specsKey(v.specs), v]))
    return combos.map((specs) => {
      const existing = existingMap.get(specsKey(specs))
      const aiPrice = priceMap?.get(specsKey(specs))
      return (
        existing ?? {
          specs,
          price: aiPrice ?? fallbackPrice ?? 0,
          cost: null,
          cost_currency: 'TWD',
        }
      )
    })
  }

  function handleDimensionsChange(newDims: DimensionDef[]) {
    setDimensions(newDims)
    setVariants(buildVariants(newDims, variants, defaultPrice))
  }

  function showToast(message: string, type: ToastState['type']) {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleAiOptimize() {
    setAiLoading(true)
    setAiError(null)
    const selectedTemplate = selectedTemplateId
      ? (templates.find((t) => t.id === selectedTemplateId) ?? null)
      : null
    try {
      const res = await fetch('/api/ai/copywriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalText,
          templateInstruction: selectedTemplate?.instruction,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'AI 優化失敗')

      const { name: aiName, description: aiDesc, detectedVariants } = body.data
      setName(aiName || name)
      setDescription(aiDesc || description)

      if (detectedVariants && detectedVariants.length > 0) {
        const newDims: DimensionDef[] = detectedVariants.map(
          (dv: { dimension: string; options: string[]; prices?: number[] }) => ({
            name: dv.dimension,
            options: dv.options,
          })
        )
        let priceMap: Map<string, number> | null = null
        const hasPrices = detectedVariants.some(
          (dv: { prices?: number[] }) => dv.prices && dv.prices.length > 0
        )
        if (hasPrices) {
          priceMap = new Map<string, number>()
          for (const dv of detectedVariants as {
            dimension: string
            options: string[]
            prices?: number[]
          }[]) {
            if (!dv.prices) continue
            dv.options.forEach((opt, i) => {
              const price = dv.prices![i]
              if (price != null && price > 0) {
                priceMap!.set(specsKey({ [dv.dimension]: opt }), price)
              }
            })
          }
        }
        setDimensions(newDims)
        setVariants(buildVariants(newDims, variants, defaultPrice, priceMap))
      }
      showToast('AI 優化完成！請確認並調整內容', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI 優化暫時無法使用，請手動填寫'
      setAiError(msg)
    } finally {
      setAiLoading(false)
    }
  }

  function validate() {
    const errs: Record<string, string> = {}
    if (!supplierId) errs.supplierId = '請選擇廠商'
    if (!name.trim()) errs.name = '商品名稱為必填'
    if (variants.some((v) => !v.price || v.price <= 0)) errs.variants = '所有規格組合都需設定售價'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function uploadPendingImages(productId: string): Promise<UploadedImage[]> {
    const { default: imageCompression } = await import('browser-image-compression')
    const result: UploadedImage[] = []
    for (const img of images) {
      if (img.id) {
        result.push(img)
        continue
      }
      if (!img.file) {
        result.push(img)
        continue
      }
      const compressed = await imageCompression(img.file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      })
      const formData = new FormData()
      formData.append('image', compressed, compressed.name || 'product.jpg')
      formData.append('productId', productId)
      formData.append('storeId', storeId)
      const res = await fetch('/api/products/upload-image', { method: 'POST', body: formData })
      const body = await res.json()
      if (res.ok) {
        result.push({ ...img, url: body.data.url as string, file: undefined })
      }
    }
    return result
  }

  function handleSave() {
    if (!validate()) return
    startTransition(async () => {
      try {
        let savedProduct: Product

        const endsAtIso = endsAt ? new Date(endsAt).toISOString() : null

        if (mode === 'new') {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supplier_id: supplierId || null,
              category_id: categoryId || null,
              name: name.trim(),
              description: description.trim() || null,
              description_raw: originalText.trim() || null,
              is_public: isPublic,
              ends_at: endsAtIso,
              variants: variants.map((v) => ({
                specs: v.specs,
                price: v.price,
                cost: v.cost,
                cost_currency: v.cost_currency,
              })),
              images: [],
            }),
          })
          const body = await res.json()
          if (!res.ok) {
            showToast(body.error || '儲存失敗', 'error')
            return
          }
          savedProduct = body.data as Product

          const uploadedImages = await uploadPendingImages(savedProduct.id)
          if (uploadedImages.length > 0) {
            await fetch(`/api/products/${savedProduct.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                images: uploadedImages.map((img, i) => ({ url: img.url, sort_order: i })),
              }),
            })
          }
        } else {
          if (!product) return
          const uploadedImages = await uploadPendingImages(product.id)

          const res = await fetch(`/api/products/${product.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supplier_id: supplierId || null,
              category_id: categoryId || null,
              name: name.trim(),
              description: description.trim() || null,
              description_raw: originalText.trim() || null,
              is_public: isPublic,
              ends_at: endsAtIso,
              variants: variants.map((v) => ({
                specs: v.specs,
                price: v.price,
                cost: v.cost,
                cost_currency: v.cost_currency,
              })),
              images: uploadedImages
                .filter((img) => !img.id)
                .map((img, i) => ({ url: img.url, sort_order: images.length + i })),
              deleted_image_ids: deletedImageIds,
            }),
          })
          const body = await res.json()
          if (!res.ok) {
            showToast(body.error || '儲存失敗', 'error')
            return
          }
          savedProduct = body.data as Product
        }

        showToast(mode === 'new' ? '商品已建立' : '商品已更新', 'success')
        setTimeout(() => {
          router.push('/admin/products')
          router.refresh()
        }, 1000)
      } catch {
        showToast('儲存失敗，請稍後再試', 'error')
      }
    })
  }

  return (
    <div className='flex flex-col gap-6 w-full max-w-5xl'>
      {/* Row 1: 廠商＋分類 | 截單日期 + 設為公開 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
        {/* 廠商選擇 + 分類選擇 */}
        <div className='flex flex-row gap-4'>
          <div className='flex flex-col gap-1.5 flex-1 min-w-0'>
            <label className='text-[13px] font-medium text-[var(--neutral-700)]'>
              廠商<span className='text-[var(--color-error)] ml-0.5'>*</span>
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={isPending}
              className='w-full border border-[var(--neutral-200)] rounded-lg px-3 py-2.5 text-[13px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
            >
              <option value=''>請選擇廠商</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.supplierId && (
              <p className='text-[12px] text-[var(--color-error)]'>{errors.supplierId}</p>
            )}
          </div>

          {categories.length > 0 && (
            <div className='flex flex-col gap-1.5 flex-1 min-w-0'>
              <label className='text-[13px] font-medium text-[var(--neutral-700)]'>分類</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isPending}
                className='w-full border border-[var(--neutral-200)] rounded-lg px-3 py-2.5 text-[13px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
              >
                <option value=''>不指定分類</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 截單日期 + 設為公開 */}
        <div className='flex flex-wrap items-start gap-4'>
          <div className='flex flex-col gap-1.5 flex-1 min-w-[180px]'>
            <label className='text-[13px] font-medium text-[var(--neutral-700)]'>
              截單日期
              <span className='text-[11px] text-[var(--neutral-400)] font-normal ml-1.5'>
                選填，預設 23:59
              </span>
            </label>
            <div className='flex items-center gap-2'>
              <input
                type='datetime-local'
                value={endsAt}
                onChange={(e) => {
                  const val = e.target.value
                  if (val && val.endsWith('T00:00')) {
                    setEndsAt(val.slice(0, 10) + 'T23:59')
                  } else {
                    setEndsAt(val)
                  }
                }}
                disabled={isPending}
                className='border border-[var(--neutral-200)] rounded-lg px-3 py-2.5 text-[13px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
              />
              {endsAt && (
                <button
                  type='button'
                  onClick={() => setEndsAt('')}
                  disabled={isPending}
                  className='text-[12px] text-[var(--neutral-400)] hover:text-[var(--color-error)] transition-colors shrink-0'
                >
                  清除
                </button>
              )}
            </div>
            {endsAt && new Date(endsAt) <= new Date() && (
              <p className='text-[12px] text-[var(--color-error)]'>
                截單日期已過，商品將不顯示於公開頁
              </p>
            )}
          </div>

          <div className='flex flex-col gap-1.5'>
            <label className='text-[13px] font-medium text-[var(--neutral-700)]'>設為公開</label>
            <div className='flex items-center gap-2.5 pt-1'>
              <button
                type='button'
                role='switch'
                aria-checked={isPublic}
                onClick={() => setIsPublic(!isPublic)}
                disabled={isPending}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forest-base)] ${
                  isPublic ? 'bg-[var(--forest-base)]' : 'bg-[var(--neutral-300)]'
                } disabled:opacity-60 cursor-pointer`}
                aria-label='設為公開'
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    isPublic ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className='text-[12.5px] text-[var(--neutral-500)]'>可被搜尋引擎索引</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: AI 文案區 | 商品名稱 + 描述 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start'>
        {/* AI 文案區 */}
        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-2'>
            <AiTemplateSelector
              selectedId={selectedTemplateId}
              onSelect={setSelectedTemplateId}
              disabled={isPending || aiLoading}
              templates={templates}
              onAdd={addTemplate}
              onUpdate={updateTemplate}
              onDelete={deleteTemplate}
              onSetDefault={setDefault}
            />
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={handleAiOptimize}
                disabled={isPending || aiLoading}
                className='flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--forest-base)] text-[var(--forest-base)] text-[12.5px] font-medium hover:bg-[var(--forest-50)] transition-colors disabled:opacity-40'
              >
                {aiLoading ? (
                  <span className='w-3 h-3 border-2 border-[var(--forest-base)] border-t-transparent rounded-full animate-spin' />
                ) : (
                  <svg
                    viewBox='0 0 24 24'
                    width='14'
                    height='14'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2' />
                  </svg>
                )}
                {aiLoading ? 'AI 優化中…' : 'AI 優化文案'}
              </button>
              {aiError && <p className='text-[12px] text-[var(--color-error)]'>{aiError}</p>}
            </div>
          </div>
          <div className='flex flex-col gap-1.5'>
            <label className='text-[13px] font-medium text-[var(--neutral-700)]'>
              原始商品文
              <span className='text-[11px] text-[var(--neutral-400)] font-normal ml-1.5'>選填</span>
            </label>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              rows={9}
              disabled={isPending || aiLoading}
              placeholder='貼入廠商提供的原始商品說明文字（選填，AI 可在無原文的情況下依模板生成）'
              className='border border-[var(--neutral-200)] rounded-lg px-3 py-2.5 text-[13px] bg-white text-[var(--neutral-700)] resize-y focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
            />
          </div>
        </div>

        {/* 商品名稱 + 描述 */}
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <label className='text-[13px] font-medium text-[var(--neutral-700)]'>
              商品名稱<span className='text-[var(--color-error)] ml-0.5'>*</span>
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder='請輸入商品名稱'
              maxLength={100}
              className='border border-[var(--neutral-200)] rounded-lg px-3 py-2.5 text-[13px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
            />
            {errors.name && <p className='text-[12px] text-[var(--color-error)]'>{errors.name}</p>}
          </div>
          <div className='flex flex-col gap-1.5'>
            <label className='text-[13px] font-medium text-[var(--neutral-700)]'>商品描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={9}
              disabled={isPending}
              placeholder='商品描述（選填）'
              className='border border-[var(--neutral-200)] rounded-lg px-3 py-2.5 text-[13px] bg-white text-[var(--neutral-700)] resize-y focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
            />
          </div>
        </div>
      </div>

      {/* Row 3: 規格設定 | 規格組合定價 */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start'>
        {/* 商品規格與定價 */}
        <div className='flex flex-col gap-3'>
          <label className='text-[13px] font-medium text-[var(--neutral-700)]'>
            商品規格與定價
          </label>
          {errors.variants && (
            <p className='text-[12px] text-[var(--color-error)]'>{errors.variants}</p>
          )}
          <div className='flex items-center gap-3 border border-[var(--neutral-200)] rounded-xl p-3.5 bg-[var(--neutral-50)]'>
            <label className='text-[12.5px] text-[var(--neutral-600)] shrink-0'>
              統一售價（TWD）
            </label>
            <input
              type='number'
              min={0}
              step='1'
              value={defaultPrice || ''}
              onChange={(e) => setDefaultPrice(e.target.value === '' ? 0 : Number(e.target.value))}
              disabled={isPending}
              placeholder='0'
              className='border border-[var(--neutral-200)] rounded-lg px-3 py-1.5 text-[13px] bg-white w-28 focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
              aria-label='統一售價'
            />
            <button
              type='button'
              onClick={() =>
                setVariants((prev) => prev.map((v) => ({ ...v, price: defaultPrice })))
              }
              disabled={isPending || !defaultPrice}
              className='px-3 py-1.5 rounded-lg border border-[var(--forest-base)] text-[var(--forest-base)] text-[12px] hover:bg-[var(--forest-50)] transition-colors disabled:opacity-40'
            >
              套用到所有規格
            </button>
          </div>
          <DimensionConfigurator
            dimensions={dimensions}
            onDimensionsChange={handleDimensionsChange}
            disabled={isPending}
          />
        </div>

        {/* 規格組合定價 */}
        <div className='flex flex-col gap-3'>
          <label className='text-[13px] font-medium text-[var(--neutral-700)]'>規格組合定價</label>
          <VariantPricingTable
            variants={variants}
            onVariantsChange={setVariants}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Row 4: 商品圖片 */}
      <div className='flex flex-col gap-1.5'>
        <label className='text-[13px] font-medium text-[var(--neutral-700)]'>
          商品圖片（最多 10 張）
        </label>
        <ImageUploader
          images={images}
          onImagesChange={setImages}
          onDeleteId={(id) => setDeletedImageIds((prev) => [...prev, id])}
          storeId={storeId}
          productId={product?.id}
          disabled={isPending}
        />
      </div>

      {/* Row 5: 取消 / 建立商品 */}
      <div className='flex items-center justify-end gap-3 pt-2'>
        <button
          type='button'
          onClick={() => router.back()}
          disabled={isPending}
          className='px-5 py-2.5 rounded-lg border border-[var(--neutral-200)] text-[13px] text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] transition-colors disabled:opacity-60'
        >
          取消
        </button>
        <button
          type='button'
          onClick={handleSave}
          disabled={isPending}
          className='px-5 py-2.5 rounded-lg bg-[var(--forest-base)] text-white text-[13px] font-medium hover:bg-[var(--forest-deep)] transition-colors disabled:opacity-60 flex items-center gap-2'
        >
          {isPending && (
            <span className='w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin' />
          )}
          {isPending ? '儲存中…' : mode === 'new' ? '建立商品' : '儲存變更'}
        </button>
      </div>

      {toast && (
        <div
          role='status'
          aria-live='polite'
          className={`fixed bottom-6 right-6 z-[300] px-5 py-3 rounded-xl shadow-lg text-[13px] font-medium text-white transition-all ${
            toast.type === 'success'
              ? 'bg-[var(--forest-base)]'
              : toast.type === 'error'
                ? 'bg-[var(--color-error)]'
                : 'bg-[var(--color-info)]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

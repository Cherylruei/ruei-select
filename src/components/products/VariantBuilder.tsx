'use client'

import { useState, useEffect } from 'react'
import CurrencyInput from './CurrencyInput'
import type { Currency } from '@/types'

export interface DimensionDef {
  name: string
  options: string[]
}

export interface VariantRow {
  specs: Record<string, string>
  price: number
  cost: number | null
  cost_currency: Currency
}

interface Props {
  dimensions: DimensionDef[]
  variants: VariantRow[]
  onDimensionsChange: (dims: DimensionDef[]) => void
  onVariantsChange: (variants: VariantRow[]) => void
  disabled?: boolean
  defaultPrice?: number
}

function cartesian(dims: DimensionDef[]): Record<string, string>[] {
  if (dims.length === 0) return [{}]
  const [first, ...rest] = dims
  const tail = cartesian(rest)
  return first.options.flatMap((opt) => tail.map((t) => ({ [first.name]: opt, ...t })))
}

function specsKey(specs: Record<string, string>) {
  return JSON.stringify(specs)
}

export default function VariantBuilder({
  dimensions,
  variants,
  onDimensionsChange,
  onVariantsChange,
  disabled,
  defaultPrice,
}: Props) {
  const [newDimName, setNewDimName] = useState('')
  const [newDimOptions, setNewDimOptions] = useState('')

  // 當 dimensions 改變時，重新計算笛卡爾積，保留舊的 price/cost 設定
  useEffect(() => {
    const validDims = dimensions.filter((d) => d.name.trim() && d.options.length > 0)
    const combos = cartesian(validDims)
    if (combos.length === 0 || (combos.length === 1 && Object.keys(combos[0]).length === 0)) {
      onVariantsChange([{ specs: {}, price: defaultPrice ?? 0, cost: null, cost_currency: 'TWD' }])
      return
    }
    const existingMap = new Map(variants.map((v) => [specsKey(v.specs), v]))
    const newVariants: VariantRow[] = combos.map((specs) => {
      const existing = existingMap.get(specsKey(specs))
      return existing ?? { specs, price: defaultPrice ?? 0, cost: null, cost_currency: 'TWD' }
    })
    onVariantsChange(newVariants)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions])

  function addDimension() {
    const name = newDimName.trim()
    const options = newDimOptions
      .split(/[,，、\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!name || options.length === 0) return
    if (dimensions.some((d) => d.name === name)) return
    onDimensionsChange([...dimensions, { name, options }])
    setNewDimName('')
    setNewDimOptions('')
  }

  function removeDimension(idx: number) {
    onDimensionsChange(dimensions.filter((_, i) => i !== idx))
  }

  function updateVariant(idx: number, field: 'price' | 'cost' | 'cost_currency', val: unknown) {
    const updated = variants.map((v, i) => (i === idx ? { ...v, [field]: val } : v))
    onVariantsChange(updated)
  }

  const specsLabel = (specs: Record<string, string>) => {
    const entries = Object.entries(specs)
    if (entries.length === 0) return '預設規格'
    return entries.map(([k, v]) => `${k}: ${v}`).join(' / ')
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* 新增維度 */}
      <div className='border border-[var(--neutral-200)] rounded-xl p-4 bg-[var(--neutral-50)]'>
        <p className='text-[12.5px] font-medium text-[var(--neutral-600)] mb-3'>新增規格維度</p>
        <div className='flex flex-col gap-2'>
          <input
            type='text'
            value={newDimName}
            onChange={(e) => setNewDimName(e.target.value)}
            placeholder='維度名稱，例：顏色'
            disabled={disabled}
            className='border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
          />
          <input
            type='text'
            value={newDimOptions}
            onChange={(e) => setNewDimOptions(e.target.value)}
            placeholder='選項（用逗號分隔），例：紅, 藍, 白'
            disabled={disabled}
            className='border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
          />
          <button
            type='button'
            onClick={addDimension}
            disabled={disabled || !newDimName.trim() || !newDimOptions.trim()}
            className='self-start px-4 py-2 rounded-lg bg-[var(--forest-base)] text-white text-[12.5px] font-medium disabled:opacity-40 hover:bg-[var(--forest-deep)] transition-colors'
          >
            + 新增維度
          </button>
        </div>

        {/* 已加維度清單 */}
        {dimensions.length > 0 && (
          <div className='mt-3 flex flex-wrap gap-2'>
            {dimensions.map((dim, idx) => (
              <div
                key={idx}
                className='flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--forest-100)] bg-[var(--forest-50)] text-[12px] text-[var(--forest-deep)]'
              >
                <span className='font-medium'>{dim.name}</span>
                <span className='text-[var(--neutral-400)]'>{dim.options.join('、')}</span>
                <button
                  type='button'
                  onClick={() => removeDimension(idx)}
                  disabled={disabled}
                  className='ml-1 text-[var(--neutral-400)] hover:text-[var(--color-error)] transition-colors'
                  aria-label={`刪除 ${dim.name} 維度`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 規格組合定價 */}
      <div className='flex flex-col gap-3'>
        <p className='text-[12.5px] font-medium text-[var(--neutral-600)]'>規格組合定價</p>
        {variants.map((v, idx) => (
          <div
            key={idx}
            className='border border-[var(--neutral-200)] rounded-xl p-4 bg-white flex flex-col gap-3'
          >
            <p className='text-[13px] font-medium text-[var(--neutral-700)]'>
              {specsLabel(v.specs)}
            </p>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='flex flex-col gap-1'>
                <label className='text-[12px] text-[var(--neutral-500)]'>
                  售價（TWD）<span className='text-[var(--color-error)] ml-0.5'>*</span>
                </label>
                <input
                  type='number'
                  min={0}
                  step='1'
                  value={v.price || ''}
                  onChange={(e) =>
                    updateVariant(idx, 'price', e.target.value === '' ? 0 : Number(e.target.value))
                  }
                  disabled={disabled}
                  placeholder='0'
                  className='border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
                  aria-label={`${specsLabel(v.specs)} 售價`}
                />
              </div>
              <div className='flex flex-col gap-1'>
                <label className='text-[12px] text-[var(--neutral-500)]'>成本（選填）</label>
                <CurrencyInput
                  value={v.cost}
                  currency={v.cost_currency}
                  onValueChange={(val) => updateVariant(idx, 'cost', val)}
                  onCurrencyChange={(c) => updateVariant(idx, 'cost_currency', c)}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

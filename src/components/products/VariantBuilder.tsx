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

interface DimensionConfiguratorProps {
  dimensions: DimensionDef[]
  onDimensionsChange: (dims: DimensionDef[]) => void
  disabled?: boolean
}

interface VariantPricingTableProps {
  variants: VariantRow[]
  onVariantsChange: (variants: VariantRow[]) => void
  disabled?: boolean
}

export function cartesian(dims: DimensionDef[]): Record<string, string>[] {
  if (dims.length === 0) return [{}]
  const [first, ...rest] = dims
  const tail = cartesian(rest)
  return first.options.flatMap((opt) => tail.map((t) => ({ [first.name]: opt, ...t })))
}

export function specsKey(specs: Record<string, string>) {
  return JSON.stringify(specs)
}

const FLD =
  'w-full border border-line rounded-md px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition disabled:opacity-60 placeholder:text-fg-subtle'

export function DimensionConfigurator({
  dimensions,
  onDimensionsChange,
  disabled,
}: DimensionConfiguratorProps) {
  const [newDimName, setNewDimName] = useState('')
  const [newDimOptions, setNewDimOptions] = useState('')
  // addingIdx：正在「新增選項」的維度 index，null = 未展開
  const [addingIdx, setAddingIdx] = useState<number | null>(null)
  const [addingVal, setAddingVal] = useState('')

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
    if (addingIdx === idx) setAddingIdx(null)
  }

  function removeOption(dimIdx: number, optIdx: number) {
    const updated = dimensions
      .map((d, i) => {
        if (i !== dimIdx) return d
        const opts = d.options.filter((_, oi) => oi !== optIdx)
        return { ...d, options: opts }
      })
      .filter((d) => d.options.length > 0)
    onDimensionsChange(updated)
  }

  function commitAddOption(dimIdx: number) {
    const newOpts = addingVal
      .split(/[,，、\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (newOpts.length === 0) {
      setAddingIdx(null)
      setAddingVal('')
      return
    }
    onDimensionsChange(
      dimensions.map((d, i) => {
        if (i !== dimIdx) return d
        const existing = new Set(d.options)
        return { ...d, options: [...d.options, ...newOpts.filter((o) => !existing.has(o))] }
      })
    )
    setAddingIdx(null)
    setAddingVal('')
  }

  return (
    <div className='border border-line rounded-xl p-4 bg-sunken flex flex-col gap-4'>
      {/* 已加入的維度 */}
      {dimensions.map((dim, idx) => (
        <div key={idx} className='bg-surface border border-line rounded-lg p-3 flex flex-col gap-2'>
          {/* 維度標題列 */}
          <div className='flex items-center gap-2'>
            <span className='font-display font-semibold text-sm'>{dim.name}</span>
            <span className='font-mono text-[10px] text-fg-subtle'>{dim.options.length} 項</span>
            <button
              type='button'
              onClick={() => removeDimension(idx)}
              disabled={disabled}
              className='ml-auto text-xs text-fg-subtle hover:text-danger font-semibold transition'
            >
              移除維度
            </button>
          </div>
          {/* 選項 chips — 允許換行 */}
          <div className='flex items-center gap-1.5 flex-wrap'>
            {dim.options.map((opt, oi) => (
              <span
                key={oi}
                className='inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 rounded-pill border border-line bg-app text-xs font-semibold text-fg'
              >
                {opt}
                <button
                  type='button'
                  onClick={() => removeOption(idx, oi)}
                  disabled={disabled}
                  className='w-4 h-4 rounded-full flex items-center justify-center text-fg-subtle hover:bg-danger-bg hover:text-danger transition'
                  aria-label={`移除選項 ${opt}`}
                >
                  <svg
                    width='10'
                    height='10'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2.8'
                    strokeLinecap='round'
                  >
                    <path d='M6 6l12 12M6 18L18 6' />
                  </svg>
                </button>
              </span>
            ))}

            {/* ＋ 選項（展開式 inline input） */}
            {addingIdx === idx ? (
              <div className='inline-flex items-center gap-1.5'>
                <input
                  autoFocus
                  type='text'
                  value={addingVal}
                  onChange={(e) => setAddingVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitAddOption(idx)
                    }
                    if (e.key === 'Escape') {
                      setAddingIdx(null)
                      setAddingVal('')
                    }
                  }}
                  placeholder='選項，逗號分隔'
                  disabled={disabled}
                  className='h-7 w-36 border border-primary rounded-pill px-2.5 text-xs bg-surface outline-none'
                />
                <button
                  type='button'
                  onClick={() => commitAddOption(idx)}
                  className='h-7 px-2.5 rounded-pill bg-primary text-white font-display font-semibold text-xs hover:bg-primary-hv transition'
                >
                  確認
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setAddingIdx(null)
                    setAddingVal('')
                  }}
                  className='h-7 px-2 rounded-pill border border-line text-fg-subtle text-xs hover:bg-sunken transition'
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => {
                  setAddingIdx(idx)
                  setAddingVal('')
                }}
                disabled={disabled}
                className='h-7 px-2.5 rounded-pill border border-dashed border-line-strong text-fg-subtle font-display font-semibold text-xs hover:bg-sunken hover:text-fg transition'
              >
                ＋ 選項
              </button>
            )}
          </div>
        </div>
      ))}

      {/* 新增維度表單 */}
      <div className='flex flex-col gap-2'>
        {dimensions.length > 0 && <hr className='border-line' />}
        <p className='text-xs font-semibold text-fg-muted'>新增規格維度</p>
        <input
          type='text'
          value={newDimName}
          onChange={(e) => setNewDimName(e.target.value)}
          placeholder='維度名稱，例：顏色'
          disabled={disabled}
          className={FLD}
        />
        <input
          type='text'
          value={newDimOptions}
          onChange={(e) => setNewDimOptions(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addDimension()
            }
          }}
          placeholder='選項（用逗號分隔），例：紅, 藍, 白'
          disabled={disabled}
          className={FLD}
        />
        <button
          type='button'
          onClick={addDimension}
          disabled={disabled || !newDimName.trim() || !newDimOptions.trim()}
          className='self-start h-8 px-4 rounded-pill bg-secondary text-white font-display font-semibold text-xs hover:bg-secondary-hv transition disabled:opacity-40'
        >
          + 新增維度
        </button>
      </div>
    </div>
  )
}

export function VariantPricingTable({
  variants,
  onVariantsChange,
  disabled,
}: VariantPricingTableProps) {
  function updateVariant(idx: number, field: 'price' | 'cost' | 'cost_currency', val: unknown) {
    onVariantsChange(variants.map((v, i) => (i === idx ? { ...v, [field]: val } : v)))
  }

  function specsLabel(specs: Record<string, string>) {
    const entries = Object.entries(specs)
    if (entries.length === 0) return '預設規格'
    return entries.map(([k, v]) => `${k}: ${v}`).join(' / ')
  }

  return (
    <div className='flex flex-col gap-3'>
      {variants.map((v, idx) => (
        <div key={idx} className='border border-line rounded-xl p-4 bg-surface flex flex-col gap-3'>
          <p className='text-sm font-semibold'>{specsLabel(v.specs)}</p>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='flex flex-col gap-1 min-w-0'>
              <label className='text-xs text-fg-muted'>
                售價（TWD）<span className='text-danger ml-0.5'>*</span>
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
                className='w-full border border-line rounded-md px-3 py-2 text-sm bg-surface outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--c-primary-bg)] transition disabled:opacity-60'
                aria-label={`${specsLabel(v.specs)} 售價`}
              />
            </div>
            <div className='flex flex-col gap-1 min-w-0'>
              <label className='text-xs text-fg-muted'>成本（選填）</label>
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
  )
}

export default function VariantBuilder({
  dimensions,
  variants,
  onDimensionsChange,
  onVariantsChange,
  disabled,
  defaultPrice,
}: Props) {
  useEffect(() => {
    const validDims = dimensions.filter((d) => d.name.trim() && d.options.length > 0)
    const combos = cartesian(validDims)
    if (combos.length === 0 || (combos.length === 1 && Object.keys(combos[0]).length === 0)) {
      onVariantsChange([{ specs: {}, price: defaultPrice ?? 0, cost: null, cost_currency: 'TWD' }])
      return
    }
    const existingMap = new Map(variants.map((v) => [specsKey(v.specs), v]))
    onVariantsChange(
      combos.map(
        (specs) =>
          existingMap.get(specsKey(specs)) ?? {
            specs,
            price: defaultPrice ?? 0,
            cost: null,
            cost_currency: 'TWD',
          }
      )
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions])

  return (
    <div className='flex flex-col gap-4'>
      <DimensionConfigurator
        dimensions={dimensions}
        onDimensionsChange={onDimensionsChange}
        disabled={disabled}
      />
      <VariantPricingTable
        variants={variants}
        onVariantsChange={onVariantsChange}
        disabled={disabled}
      />
    </div>
  )
}

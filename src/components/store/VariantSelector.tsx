'use client'

import { useState, useEffect } from 'react'

interface Variant {
  id: string
  specs: Record<string, string>
  price: number
}

interface VariantSelectorProps {
  variants: Variant[]
  onChange: (variantId: string | null) => void
}

export default function VariantSelector({ variants, onChange }: VariantSelectorProps) {
  const dimensions = getDimensions(variants)
  const [selected, setSelected] = useState<Record<string, string>>({})

  useEffect(() => {
    if (dimensions.length === 0) {
      if (variants.length === 1) onChange(variants[0].id)
      return
    }

    const allSelected = dimensions.every((dim) => selected[dim] !== undefined)
    if (!allSelected) {
      onChange(null)
      return
    }

    const matched = variants.find((v) => dimensions.every((dim) => v.specs[dim] === selected[dim]))
    onChange(matched?.id ?? null)
  }, [selected, variants, dimensions, onChange])

  if (dimensions.length === 0) return null

  function pickOption(dim: string, value: string) {
    setSelected((prev) => ({ ...prev, [dim]: value }))
  }

  return (
    <div className='flex flex-col gap-4'>
      {dimensions.map((dim) => {
        const options = getOptionsForDimension(variants, dim)
        return (
          <div key={dim}>
            <p className='text-[13px] font-medium text-[var(--neutral-700)] mb-2'>
              {dim}
              {selected[dim] && (
                <span className='ml-2 text-[var(--forest-base)] font-semibold'>
                  {selected[dim]}
                </span>
              )}
            </p>
            <div className='flex flex-wrap gap-2'>
              {options.map((opt) => {
                const isActive = selected[dim] === opt
                return (
                  <button
                    key={opt}
                    type='button'
                    onClick={() => pickOption(dim, opt)}
                    className={[
                      'px-4 py-1.5 rounded-full text-[13px] font-medium border transition-colors',
                      isActive
                        ? 'bg-[var(--forest-base)] text-white border-[var(--forest-base)]'
                        : 'bg-white text-[var(--neutral-700)] border-[var(--neutral-300)] hover:border-[var(--forest-base)]',
                    ].join(' ')}
                    aria-pressed={isActive}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getDimensions(variants: Variant[]): string[] {
  if (variants.length === 0) return []
  const keys = new Set<string>()
  for (const v of variants) {
    for (const k of Object.keys(v.specs)) keys.add(k)
  }
  return [...keys]
}

function getOptionsForDimension(variants: Variant[], dim: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const v of variants) {
    const val = v.specs[dim]
    if (val && !seen.has(val)) {
      seen.add(val)
      result.push(val)
    }
  }
  return result
}

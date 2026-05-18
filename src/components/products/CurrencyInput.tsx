'use client'

import { useState, useEffect, useRef } from 'react'
import type { Currency } from '@/types'

const FOREIGN_CURRENCIES: Exclude<Currency, 'TWD'>[] = ['JPY', 'GBP', 'USD', 'HKD']

interface Props {
  value: number | null
  currency: Currency
  onValueChange: (v: number | null) => void
  onCurrencyChange: (c: Currency) => void
  disabled?: boolean
}

export default function CurrencyInput({
  value,
  currency,
  onValueChange,
  onCurrencyChange,
  disabled,
}: Props) {
  const [rate, setRate] = useState<number | null>(null)
  const [rateWarning, setRateWarning] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (currency === 'TWD' || !value) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setRate(null)
      setRateWarning(null)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setFetching(true)
      try {
        const res = await fetch(`/api/exchange-rates?currency=${currency}`)
        const body = await res.json()
        if (res.ok && body.data) {
          setRate(body.data.rate as number)
          setRateWarning(body.data.warning ?? null)
        } else {
          setRate(null)
          setRateWarning('匯率暫時無法取得')
        }
      } catch {
        setRate(null)
        setRateWarning('匯率暫時無法取得')
      } finally {
        setFetching(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [currency, value])

  const twdEquivalent = rate !== null && value !== null ? Math.round(value * rate) : null

  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex gap-2 min-w-0'>
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value as Currency)}
          disabled={disabled}
          className='border border-[var(--neutral-200)] rounded-lg px-2 py-2 text-[13px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
          aria-label='幣別'
        >
          <option value='TWD'>TWD</option>
          {FOREIGN_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type='number'
          min={0}
          step='0.01'
          value={value ?? ''}
          onChange={(e) => onValueChange(e.target.value === '' ? null : Number(e.target.value))}
          disabled={disabled}
          placeholder='成本（選填）'
          className='flex-1 min-w-0 border border-[var(--neutral-200)] rounded-lg px-3 py-2 text-[13px] bg-white text-[var(--neutral-700)] focus:outline-none focus:border-[var(--forest-base)] disabled:opacity-60'
          aria-label='成本金額'
        />
      </div>
      {currency !== 'TWD' && value !== null && value > 0 && (
        <p className='text-[12px] text-[var(--neutral-400)]'>
          {fetching && '查詢匯率中…'}
          {!fetching && rateWarning && (
            <span className='text-[var(--color-warning)]'>{rateWarning}</span>
          )}
          {!fetching && !rateWarning && rate !== null && twdEquivalent !== null && (
            <>
              今日匯率 {rate.toFixed(4)}，約 NT${' '}
              <span className='text-[var(--neutral-600)] font-medium'>
                {twdEquivalent.toLocaleString()}
              </span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

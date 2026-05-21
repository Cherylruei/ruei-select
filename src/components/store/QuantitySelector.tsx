'use client'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
}

export default function QuantitySelector({ value, onChange, min = 1 }: QuantitySelectorProps) {
  function decrement() {
    if (value > min) onChange(value - 1)
  }

  function increment() {
    onChange(value + 1)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const num = parseInt(e.target.value, 10)
    if (!isNaN(num) && num >= min) onChange(num)
  }

  return (
    <div className='flex items-center gap-0' role='group' aria-label='數量選擇'>
      <button
        type='button'
        onClick={decrement}
        disabled={value <= min}
        className='w-10 h-10 flex items-center justify-center rounded-l-lg border border-[var(--neutral-300)] bg-white text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
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
        value={value}
        onChange={handleInput}
        min={min}
        className='w-14 h-10 text-center text-[15px] font-semibold text-[var(--neutral-800)] border-y border-[var(--neutral-300)] bg-white focus:outline-none focus:border-[var(--forest-base)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
        aria-label='數量'
      />
      <button
        type='button'
        onClick={increment}
        className='w-10 h-10 flex items-center justify-center rounded-r-lg border border-[var(--neutral-300)] bg-white text-[var(--neutral-700)] hover:bg-[var(--neutral-100)] transition-colors'
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
  )
}

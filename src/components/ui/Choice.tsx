/* ── Switch ──────────────────────────────────────────────── */
interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label
      className={[
        'inline-flex items-center gap-3 text-sm cursor-pointer',
        disabled ? 'opacity-45 cursor-not-allowed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && <span className='text-fg'>{label}</span>}
      <span className='relative inline-block w-11 h-[26px]'>
        <input
          type='checkbox'
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className='peer sr-only'
        />
        {/* track：checked=on 時轉粉；disabled 時強制灰（opacity-45 已在 label 上） */}
        <span className='absolute inset-0 rounded-pill bg-ink-300 transition peer-checked:bg-primary peer-disabled:bg-ink-300' />
        {/* thumb */}
        <span className='absolute top-[3px] left-[3px] w-5 h-5 rounded-pill bg-white shadow-sm transition peer-checked:translate-x-[18px]' />
      </span>
    </label>
  )
}

/* ── Checkbox ────────────────────────────────────────────── */
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label
      className={['inline-flex items-center gap-2 text-sm cursor-pointer', className].join(' ')}
    >
      <input type='checkbox' className='peer hidden' {...props} />

      {/*
       * peer-checked:[&_svg]:opacity-100 — 外層 span 是 peer 的 sibling，
       * peer-checked: 可作用於它；[&_svg] 再往下 target 內部 svg。
       * 這樣就不需要 group / group-has 也能跨層傳遞狀態。
       */}
      <span
        className={[
          'w-5 h-5 rounded-[6px] border-[1.5px] border-line-strong bg-white',
          'inline-flex items-center justify-center transition',
          'peer-checked:bg-primary peer-checked:border-primary',
          'peer-checked:[&_svg]:opacity-100',
        ].join(' ')}
      >
        <svg
          width='11'
          height='9'
          viewBox='0 0 11 9'
          fill='none'
          className='opacity-0 transition'
          aria-hidden='true'
        >
          <path
            d='M1 4.5l3 3 6-6'
            stroke='white'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </span>

      {label && <span className='text-fg'>{label}</span>}
    </label>
  )
}

/* ── Radio ───────────────────────────────────────────────── */
interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Radio({ label, className = '', ...props }: RadioProps) {
  return (
    <label
      className={['inline-flex items-center gap-2 text-sm cursor-pointer', className].join(' ')}
    >
      <input type='radio' className='peer hidden' {...props} />

      {/*
       * peer-checked:[&_span]:opacity-100 — 同 Checkbox 技法，
       * 外層圓環是 peer sibling，用 [&_span] 傳遞給內部白色 dot span。
       */}
      <span
        className={[
          'w-5 h-5 rounded-pill border-[1.5px] border-line-strong bg-white',
          'inline-flex items-center justify-center transition',
          'peer-checked:bg-primary peer-checked:border-primary',
          'peer-checked:[&_span]:opacity-100',
        ].join(' ')}
      >
        <span className='w-2 h-2 rounded-pill bg-white opacity-0 transition' />
      </span>

      {label && <span className='text-fg'>{label}</span>}
    </label>
  )
}

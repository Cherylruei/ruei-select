import { forwardRef } from 'react'

/* ── shared base class ────────────────────────────────────── */
const inputBase =
  'w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-line bg-surface text-fg outline-none transition ' +
  'hover:border-line-strong ' +
  'focus:border-primary focus:shadow-[0_0_0_4px_var(--c-primary-bg)]'

const inputError =
  'border-danger shadow-[0_0_0_4px_var(--c-danger-bg)] ' +
  'focus:border-danger focus:shadow-[0_0_0_4px_var(--c-danger-bg)]'

/* ── Field wrapper (label + hint/error) ──────────────────── */
interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function Field({ label, hint, error, required, children, className = '' }: FieldProps) {
  return (
    <div className={['flex flex-col gap-1.5', className].join(' ')}>
      {label && (
        <label className='block text-sm font-semibold text-fg'>
          {label}
          {required && <span className='text-danger ml-0.5'>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className='text-xs text-danger'>{error}</p>
      ) : hint ? (
        <p className='text-xs text-fg-subtle'>{hint}</p>
      ) : null}
    </div>
  )
}

/* ── Input ───────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError, className = '', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={[inputBase, hasError ? inputError : '', 'placeholder:text-ink-400', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
})

/* ── Textarea ────────────────────────────────────────────── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { hasError, className = '', ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={[
        inputBase,
        hasError ? inputError : '',
        'min-h-[96px] resize-y leading-relaxed placeholder:text-ink-400',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
})

/* ── Select ──────────────────────────────────────────────── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { hasError, className = '', children, ...props },
  ref
) {
  return (
    <div className='relative'>
      <select
        ref={ref}
        className={[
          inputBase,
          'appearance-none pr-9 cursor-pointer',
          hasError ? inputError : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </select>
      {/* 下拉箭頭 */}
      <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400'>
        <svg
          viewBox='0 0 24 24'
          width='16'
          height='16'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          aria-hidden='true'
        >
          <path d='M6 9l6 6 6-6' />
        </svg>
      </span>
    </div>
  )
})

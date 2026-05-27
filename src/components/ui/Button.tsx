import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** icon-only 圓形按鈕（寬高相等，無 padding） */
  iconOnly?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-pink hover:bg-primary-hv disabled:opacity-45 disabled:cursor-not-allowed',
  secondary:
    'bg-secondary text-white shadow-green hover:bg-secondary-hv disabled:opacity-45 disabled:cursor-not-allowed',
  outline:
    'bg-transparent text-secondary border-[1.5px] border-secondary hover:bg-secondary-bg disabled:opacity-45 disabled:cursor-not-allowed',
  ghost: 'bg-transparent text-fg hover:bg-sunken disabled:opacity-45 disabled:cursor-not-allowed',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-45 disabled:cursor-not-allowed',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3.5 text-sm',
  md: 'h-10 px-[18px]',
  lg: 'h-12 px-6 text-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', iconOnly = false, className = '', children, ...props },
  ref
) {
  const base = [
    'inline-flex items-center justify-center gap-2',
    'rounded-pill font-display font-semibold whitespace-nowrap',
    'active:scale-[.97] transition',
    iconOnly ? 'w-10 h-10 p-0' : SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button ref={ref} className={base} {...props}>
      {children}
    </button>
  )
})

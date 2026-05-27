type CardElevation = 'flat' | 'sm' | 'md'

interface CardProps {
  elevation?: CardElevation
  padding?: boolean
  className?: string
  children: React.ReactNode
}

const ELEVATION_CLASSES: Record<CardElevation, string> = {
  flat: 'border border-line',
  sm: 'border border-line shadow-sm',
  md: 'shadow-md',
}

export function Card({ elevation = 'sm', padding = true, className = '', children }: CardProps) {
  return (
    <div
      className={[
        'bg-surface rounded-xl',
        padding ? 'p-6' : '',
        ELEVATION_CLASSES[elevation],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

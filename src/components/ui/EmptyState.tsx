interface EmptyStateProps {
  /** SVG 路徑（outline icon，建議 28px）*/
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={[
        'bg-surface border border-line rounded-xl p-8 text-center flex flex-col items-center',
        className,
      ].join(' ')}
    >
      {icon && (
        <div className='w-16 h-16 rounded-pill bg-primary-bg text-primary inline-flex items-center justify-center mb-4'>
          {icon}
        </div>
      )}
      <h3 className='font-display font-bold text-lg text-fg'>{title}</h3>
      {description && <p className='text-fg-muted text-sm mt-1.5 max-w-xs'>{description}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  )
}

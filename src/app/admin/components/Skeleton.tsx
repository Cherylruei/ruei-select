interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: number | string
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background:
          'linear-gradient(90deg, var(--ink-100) 25%, var(--ink-200) 50%, var(--ink-100) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes skeleton-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  )
}

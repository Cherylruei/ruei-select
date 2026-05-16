import { Skeleton, SkeletonStyles } from '@/app/admin/components/Skeleton'

export default function SuppliersLoading() {
  return (
    <div>
      <SkeletonStyles />

      {/* 頁面標題區 */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton width={120} height={26} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={260} height={14} borderRadius={4} />
      </div>

      {/* 新增廠商表單骨架 */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: 2 }}>
          <Skeleton width={60} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton height={38} borderRadius={8} />
        </div>
        <div style={{ flex: 2 }}>
          <Skeleton width={40} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton height={38} borderRadius={8} />
        </div>
        <div style={{ flex: 2 }}>
          <Skeleton width={80} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton height={38} borderRadius={8} />
        </div>
        <Skeleton width={80} height={38} borderRadius={8} />
      </div>

      {/* 供應商列表骨架 */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px 24px',
              borderBottom: i < 3 ? '1px solid var(--neutral-100)' : undefined,
            }}
          >
            <Skeleton width={32} height={32} borderRadius='50%' />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width={`${120 + (i % 3) * 40}px`} height={14} borderRadius={4} />
              <Skeleton width={`${80 + (i % 2) * 60}px`} height={12} borderRadius={4} />
            </div>
            <Skeleton width={64} height={28} borderRadius={6} />
            <Skeleton width={64} height={28} borderRadius={6} />
          </div>
        ))}
      </div>
    </div>
  )
}

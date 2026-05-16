import { Skeleton, SkeletonStyles } from '@/app/admin/components/Skeleton'

export default function AdminLoading() {
  return (
    <div>
      <SkeletonStyles />

      {/* 頁面標題區 */}
      <div style={{ marginBottom: 28 }}>
        <Skeleton width={80} height={26} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={180} height={14} borderRadius={4} />
      </div>

      {/* 統計卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'white',
              border: '1px solid var(--neutral-200)',
              borderRadius: 12,
              padding: '20px 24px',
            }}
          >
            <Skeleton width={60} height={12} borderRadius={4} style={{ marginBottom: 12 }} />
            <Skeleton width={80} height={28} borderRadius={6} style={{ marginBottom: 8 }} />
            <Skeleton width={100} height={11} borderRadius={4} />
          </div>
        ))}
      </div>

      {/* 內容區 */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 12,
          padding: '24px',
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingBottom: 16,
              marginBottom: 16,
              borderBottom: i < 4 ? '1px solid var(--neutral-100)' : undefined,
            }}
          >
            <Skeleton width={36} height={36} borderRadius='50%' />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width={`${100 + (i % 3) * 50}px`} height={13} borderRadius={4} />
              <Skeleton width={`${60 + (i % 2) * 40}px`} height={11} borderRadius={4} />
            </div>
            <Skeleton width={60} height={22} borderRadius={20} />
          </div>
        ))}
      </div>
    </div>
  )
}

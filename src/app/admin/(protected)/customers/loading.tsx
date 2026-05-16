import { Skeleton, SkeletonStyles } from '@/app/admin/components/Skeleton'

export default function CustomersLoading() {
  return (
    <div>
      <SkeletonStyles />

      {/* 頁面標題區 */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton width={100} height={26} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={220} height={14} borderRadius={4} />
      </div>

      {/* Tab 骨架 */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--neutral-200)',
          marginBottom: 24,
        }}
      >
        {['待審核', '會員名單'].map((_, i) => (
          <Skeleton key={i} width={80} height={36} borderRadius={8} style={{ marginBottom: -1 }} />
        ))}
      </div>

      {/* 內容區骨架 */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 12,
          padding: '56px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Skeleton width={64} height={64} borderRadius='50%' />
        <Skeleton width={160} height={14} borderRadius={4} />
        <Skeleton width={220} height={12} borderRadius={4} />
      </div>
    </div>
  )
}

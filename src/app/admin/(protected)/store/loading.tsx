import { Skeleton, SkeletonStyles } from '@/app/admin/components/Skeleton'

export default function StoreLoading() {
  return (
    <div style={{ maxWidth: 680 }}>
      <SkeletonStyles />

      {/* 頁面標題區 */}
      <div style={{ marginBottom: 28 }}>
        <Skeleton width={100} height={26} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={200} height={14} borderRadius={4} />
      </div>

      {/* 頭像區 */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 12,
          padding: '24px 28px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <Skeleton width={80} height={80} borderRadius='50%' />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width={100} height={14} borderRadius={4} />
          <Skeleton width={160} height={12} borderRadius={4} />
          <Skeleton width={80} height={30} borderRadius={8} />
        </div>
      </div>

      {/* 表單骨架 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'white',
            border: '1px solid var(--neutral-200)',
            borderRadius: 12,
            padding: '20px 28px',
            marginBottom: 12,
          }}
        >
          <Skeleton width={80} height={13} borderRadius={4} style={{ marginBottom: 10 }} />
          <Skeleton height={40} borderRadius={8} />
        </div>
      ))}

      <Skeleton width={120} height={40} borderRadius={100} style={{ marginTop: 8 }} />
    </div>
  )
}

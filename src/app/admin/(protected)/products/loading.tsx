import { Skeleton, SkeletonStyles } from '@/app/admin/components/Skeleton'

export default function ProductsLoading() {
  return (
    <div>
      <SkeletonStyles />

      {/* 頁面標題 */}
      <div style={{ marginBottom: 24 }}>
        <Skeleton width={120} height={26} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={220} height={14} borderRadius={4} />
      </div>

      {/* 工具列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Skeleton width={140} height={36} borderRadius={8} />
          <Skeleton width={60} height={14} borderRadius={4} />
        </div>
        <Skeleton width={88} height={36} borderRadius={8} />
      </div>

      {/* 商品列表 */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--neutral-200)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* 表頭 */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '12px 16px',
            borderBottom: '1px solid var(--neutral-100)',
          }}
        >
          <Skeleton width={60} height={12} borderRadius={4} />
          <Skeleton width={120} height={12} borderRadius={4} style={{ flex: 1 }} />
          <Skeleton width={80} height={12} borderRadius={4} />
          <Skeleton width={100} height={12} borderRadius={4} />
          <Skeleton width={48} height={12} borderRadius={4} />
          <Skeleton width={100} height={12} borderRadius={4} />
        </div>

        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 16px',
              borderBottom: i < 4 ? '1px solid var(--neutral-100)' : undefined,
            }}
          >
            <Skeleton width={40} height={40} borderRadius={8} />
            <div style={{ flex: 1 }}>
              <Skeleton width={`${100 + (i % 4) * 30}px`} height={14} borderRadius={4} />
            </div>
            <Skeleton width={72} height={13} borderRadius={4} />
            <Skeleton width={90} height={13} borderRadius={4} />
            <Skeleton width={40} height={22} borderRadius={20} />
            <Skeleton width={36} height={20} borderRadius={10} />
            <div style={{ display: 'flex', gap: 6 }}>
              <Skeleton width={44} height={30} borderRadius={8} />
              <Skeleton width={44} height={30} borderRadius={8} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

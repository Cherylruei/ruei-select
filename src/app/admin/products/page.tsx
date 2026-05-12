export default function ProductsPage() {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--neutral-200)',
        borderRadius: 'var(--r-lg)',
        padding: '48px 24px',
        textAlign: 'center',
        color: 'var(--neutral-500)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-zen-maru-gothic)',
          fontSize: 15,
          color: 'var(--neutral-700)',
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        商品管理
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--neutral-400)', lineHeight: 1.7 }}>Sprint 2 實作</div>
    </div>
  )
}

export default function SuppliersPage() {
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
          width: 64,
          height: 64,
          margin: '0 auto 14px',
          borderRadius: '50%',
          background: 'var(--neutral-100)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--neutral-400)',
        }}
      >
        <svg
          viewBox='0 0 24 24'
          width='28'
          height='28'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
        >
          <path d='M3 7l9-4 9 4-9 4-9-4z' />
          <path d='M3 12l9 4 9-4' />
          <path d='M3 17l9 4 9-4' />
        </svg>
      </div>
      <div
        style={{
          fontFamily: 'var(--font-zen-maru-gothic)',
          fontSize: 15,
          color: 'var(--neutral-700)',
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        供應商管理
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--neutral-400)', lineHeight: 1.7 }}>
        開發中，即將推出
      </div>
    </div>
  )
}

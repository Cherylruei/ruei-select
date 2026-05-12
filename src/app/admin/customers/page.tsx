export default function CustomersPage() {
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
        <svg viewBox='0 0 24 24' width='28' height='28' fill='none' stroke='currentColor' strokeWidth='1.5'>
          <circle cx='9' cy='8' r='3.5' />
          <path d='M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6' />
          <circle cx='17' cy='9' r='2.5' />
          <path d='M15 14c2.5 0 6 1.5 6 5' />
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
        顧客管理
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--neutral-400)', lineHeight: 1.7 }}>
        開發中，即將推出
      </div>
    </div>
  )
}

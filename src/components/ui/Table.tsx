/* ── Table shell ─────────────────────────────────────────── */
interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div
      className={[
        'w-full bg-surface border border-line rounded-lg overflow-hidden',
        className,
      ].join(' ')}
    >
      <table className='w-full'>{children}</table>
    </div>
  )
}

/* ── Thead ───────────────────────────────────────────────── */
export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className='bg-ink-50'>{children}</tr>
    </thead>
  )
}

/* ── Th ──────────────────────────────────────────────────── */
interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode
}

export function Th({ children, className = '', ...props }: ThProps) {
  return (
    <th
      className={[
        'text-left px-4 py-3',
        'font-display font-bold text-xs uppercase tracking-wider text-fg-muted',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </th>
  )
}

/* ── Tbody ───────────────────────────────────────────────── */
export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>
}

/* ── Tr ──────────────────────────────────────────────────── */
interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
}

export function Tr({ children, className = '', ...props }: TrProps) {
  return (
    <tr
      className={['border-t border-line hover:bg-ink-50', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </tr>
  )
}

/* ── Td ──────────────────────────────────────────────────── */
interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode
  /** 數字欄（右對齊 + mono） */
  numeric?: boolean
  /** 訂單 ID 欄（mono + muted） */
  isId?: boolean
}

export function Td({ children, numeric, isId, className = '', ...props }: TdProps) {
  return (
    <td
      className={[
        'px-4 py-3.5 text-sm',
        numeric ? 'text-right font-mono font-semibold' : '',
        isId ? 'font-mono text-fg-muted' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </td>
  )
}

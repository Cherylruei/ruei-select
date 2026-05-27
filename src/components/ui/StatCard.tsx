/*
 * Tailwind JIT safelist — 以下 class 由 TONE_CLASSES / DELTA_CLASSES 動態組合，
 * 明確列出確保 Tailwind scanner 一定納入 CSS output：
 * bg-sakura-100 text-sakura-700
 * bg-forest-100 text-forest-700
 * bg-earth-100 text-earth-700
 * bg-primary-bg text-primary
 * text-success text-danger text-fg-muted
 */

type Tone = 'pink' | 'green' | 'earth' | 'accent'

interface DeltaProps {
  value: string
  trend: 'up' | 'down' | 'flat'
}

interface StatCardProps {
  /** Lucide icon 或任何 React node */
  icon: React.ReactNode
  /** 標籤文字，如「本月營業額」 */
  label: string
  /** 主數值，如 "NT$ 86,420" 或 14 */
  value: string | number
  /** 顯示在 value 後的單位，如「人」「筆」 */
  unit?: string
  /** 趨勢指示，如 { value: '12% MoM', trend: 'up' } */
  delta?: DeltaProps
  /** icon box 配色，預設 pink */
  tone?: Tone
  /** 右上角小字，如「6 月」 */
  meta?: string
  /** 卡片底部 slot，可放 mini bar chart、progress bar 等 */
  children?: React.ReactNode
  className?: string
}

const TONE_CLASSES: Record<Tone, string> = {
  pink: 'bg-sakura-100 text-sakura-700',
  green: 'bg-forest-100 text-forest-700',
  earth: 'bg-earth-100  text-earth-700',
  accent: 'bg-primary-bg text-primary',
}

const DELTA_CLASSES: Record<DeltaProps['trend'], string> = {
  up: 'text-success',
  down: 'text-danger',
  flat: 'text-fg-muted',
}

const DELTA_ARROW: Record<DeltaProps['trend'], string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

export function StatCard({
  icon,
  label,
  value,
  unit,
  delta,
  tone = 'pink',
  meta,
  children,
  className = '',
}: StatCardProps) {
  return (
    <div
      className={['bg-surface border border-line rounded-xl p-5 shadow-sm', className]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Icon + meta */}
      <div className='flex items-center justify-between'>
        <div
          className={[
            'w-10 h-10 rounded-md flex items-center justify-center',
            TONE_CLASSES[tone],
          ].join(' ')}
        >
          {icon}
        </div>
        {meta && <span className='font-mono text-[10px] text-fg-subtle'>{meta}</span>}
      </div>

      {/* Label */}
      <div className='text-sm text-fg-muted mt-3'>{label}</div>

      {/* Value */}
      <div className='font-display font-bold text-2xl mt-1'>
        {value}
        {unit && <span className='font-mono text-sm text-fg-subtle ml-1'>{unit}</span>}
      </div>

      {/* Delta */}
      {delta && (
        <div className={['font-mono text-xs mt-2', DELTA_CLASSES[delta.trend]].join(' ')}>
          {DELTA_ARROW[delta.trend]} {delta.value}
        </div>
      )}

      {/* Extra slot（mini chart、progress bar…） */}
      {children}
    </div>
  )
}

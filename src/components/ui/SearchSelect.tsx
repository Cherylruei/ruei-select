'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchSelectOption {
  value: string
  /** 主要顯示文字，如「陳小美」或「棉麻寬褲」 */
  label: string
  /** 次要資訊，如「LINE: @cherry」；搜尋時也會比對這欄 */
  sublabel?: string
  /** 顯示於 avatar 的文字首字（顧客款） */
  avatar?: string
  /** 商品縮圖 URL（商品款，優先於 avatar） */
  imageUrl?: string
}

export interface SearchSelectProps {
  options: SearchSelectOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  emptyMessage?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
  /** 對應 <label> 的 id，供 htmlFor 綁定 */
  id?: string
}

// ── Avatar 顏色（用 value 雜湊輪換）─────────────────────────────────────────

const AVATAR_BG_CLASSES = ['bg-sakura-300', 'bg-forest-400', 'bg-earth-400'] as const

function avatarBgClass(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_BG_CLASSES[Math.abs(h) % AVATAR_BG_CLASSES.length]
}

// ── 子元件：Avatar ────────────────────────────────────────────────────────────

function OptionAvatar({ opt, size = 'md' }: { opt: SearchSelectOption; size?: 'sm' | 'md' }) {
  if (opt.imageUrl) {
    // 商品款：圓角方形縮圖
    const dim = size === 'sm' ? 'w-6 h-6 rounded-sm' : 'w-10 h-10 rounded-md'
    return (
      <div className={`${dim} bg-ink-100 shrink-0 overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={opt.imageUrl} alt='' className='w-full h-full object-cover' />
      </div>
    )
  }
  if (opt.avatar) {
    // 顧客款：圓形 avatar
    const dim = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
    return (
      <div
        className={`${dim} ${avatarBgClass(opt.value)} rounded-pill text-white font-display font-bold flex items-center justify-center shrink-0`}
      >
        {opt.avatar}
      </div>
    )
  }
  // Fallback placeholder
  const dim = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8'
  return <div className={`${dim} rounded-pill bg-sunken shrink-0`} />
}

// ── 主元件 ─────────────────────────────────────────────────────────────────────

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = '搜尋…',
  emptyMessage = '找不到符合的結果',
  size = 'md',
  disabled = false,
  className = '',
  id,
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIdx, setHighlightedIdx] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const selectedOption = options.find((o) => o.value === value) ?? null

  // ── 篩選 ──────────────────────────────────────────────────────────────────

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.toLowerCase()
        return o.label.toLowerCase().includes(q) || (o.sublabel?.toLowerCase().includes(q) ?? false)
      })
    : options

  // ── Open / Close ──────────────────────────────────────────────────────────

  const openDropdown = useCallback(() => {
    if (disabled) return
    setIsOpen(true)
    setQuery('')
    setHighlightedIdx(0)
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [disabled])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  // ── 點選 / 清除 ───────────────────────────────────────────────────────────

  const selectOption = useCallback(
    (opt: SearchSelectOption) => {
      onChange(opt.value)
      closeDropdown()
    },
    [onChange, closeDropdown]
  )

  const clearSelection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(null)
    },
    [onChange]
  )

  // ── 點外面關閉 ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) closeDropdown()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, closeDropdown])

  // ── 自動捲動到高亮選項 ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const item = listRef.current.children[highlightedIdx] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIdx, isOpen])

  // 重置高亮直接在 input onChange 裡做（避免 effect 裡 setState 造成 cascading render）

  // ── 鍵盤（觸發器 div） ────────────────────────────────────────────────────

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (['Enter', ' ', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
      openDropdown()
    }
  }

  // ── 鍵盤（搜尋框 input） ──────────────────────────────────────────────────

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const total = filtered.length
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIdx((i) => (i + 1) % Math.max(total, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIdx((i) => (i - 1 + Math.max(total, 1)) % Math.max(total, 1))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlightedIdx]) selectOption(filtered[highlightedIdx])
        break
      case 'Escape':
        e.preventDefault()
        closeDropdown()
        break
      case 'Tab':
        closeDropdown()
        break
    }
  }

  // ── 尺寸 ──────────────────────────────────────────────────────────────────

  const triggerHeight = size === 'sm' ? 'h-8 text-sm' : 'h-10'

  return (
    <div ref={containerRef} className={['relative', className].filter(Boolean).join(' ')}>
      {/* ── 觸發器（styled like Input）── */}
      <div
        id={id}
        role='combobox'
        aria-expanded={isOpen}
        aria-haspopup='listbox'
        aria-controls={isOpen ? listId : undefined}
        tabIndex={disabled ? -1 : 0}
        onClick={isOpen ? closeDropdown : openDropdown}
        onKeyDown={handleTriggerKeyDown}
        className={[
          'w-full flex items-center gap-2 px-3.5 rounded-md border-[1.5px] transition',
          triggerHeight,
          isOpen
            ? 'border-primary shadow-[0_0_0_4px_var(--c-primary-bg)] bg-surface'
            : 'border-line bg-surface hover:border-ink-400',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* 已選項目的 avatar（收起時才顯示） */}
        {selectedOption && <OptionAvatar opt={selectedOption} size='sm' />}

        {/* 已選標籤 / 佔位文字 */}
        <span
          className={[
            'flex-1 min-w-0 truncate text-sm',
            selectedOption ? 'text-fg font-medium' : 'text-fg-subtle',
          ].join(' ')}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {/* × 清除按鈕（有選取時才顯示） */}
        {selectedOption && !disabled && (
          <button
            type='button'
            onClick={clearSelection}
            aria-label='清除選取'
            className='w-5 h-5 rounded-pill flex items-center justify-center text-fg-subtle hover:bg-ink-200 hover:text-fg shrink-0 transition'
          >
            <svg
              width='10'
              height='10'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.5'
              strokeLinecap='round'
              aria-hidden='true'
            >
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        )}

        {/* 展開/收起 chevron */}
        <svg
          width='14'
          height='14'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          aria-hidden='true'
          className={[
            'text-fg-subtle shrink-0 transition-transform duration-150',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
        >
          <path d='M6 9l6 6 6-6' />
        </svg>
      </div>

      {/* ── Dropdown 面板 ── */}
      {isOpen && (
        <div
          className='absolute left-0 right-0 mt-1 bg-surface rounded-md shadow-md border border-line z-50'
          role='presentation'
        >
          {/* 搜尋框 */}
          <div className='px-2.5 pt-2 pb-1.5 border-b border-line'>
            <div className='flex items-center gap-2 h-8 px-2.5 rounded-md bg-ink-50 border border-line focus-within:border-primary focus-within:bg-surface transition'>
              <svg
                width='13'
                height='13'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='1.8'
                strokeLinecap='round'
                className='text-fg-subtle shrink-0'
                aria-hidden='true'
              >
                <circle cx='11' cy='11' r='6' />
                <path d='M20 20l-4-4' />
              </svg>
              <input
                ref={searchInputRef}
                type='text'
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHighlightedIdx(0)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={placeholder}
                autoComplete='off'
                aria-autocomplete='list'
                aria-controls={listId}
                aria-activedescendant={
                  filtered[highlightedIdx] ? `${listId}-opt-${highlightedIdx}` : undefined
                }
                className='flex-1 min-w-0 bg-transparent outline-none text-sm text-fg placeholder:text-fg-subtle'
              />
            </div>
          </div>

          {/* 選項清單 */}
          <ul id={listId} ref={listRef} role='listbox' className='max-h-60 overflow-auto py-1'>
            {filtered.length === 0 ? (
              <li className='text-fg-muted text-sm py-6 text-center select-none'>{emptyMessage}</li>
            ) : (
              filtered.map((opt, idx) => {
                const isHighlighted = idx === highlightedIdx
                const isSelected = opt.value === value
                return (
                  <li
                    key={opt.value}
                    id={`${listId}-opt-${idx}`}
                    role='option'
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    onMouseDown={(e) => {
                      // preventDefault 避免 blur search input
                      e.preventDefault()
                      selectOption(opt)
                    }}
                    className={[
                      'flex items-center gap-3 px-3 py-2 cursor-pointer text-sm select-none',
                      isSelected
                        ? 'bg-primary-bg text-primary-hv'
                        : isHighlighted
                          ? 'bg-sunken text-fg'
                          : 'text-fg',
                    ].join(' ')}
                  >
                    {/* Avatar / 縮圖 */}
                    <OptionAvatar opt={opt} size='md' />

                    {/* 文字 */}
                    <div className='flex-1 min-w-0'>
                      <div className='font-semibold text-sm truncate leading-snug'>{opt.label}</div>
                      {opt.sublabel && (
                        <div className='font-mono text-xs text-fg-subtle truncate mt-0.5'>
                          {opt.sublabel}
                        </div>
                      )}
                    </div>

                    {/* 已選 checkmark */}
                    {isSelected && (
                      <svg
                        width='14'
                        height='14'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2.5'
                        strokeLinecap='round'
                        className='text-primary shrink-0'
                        aria-hidden='true'
                      >
                        <path d='M5 12l5 5 9-9' />
                      </svg>
                    )}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

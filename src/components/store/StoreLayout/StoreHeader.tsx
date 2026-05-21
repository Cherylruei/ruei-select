import Image from 'next/image'

interface StoreHeaderProps {
  name: string
  avatarUrl: string | null
}

export default function StoreHeader({ name, avatarUrl }: StoreHeaderProps) {
  return (
    <header className='sticky top-0 z-10 bg-white border-b border-(--neutral-200) shadow-(--sh-xs)'>
      <div className='flex items-center gap-3 px-4 h-14'>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={36}
            height={36}
            className='w-9 h-9 rounded-full object-cover ring-1 ring-(--neutral-200)'
          />
        ) : (
          <div className='w-9 h-9 rounded-full bg-linear-to-br from-(--forest-400) to-(--forest-base) flex items-center justify-center shrink-0'>
            <svg
              viewBox='0 0 24 24'
              width='18'
              height='18'
              fill='none'
              stroke='white'
              strokeWidth='2'
              aria-hidden='true'
            >
              <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
              <line x1='3' y1='6' x2='21' y2='6' />
              <path d='M16 10a4 4 0 01-8 0' />
            </svg>
          </div>
        )}
        <span
          className='text-[15px] font-bold text-(--neutral-800) truncate'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {name}
        </span>
      </div>
    </header>
  )
}

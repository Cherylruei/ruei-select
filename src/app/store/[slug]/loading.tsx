export default function StoreLoading() {
  return (
    <div className='px-4 pt-6 grid grid-cols-2 gap-3'>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className='bg-white rounded-xl overflow-hidden shadow-[var(--sh-xs)]'>
          <div className='aspect-square bg-[var(--neutral-100)] animate-pulse' />
          <div className='p-3 flex flex-col gap-2'>
            <div className='h-3 w-full rounded bg-[var(--neutral-100)] animate-pulse' />
            <div className='h-3 w-2/3 rounded bg-[var(--neutral-100)] animate-pulse' />
            <div className='h-3 w-1/2 rounded bg-[var(--neutral-100)] animate-pulse' />
          </div>
        </div>
      ))}
    </div>
  )
}

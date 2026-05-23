export default function OrdersLoading() {
  return (
    <div className='px-4 pt-4'>
      <div className='flex items-center justify-between mb-4'>
        <div className='h-4 w-20 rounded bg-[var(--neutral-100)] animate-pulse' />
        <div className='h-8 w-24 rounded-lg bg-[var(--neutral-100)] animate-pulse' />
      </div>
      <div className='flex flex-col gap-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className='bg-white rounded-xl p-3 flex gap-3 shadow-[var(--sh-xs)]'>
            <div className='w-16 h-16 rounded-lg bg-[var(--neutral-100)] animate-pulse flex-shrink-0' />
            <div className='flex-1 flex flex-col gap-2 justify-center'>
              <div className='h-3 w-3/4 rounded bg-[var(--neutral-100)] animate-pulse' />
              <div className='h-3 w-1/2 rounded bg-[var(--neutral-100)] animate-pulse' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

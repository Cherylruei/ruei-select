// TODO: awaiting design — /store/{slug}/orders/checkout mockup 尚未繪製
// 請設計師補充 mockup 後再實作完整結單頁面

export default function CheckoutPage() {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] px-5 text-center'>
      <div className='w-16 h-16 rounded-full bg-sunken flex items-center justify-center mb-4'>
        <svg
          viewBox='0 0 24 24'
          width='28'
          height='28'
          fill='none'
          stroke='var(--border-strong)'
          strokeWidth='1.5'
          aria-hidden='true'
        >
          <rect x='1' y='3' width='15' height='13' rx='1' />
          <path d='M16 8h4l3 3v5h-7V8z' />
          <circle cx='5.5' cy='18.5' r='2.5' />
          <circle cx='18.5' cy='18.5' r='2.5' />
        </svg>
      </div>
      <p className='text-sm font-display font-bold text-fg mb-2'>結單頁面即將推出</p>
      <p className='text-xs text-fg-muted'>設計稿補充後即可實作</p>
    </div>
  )
}

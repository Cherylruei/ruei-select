'use client'

import { useEffect, useRef } from 'react'

interface ModalVariant {
  specs: Record<string, string>
  price: number
}

interface OrderConfirmModalProps {
  productName: string
  variant: ModalVariant
  quantity: number
  onConfirm: () => Promise<void>
  onClose: () => void
  isSubmitting: boolean
}

function formatSpecs(specs: Record<string, string>) {
  return Object.entries(specs)
    .map(([k, v]) => `${k}：${v}`)
    .join('｜')
}

export default function OrderConfirmModal({
  productName,
  variant,
  quantity,
  onConfirm,
  onClose,
  isSubmitting,
}: OrderConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current && !isSubmitting) onClose()
  }

  const subtotal = variant.price * quantity

  return (
    <div
      ref={overlayRef}
      className='fixed inset-0 z-50 bg-ink-800/45 flex items-end justify-center'
      onClick={handleOverlayClick}
      role='dialog'
      aria-modal='true'
      aria-label='確認下單'
    >
      <div className='w-full max-w-[500px] bg-surface rounded-t-2xl px-5 pt-5 pb-8 animate-in slide-in-from-bottom duration-200'>
        {/* 拖曳把手 */}
        <div className='w-10 h-1 rounded-pill bg-line mx-auto mb-5' />

        <h2 className='font-display text-md font-bold text-fg mb-4'>確認下單</h2>

        {/* 商品資訊 */}
        <div className='bg-sunken rounded-xl p-4 mb-4 flex flex-col gap-2'>
          <p className='text-sm font-semibold text-fg line-clamp-2'>{productName}</p>
          {Object.keys(variant.specs).length > 0 && (
            <p className='text-sm text-fg-muted'>{formatSpecs(variant.specs)}</p>
          )}
          <div className='flex items-center justify-between pt-1 border-t border-line'>
            <span className='text-sm text-fg-muted'>
              {quantity} × NT$ {variant.price.toLocaleString()}
            </span>
            <span className='text-sm font-bold text-primary font-mono'>
              NT$ {subtotal.toLocaleString()}
            </span>
          </div>
        </div>

        <p className='text-xs text-fg-subtle leading-relaxed mb-5'>
          下單即購買，確認後商家會開始採買此商品。
        </p>

        {/* 按鈕 */}
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            className='flex-1 py-3 rounded-pill border border-line-strong text-sm font-display font-semibold text-fg-muted hover:bg-sunken disabled:opacity-40 transition'
          >
            取消
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isSubmitting}
            className='flex-1 py-3 rounded-pill bg-primary hover:bg-primary-hv text-white text-sm font-display font-semibold disabled:opacity-50 transition shadow-pink active:scale-[.97]'
            data-testid='confirm-order-btn'
          >
            {isSubmitting ? '處理中…' : '確認下單'}
          </button>
        </div>
      </div>
    </div>
  )
}

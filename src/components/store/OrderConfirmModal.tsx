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
      className='fixed inset-0 z-50 bg-black/40 flex items-end justify-center'
      onClick={handleOverlayClick}
      role='dialog'
      aria-modal='true'
      aria-label='確認下單'
    >
      <div className='w-full max-w-[500px] bg-white rounded-t-2xl px-5 pt-5 pb-8 animate-in slide-in-from-bottom duration-200'>
        {/* 拖曳把手 */}
        <div className='w-10 h-1 rounded-full bg-[var(--neutral-200)] mx-auto mb-5' />

        <h2
          className='text-[16px] font-bold text-[var(--neutral-800)] mb-4'
          style={{ fontFamily: 'var(--font-display)' }}
        >
          確認下單
        </h2>

        {/* 商品資訊 */}
        <div className='bg-[var(--neutral-50)] rounded-xl p-4 mb-4 flex flex-col gap-2'>
          <p className='text-[14px] font-semibold text-[var(--neutral-800)] line-clamp-2'>
            {productName}
          </p>
          {Object.keys(variant.specs).length > 0 && (
            <p className='text-[13px] text-[var(--neutral-500)]'>{formatSpecs(variant.specs)}</p>
          )}
          <div className='flex items-center justify-between pt-1 border-t border-[var(--neutral-200)]'>
            <span className='text-[13px] text-[var(--neutral-500)]'>
              {quantity} × NT$ {variant.price.toLocaleString()}
            </span>
            <span className='text-[15px] font-bold text-[var(--sakura-base)]'>
              NT$ {subtotal.toLocaleString()}
            </span>
          </div>
        </div>

        <p className='text-[12px] text-[var(--neutral-400)] leading-relaxed mb-5'>
          下單即購買，確認後商家會開始採買此商品。
        </p>

        {/* 按鈕 */}
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            className='flex-1 py-3 rounded-full border border-[var(--neutral-300)] text-[14px] font-semibold text-[var(--neutral-600)] hover:bg-[var(--neutral-100)] disabled:opacity-40 transition-colors'
          >
            取消
          </button>
          <button
            type='button'
            onClick={onConfirm}
            disabled={isSubmitting}
            className='flex-1 py-3 rounded-full bg-[var(--sakura-base)] hover:bg-[var(--sakura-deep)] text-white text-[14px] font-semibold disabled:opacity-50 transition-colors shadow-[0_4px_14px_rgba(232,58,106,.32)]'
            data-testid='confirm-order-btn'
          >
            {isSubmitting ? '處理中…' : '確認下單'}
          </button>
        </div>
      </div>
    </div>
  )
}

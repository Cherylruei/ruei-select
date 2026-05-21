import Image from 'next/image'
import Link from 'next/link'
import type { StoreProductSummary } from '@/types'

interface ProductCardProps {
  product: StoreProductSummary
  slug: string
  keyword?: string
}

function highlightKeyword(text: string, keyword: string) {
  if (!keyword) return text
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className='bg-[var(--sakura-100)] text-[var(--sakura-deep)] rounded-sm px-0.5'>
        {text.slice(idx, idx + keyword.length)}
      </mark>
      {text.slice(idx + keyword.length)}
    </>
  )
}

function formatPrice(priceRange: StoreProductSummary['priceRange']) {
  if (priceRange.min === priceRange.max || priceRange.max === 0) {
    return `NT$ ${priceRange.min.toLocaleString()}`
  }
  return `NT$ ${priceRange.min.toLocaleString()} ~ ${priceRange.max.toLocaleString()}`
}

export default function ProductCard({ product, slug, keyword = '' }: ProductCardProps) {
  return (
    <Link
      href={`/store/${slug}/products/${product.id}`}
      className='block bg-white rounded-xl overflow-hidden shadow-[var(--sh-xs)] hover:shadow-[var(--sh-sm)] transition-shadow active:scale-[.98]'
      data-testid='product-card'
    >
      <div className='aspect-square bg-[var(--neutral-100)] relative overflow-hidden'>
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.name}
            fill
            className='object-cover'
            sizes='(max-width: 768px) 50vw, 33vw'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center'>
            <svg
              viewBox='0 0 24 24'
              width='32'
              height='32'
              fill='none'
              stroke='var(--neutral-300)'
              strokeWidth='1.5'
              aria-hidden='true'
            >
              <rect x='3' y='3' width='18' height='18' rx='2' />
              <circle cx='8.5' cy='8.5' r='1.5' />
              <path d='M21 15l-5-5L5 21' />
            </svg>
          </div>
        )}
      </div>
      <div className='p-3 flex flex-col gap-1'>
        <p className='text-[13px] font-medium text-[var(--neutral-800)] leading-snug line-clamp-2'>
          {keyword ? highlightKeyword(product.name, keyword) : product.name}
        </p>
        <p className='text-[12px] font-semibold text-[var(--sakura-base)] mt-0.5'>
          {formatPrice(product.priceRange)}
        </p>
      </div>
    </Link>
  )
}

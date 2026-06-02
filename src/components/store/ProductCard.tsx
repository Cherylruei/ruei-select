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
      <mark className='bg-primary-bg rounded-sm px-0.5' style={{ color: 'var(--c-primary-hv)' }}>
        {text.slice(idx, idx + keyword.length)}
      </mark>
      {text.slice(idx + keyword.length)}
    </>
  )
}

function formatPrice(priceRange: StoreProductSummary['priceRange']) {
  if (priceRange.min === priceRange.max || priceRange.max === 0) {
    return priceRange.min.toLocaleString()
  }
  return `${priceRange.min.toLocaleString()} ~ ${priceRange.max.toLocaleString()}`
}

export default function ProductCard({ product, slug, keyword = '' }: ProductCardProps) {
  return (
    <Link
      href={`/store/${slug}/products/${product.id}`}
      className='group block bg-surface rounded-xl overflow-hidden shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 active:scale-[.98]'
      style={{ border: '1px solid #f0d9cb' }}
      data-testid='product-card'
    >
      {/* Image area */}
      <div
        className='aspect-square bg-sunken relative overflow-hidden'
        style={{ borderBottom: '1px solid #f7e5d8' }}
      >
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.name}
            fill
            className='object-cover'
            sizes='(max-width: 1024px) 50vw, 25vw'
          />
        ) : (
          <div
            className='w-full h-full'
            style={{
              background:
                'repeating-linear-gradient(135deg, #FFE9E0, #FFE9E0 8px, #FFD9E4 8px, #FFD9E4 16px)',
            }}
            aria-hidden='true'
          />
        )}
      </div>

      {/* Info */}
      <div className='p-3 lg:p-3.5'>
        <p className='font-display font-bold text-sm text-fg leading-snug line-clamp-2 min-h-[2.6em]'>
          {keyword ? highlightKeyword(product.name, keyword) : product.name}
        </p>
        {product.category && (
          <div className='mt-1.5'>
            <span
              className='inline-flex items-center h-5 px-2 rounded-pill font-display font-semibold text-[10px] whitespace-nowrap'
              style={{ background: '#F5EBDB', color: '#6B502C', border: '1px solid #E0CCAA' }}
            >
              {product.category}
            </span>
          </div>
        )}
        <div
          className='flex items-baseline justify-between mt-2.5 pt-2.5'
          style={{ borderTop: '1px solid #f7e5d8' }}
        >
          <span className='font-mono text-[10px] text-fg-subtle'>NT$</span>
          <span
            className='font-display font-bold text-xl leading-none'
            style={{ color: '#D94466' }}
          >
            {formatPrice(product.priceRange)}
          </span>
        </div>
      </div>
    </Link>
  )
}

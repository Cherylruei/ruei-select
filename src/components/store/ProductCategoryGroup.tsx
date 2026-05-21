import type { StoreProductSummary } from '@/types'
import ProductCard from './ProductCard'

interface ProductCategoryGroupProps {
  category: string
  products: StoreProductSummary[]
  slug: string
  keyword?: string
}

export default function ProductCategoryGroup({
  category,
  products,
  slug,
  keyword = '',
}: ProductCategoryGroupProps) {
  return (
    <section>
      <div className='flex items-center gap-3 mb-3'>
        <h2 className='text-[13px] font-semibold text-[var(--neutral-600)] tracking-wide'>
          {category}
        </h2>
        <div className='flex-1 h-px bg-[var(--neutral-200)]' />
        <span className='text-[11px] text-[var(--neutral-400)]'>{products.length} 件</span>
      </div>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} slug={slug} keyword={keyword} />
        ))}
      </div>
    </section>
  )
}

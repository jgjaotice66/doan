import { useAddToCartAction } from '../features/cart/useAddToCartAction'
import { cn } from '../utils/cn'
import ErrorState from './ErrorState'
import ProductCard, { ProductCardSkeleton } from './ProductCard'

/**
 * Lưới sản phẩm với đủ trạng thái: đang tải (skeleton) · lỗi (thử lại) · rỗng · có dữ liệu.
 */
export default function ProductGrid({
  products,
  isPending,
  error,
  onRetry,
  skeletonCount = 8,
  empty = 'Chưa có sản phẩm nào.',
  stale = false,
  className = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}) {
  const { addToCart, pendingProductId } = useAddToCartAction()

  if (error && !products?.length) return <ErrorState error={error} onRetry={onRetry} />

  const gridClass = cn('grid gap-3 sm:gap-4', className)

  if (isPending) {
    return (
      <div className={gridClass} aria-busy="true" aria-label="Đang tải sản phẩm">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (!products?.length) {
    return <div className="rounded-card border border-dashed border-line px-4 py-12 text-center text-muted">{empty}</div>
  }

  return (
    // stale: đang tải kết quả mới, tạm làm mờ kết quả cũ thay vì nháy trắng.
    <ul className={cn(gridClass, 'transition-opacity', stale && 'opacity-50')} aria-busy={stale || undefined}>
      {products.map((product) => (
        <li key={product.id} className="flex">
          <ProductCard
            product={product}
            onAddToCart={addToCart}
            adding={pendingProductId === product.id}
          />
        </li>
      ))}
    </ul>
  )
}

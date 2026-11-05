import { Heart, ImageBroken, ShoppingCartSimple, SpinnerGap } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { cn } from '../utils/cn'
import { discountPercent } from '../utils/product'
import Price from './Price'
import Badge from './ui/Badge'
import Card from './ui/Card'
import Skeleton from './ui/Skeleton'

/**
 * Thẻ sản phẩm cho lưới danh sách. Nhận đúng dạng ProductResource từ API.
 * Cả thẻ là một link; nút yêu thích / thêm giỏ nằm trên cùng nên bấm không bị mở trang chi tiết.
 */
export default function ProductCard({ product, wishlisted = false, onToggleWishlist, onAddToCart, adding = false }) {
  const discount = discountPercent(product.price, product.sale_price)
  const soldOut = !product.in_stock

  return (
    <Card as="article" interactive className="group relative flex w-full flex-col overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-raised">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            loading="lazy"
            width="400"
            height="400"
            className={cn(
              'size-full object-cover transition-transform duration-300 ease-out-soft group-hover:scale-105',
              soldOut && 'opacity-50 grayscale',
            )}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-subtle">
            <ImageBroken aria-hidden className="size-10" />
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {discount && <Badge variant="primary">-{discount}%</Badge>}
          {soldOut ? (
            <Badge variant="danger">Hết hàng</Badge>
          ) : (
            product.low_stock && <Badge variant="warning">Sắp hết</Badge>
          )}
        </div>
      </div>

      {onToggleWishlist && (
        <button
          type="button"
          onClick={() => onToggleWishlist(product)}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? `Bỏ ${product.name} khỏi yêu thích` : `Thêm ${product.name} vào yêu thích`}
          className={cn(
            'absolute right-2 top-2 z-10 inline-flex size-11 cursor-pointer items-center justify-center rounded-full',
            'bg-bg/80 backdrop-blur transition-colors hover:text-primary',
            wishlisted ? 'text-primary' : 'text-fg',
          )}
        >
          <Heart aria-hidden weight={wishlisted ? 'fill' : 'regular'} className="size-5" />
        </button>
      )}

      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.brand && (
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-soft">{product.brand.name}</p>
        )}
        <h3 className="line-clamp-2 font-sans text-sm font-semibold leading-snug text-fg">
          {/* after:absolute phủ link lên cả thẻ, vẫn giữ 1 link duy nhất cho trình đọc màn hình */}
          <Link to={`/products/${product.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Price price={product.price} salePrice={product.sale_price} size="sm" />
          {onAddToCart && !soldOut && (
            // z-10 + relative: nằm trên lớp link phủ cả thẻ nên bấm được riêng.
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={adding}
              aria-busy={adding || undefined}
              aria-label={`Thêm ${product.name} vào giỏ`}
              className={cn(
                'relative z-10 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-control',
                'bg-raised text-fg transition-colors hover:bg-primary hover:text-on-primary disabled:cursor-wait disabled:opacity-60',
              )}
            >
              {adding ? (
                <SpinnerGap aria-hidden className="size-5 animate-spin" />
              ) : (
                <ShoppingCartSimple aria-hidden className="size-5" />
              )}
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}

/**
 * Khung giữ chỗ cùng kích thước ProductCard khi đang tải.
 */
export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-3 h-5 w-1/2" />
      </div>
    </Card>
  )
}

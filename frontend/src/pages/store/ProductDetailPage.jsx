import { CaretRight, CheckCircle, Heart, ShoppingCartSimple, Warning, XCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import ErrorState from '../../components/ErrorState'
import Price from '../../components/Price'
import ProductGallery from '../../components/ProductGallery'
import ProductGrid from '../../components/ProductGrid'
import ShopPolicies from '../../components/ShopPolicies'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import QuantityInput from '../../components/ui/QuantityInput'
import Skeleton from '../../components/ui/Skeleton'
import { useAddToCartAction } from '../../features/cart/useAddToCartAction'
import { useProduct } from '../../features/catalog/queries'
import { useWishlistAction } from '../../features/wishlist/queries'
import { cn } from '../../utils/cn'
import { ageLabel, discountPercent } from '../../utils/product'
import NotFoundPage from '../NotFoundPage'

function Breadcrumb({ product }) {
  const items = [
    { label: 'Trang chủ', to: '/' },
    { label: 'Sản phẩm', to: '/products' },
    product.category && { label: product.category.name, to: `/products?category=${product.category.slug}` },
  ].filter(Boolean)

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {items.map((item) => (
          <li key={item.to} className="flex items-center gap-1">
            <Link to={item.to} className="hover:text-primary hover:underline">
              {item.label}
            </Link>
            <CaretRight aria-hidden className="size-3.5 text-subtle" />
          </li>
        ))}
        <li aria-current="page" className="line-clamp-1 text-fg">
          {product.name}
        </li>
      </ol>
    </nav>
  )
}

function StockStatus({ product }) {
  if (!product.in_stock) {
    return (
      <p className="flex items-center gap-2 font-semibold text-danger">
        <XCircle aria-hidden weight="fill" className="size-5" />
        Hết hàng
      </p>
    )
  }
  if (product.low_stock) {
    return (
      <p className="flex items-center gap-2 font-semibold text-warning">
        <Warning aria-hidden weight="fill" className="size-5" />
        Sắp hết – chỉ còn <span className="tabular">{product.stock}</span> sản phẩm
      </p>
    )
  }
  return (
    <p className="flex items-center gap-2 font-semibold text-success">
      <CheckCircle aria-hidden weight="fill" className="size-5" />
      Còn hàng
    </p>
  )
}

/**
 * true khi phần tử đã bị cuộn lên khuất phía trên màn hình (không tính lúc nó còn ở dưới, chưa cuộn tới).
 * Dùng sự kiện scroll thay vì IntersectionObserver: vuốt nhanh có thể nhảy thẳng từ "dưới màn hình"
 * lên "trên màn hình" mà không lúc nào giao khung nhìn → observer không báo.
 */
function useScrolledPast(ref) {
  const [past, setPast] = useState(false)

  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const el = ref.current
      if (el) setPast(el.getBoundingClientRect().bottom < 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check)
    }
    check()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref])

  return past
}

/**
 * Thanh mua hàng dính đáy màn hình (chỉ điện thoại), hiện khi nút "Thêm vào giỏ" chính đã cuộn khuất.
 * Gắn class lên <html> để cụm nút nổi và toast đẩy lên trên thanh này (xem index.css).
 */
function StickyBuyBar({ product, onAddToCart, loading }) {
  useEffect(() => {
    document.documentElement.classList.add('has-sticky-cta')
    return () => document.documentElement.classList.remove('has-sticky-cta')
  }, [])

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 animate-toast-in border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted">{product.name}</p>
          <Price price={product.price} salePrice={product.sale_price} size="sm" />
        </div>
        <Button onClick={onAddToCart} loading={loading}>
          <ShoppingCartSimple aria-hidden className="size-5" />
          Thêm vào giỏ
        </Button>
      </div>
    </div>
  )
}

/**
 * Khu mua hàng: số lượng + Thêm vào giỏ + Yêu thích.
 */
function PurchasePanel({ product }) {
  const { addToCart, isPending } = useAddToCartAction()
  const { isWishlisted, toggleWishlist } = useWishlistAction()
  const [quantity, setQuantity] = useState(1)
  const buyRowRef = useRef(null)
  const scrolledPast = useScrolledPast(buyRowRef)
  const soldOut = !product.in_stock
  const liked = isWishlisted(product.id, product.is_wishlisted)

  const onAddToCart = () => addToCart(product, quantity)
  const onToggleWishlist = () => toggleWishlist(product)

  return (
    <div className="space-y-4">
      {scrolledPast && !soldOut && <StickyBuyBar product={product} onAddToCart={onAddToCart} loading={isPending} />}
      <QuantityInput value={quantity} onChange={setQuantity} max={Math.max(1, product.stock)} disabled={soldOut} />
      <div ref={buyRowRef} className="flex gap-3">
        <Button size="lg" className="flex-1" onClick={onAddToCart} disabled={soldOut} loading={isPending}>
          <ShoppingCartSimple aria-hidden className="size-5" />
          {soldOut ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
        </Button>
        <Button
          size="icon"
          variant="outline"
          className={cn('size-12', liked && 'border-primary text-primary')}
          onClick={onToggleWishlist}
          aria-pressed={liked}
          aria-label={liked ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
        >
          <Heart aria-hidden weight={liked ? 'fill' : 'regular'} className="size-5" />
        </Button>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12" aria-busy="true" aria-label="Đang tải sản phẩm">
      <Skeleton className="aspect-square rounded-card" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}

export default function ProductDetailPage() {
  const { slug } = useParams()
  const { data: product, isPending, error, refetch } = useProduct(slug)

  if (error?.response?.status === 404) return <NotFoundPage />

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {isPending ? (
        <DetailSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="Không tải được sản phẩm" />
      ) : (
        <>
          <title>{`${product.name} – Toy Store`}</title>
          <Breadcrumb product={product} />

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <ProductGallery key={product.id} images={product.images} name={product.name} />

            <div className="space-y-6">
              <div className="space-y-2">
                {product.brand && (
                  <Link
                    to={`/products?brand=${product.brand.slug}`}
                    className="text-sm font-semibold uppercase tracking-wider text-accent-soft hover:underline"
                  >
                    {product.brand.name}
                  </Link>
                )}
                <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{product.name}</h1>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Price price={product.price} salePrice={product.sale_price} size="lg" />
                {discountPercent(product.price, product.sale_price) && (
                  <Badge variant="primary">-{discountPercent(product.price, product.sale_price)}%</Badge>
                )}
              </div>

              <StockStatus product={product} />

              <PurchasePanel key={product.id} product={product} />

              <ShopPolicies />

              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-card border border-line bg-surface p-4 text-sm">
                <dt className="text-muted">Mã SP</dt>
                <dd className="font-medium text-fg tabular">{product.sku}</dd>
                {product.category && (
                  <>
                    <dt className="text-muted">Danh mục</dt>
                    <dd>
                      <Link to={`/products?category=${product.category.slug}`} className="font-medium text-fg hover:text-primary hover:underline">
                        {product.category.name}
                      </Link>
                    </dd>
                  </>
                )}
                <dt className="text-muted">Độ tuổi</dt>
                <dd className="font-medium text-fg">{ageLabel(product.min_age)}</dd>
              </dl>

              {product.description && (
                <section>
                  <h2 className="mb-2 text-lg font-bold">Mô tả sản phẩm</h2>
                  <p className="whitespace-pre-line leading-relaxed text-muted">{product.description}</p>
                </section>
              )}
            </div>
          </div>

          {product.related?.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-4 text-xl font-bold sm:text-2xl">Sản phẩm liên quan</h2>
              <ProductGrid products={product.related} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
            </section>
          )}
        </>
      )}
    </div>
  )
}

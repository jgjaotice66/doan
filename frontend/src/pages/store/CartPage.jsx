import { ImageBroken, ShoppingCartSimple, Trash, WarningCircle } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { getErrorMessage } from '../../api/client'
import ErrorState from '../../components/ErrorState'
import Price from '../../components/Price'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import QuantityInput from '../../components/ui/QuantityInput'
import Skeleton from '../../components/ui/Skeleton'
import { useCart, useRemoveCartItem, useUpdateCartItem } from '../../features/cart/queries'
import { toast } from '../../stores/toastStore'
import { cn } from '../../utils/cn'
import { formatVND } from '../../utils/format'

/** Bấm −/+ liên tục thì chỉ gửi 1 request sau khi ngừng bấm. */
const QUANTITY_DEBOUNCE_MS = 400

function CartLine({ item }) {
  const product = item.product
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const timer = useRef(null)

  // Số lượng hiển thị ngay khi bấm; đồng bộ lại khi server trả số mới.
  const [quantity, setQuantity] = useState(item.quantity)
  const [prevServerQty, setPrevServerQty] = useState(item.quantity)
  if (item.quantity !== prevServerQty) {
    setPrevServerQty(item.quantity)
    setQuantity(item.quantity)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  const onQuantityChange = (next) => {
    setQuantity(next)
    clearTimeout(timer.current)
    if (next === item.quantity) return
    timer.current = setTimeout(() => {
      update.mutate(
        { id: item.id, quantity: next },
        {
          onError: (error) => {
            setQuantity(item.quantity)
            toast.error(getErrorMessage(error, 'Không cập nhật được số lượng.'))
          },
        },
      )
    }, QUANTITY_DEBOUNCE_MS)
  }

  const onRemove = () => {
    clearTimeout(timer.current)
    remove.mutate(item.id, {
      onSuccess: () => toast.success(`Đã xoá ${product?.name ?? 'sản phẩm'} khỏi giỏ`),
      onError: (error) => toast.error(getErrorMessage(error, 'Không xoá được sản phẩm.')),
    })
  }

  const discontinued = item.max_quantity === 0

  return (
    <li
      className={cn(
        'flex gap-4 py-4 transition-opacity first:pt-0 last:pb-0',
        (update.isPending || remove.isPending) && 'opacity-60',
      )}
      aria-busy={update.isPending || remove.isPending || undefined}
    >
      <Link
        to={product ? `/products/${product.slug}` : '#'}
        className="size-20 shrink-0 overflow-hidden rounded-control bg-raised sm:size-24"
        tabIndex={-1}
        aria-hidden
      >
        {product?.thumbnail ? (
          <img
            src={product.thumbnail}
            alt=""
            width="96"
            height="96"
            loading="lazy"
            className={cn('size-full object-cover', item.unavailable && 'opacity-50 grayscale')}
          />
        ) : (
          <span className="flex size-full items-center justify-center text-subtle">
            <ImageBroken className="size-8" />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {product?.brand && (
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-soft">{product.brand.name}</p>
            )}
            {product ? (
              <Link to={`/products/${product.slug}`} className="line-clamp-2 font-semibold text-fg hover:text-primary">
                {product.name}
              </Link>
            ) : (
              <p className="font-semibold text-muted">Sản phẩm không còn tồn tại</p>
            )}
            {product && <Price price={product.price} salePrice={product.sale_price} size="sm" className="mt-1" />}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            loading={remove.isPending}
            aria-label={`Xoá ${product?.name ?? 'sản phẩm'} khỏi giỏ`}
            className="hover:text-danger"
          >
            {!remove.isPending && <Trash aria-hidden className="size-5" />}
          </Button>
        </div>

        {item.unavailable && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-danger" role="status">
            <WarningCircle aria-hidden weight="fill" className="size-4 shrink-0" />
            {item.unavailable_reason}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
          <QuantityInput
            value={quantity}
            onChange={onQuantityChange}
            max={Math.max(1, item.max_quantity)}
            disabled={discontinued || remove.isPending}
            label={<span className="sr-only">Số lượng {product?.name}</span>}
          />
          <p className="text-right">
            <span className="block text-xs text-muted">Thành tiền</span>
            <span className={cn('font-bold tabular', item.unavailable ? 'text-subtle line-through' : 'text-fg')}>
              {formatVND(item.line_total)}
            </span>
          </p>
        </div>
      </div>
    </li>
  )
}

function Summary({ cart }) {
  const canCheckout = cart.items.length > 0 && !cart.has_unavailable

  return (
    <Card className="space-y-4 p-5 lg:sticky lg:top-24">
      <h2 className="text-lg font-bold">Tóm tắt đơn hàng</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Tạm tính</dt>
          <dd className="font-semibold tabular">{formatVND(cart.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Phí vận chuyển</dt>
          <dd className="font-semibold tabular">{formatVND(cart.shipping_fee)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="font-semibold">Tổng cộng</dt>
          <dd className="text-2xl font-bold text-primary tabular" aria-live="polite">
            {formatVND(cart.total)}
          </dd>
        </div>
      </dl>

      {cart.has_unavailable && (
        <p className="flex gap-2 rounded-control border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          <WarningCircle aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
          Giỏ có sản phẩm không mua được. Hãy giảm số lượng hoặc xoá các sản phẩm được đánh dấu để tiếp tục.
        </p>
      )}

      {canCheckout ? (
        <Button as={Link} to="/checkout" size="lg" fullWidth>
          Thanh toán
        </Button>
      ) : (
        <Button size="lg" fullWidth disabled>
          Thanh toán
        </Button>
      )}
      <Link to="/products" className="block text-center text-sm text-muted hover:text-primary hover:underline">
        Tiếp tục mua sắm
      </Link>
    </Card>
  )
}

function CartSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]" aria-busy="true" aria-label="Đang tải giỏ hàng">
      <Card className="space-y-4 p-5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-24 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-11 w-32" />
            </div>
          </div>
        ))}
      </Card>
      <Skeleton className="h-64 rounded-card" />
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-line px-4 py-16 text-center">
      <ShoppingCartSimple aria-hidden className="size-12 text-subtle" />
      <div>
        <p className="text-lg font-semibold">Giỏ hàng đang trống</p>
        <p className="mt-1 text-sm text-muted">Khám phá các mẫu figure, Gundam, LEGO mới nhất nhé.</p>
      </div>
      <Button as={Link} to="/products">
        Xem sản phẩm
      </Button>
    </div>
  )
}

export default function CartPage() {
  const { data: cart, isPending, error, refetch } = useCart()

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <title>Giỏ hàng – Toy Store</title>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">
        Giỏ hàng
        {cart?.count > 0 && <span className="ml-2 text-base font-medium text-muted tabular">({cart.count} sản phẩm)</span>}
      </h1>

      {isPending ? (
        <CartSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="Không tải được giỏ hàng" />
      ) : cart.items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-5">
            <ul className="divide-y divide-line">
              {cart.items.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </ul>
          </Card>
          <Summary cart={cart} />
        </div>
      )}
    </div>
  )
}

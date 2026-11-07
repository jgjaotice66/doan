import { CaretRight, ImageBroken, Package } from '@phosphor-icons/react'
import { Link, useSearchParams } from 'react-router'
import ErrorState from '../../components/ErrorState'
import OrderStatusBadge, { PaymentStatusBadge } from '../../components/OrderStatusBadge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Pagination from '../../components/ui/Pagination'
import Skeleton from '../../components/ui/Skeleton'
import { isAwaitingTransfer, useMyOrders } from '../../features/orders/queries'
import { cn } from '../../utils/cn'
import { formatDateTime, formatVND } from '../../utils/format'

const TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã huỷ' },
]

const MAX_THUMBS = 3

function StatusTabs({ active, onChange }) {
  return (
    // Thanh tab được cuộn ngang trên điện thoại (chỉ thanh này, không phải cả trang).
    <div className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-2 border-b border-line" aria-label="Lọc theo trạng thái">
        {TABS.map((tab) => {
          const selected = tab.value === active
          return (
            <li key={tab.value || 'all'}>
              <button
                type="button"
                onClick={() => onChange(tab.value)}
                aria-pressed={selected}
                className={cn(
                  '-mb-px inline-flex h-11 cursor-pointer items-center border-b-2 px-3 text-sm font-semibold transition-colors',
                  selected ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg',
                )}
              >
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function OrderRow({ order }) {
  const items = order.items ?? []
  const extra = items.length - MAX_THUMBS

  return (
    <li>
      <Link
        to={`/orders/${order.code}`}
        className="group block rounded-card border border-line bg-surface p-4 transition-colors hover:border-primary/60 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-display font-bold text-fg tabular">{order.code}</span>
            <span className="text-sm text-muted tabular">{formatDateTime(order.created_at)}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge paymentStatus={order.payment_status} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <ul className="flex shrink-0 -space-x-3" aria-hidden>
            {items.slice(0, MAX_THUMBS).map((item) => (
              <li key={item.id} className="size-14 overflow-hidden rounded-control border-2 border-surface bg-raised">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt="" width="56" height="56" loading="lazy" className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-subtle">
                    <ImageBroken className="size-6" />
                  </span>
                )}
              </li>
            ))}
            {extra > 0 && (
              <li className="flex size-14 items-center justify-center rounded-control border-2 border-surface bg-raised text-sm font-semibold text-muted">
                +{extra}
              </li>
            )}
          </ul>

          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm text-fg">{items[0]?.product_name}</p>
            <p className="text-sm text-muted">
              {order.item_count} sản phẩm · {order.payment_method.label}
            </p>
            {isAwaitingTransfer(order) && <p className="text-sm text-warning">Đang chờ chuyển khoản</p>}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="text-right">
              <span className="block text-xs text-muted">Tổng</span>
              <span className="font-bold text-primary tabular">{formatVND(order.total)}</span>
            </span>
            <CaretRight aria-hidden className="size-5 text-subtle transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </li>
  )
}

function EmptyOrders({ filtered }) {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <Package aria-hidden className="size-14 text-subtle" />
      <h2 className="text-lg font-bold">{filtered ? 'Không có đơn nào ở trạng thái này' : 'Bạn chưa có đơn hàng nào'}</h2>
      <p className="text-muted">Khám phá các mẫu đồ chơi sưu tầm mới nhất và đặt đơn đầu tiên nhé.</p>
      <Button as={Link} to="/products" className="mt-2">
        Mua sắm ngay
      </Button>
    </Card>
  )
}

export default function MyOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = TABS.some((t) => t.value === searchParams.get('status')) ? searchParams.get('status') : ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const { data, isPending, isPlaceholderData, error, refetch } = useMyOrders({ status: status || undefined, page })
  const orders = data?.data ?? []
  const meta = data?.meta

  const update = (next) => {
    const params = new URLSearchParams()
    if (next.status) params.set('status', next.status)
    if (next.page > 1) params.set('page', String(next.page))
    setSearchParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <title>Đơn hàng của tôi – Toy Store</title>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Đơn hàng của tôi</h1>

      <StatusTabs active={status} onChange={(value) => update({ status: value, page: 1 })} />

      <div className="mt-6">
        {isPending ? (
          <div className="space-y-3" aria-busy="true" aria-label="Đang tải đơn hàng">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-36 rounded-card" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} title="Không tải được đơn hàng" />
        ) : orders.length === 0 ? (
          <EmptyOrders filtered={Boolean(status)} />
        ) : (
          <>
            <ul className={cn('space-y-3 transition-opacity', isPlaceholderData && 'opacity-60')} aria-busy={isPlaceholderData}>
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </ul>
            {meta && (
              <Pagination
                page={meta.current_page}
                lastPage={meta.last_page}
                onPageChange={(p) => update({ status, page: p })}
                className="pt-6"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

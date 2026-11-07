import { ArrowLeft, Check, ImageBroken, XCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { getErrorMessage } from '../../api/client'
import BankQrBox from '../../components/BankQrBox'
import ErrorState from '../../components/ErrorState'
import OrderStatusBadge, { PaymentStatusBadge } from '../../components/OrderStatusBadge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Skeleton from '../../components/ui/Skeleton'
import { isAwaitingTransfer, useCancelOrder, useOrder } from '../../features/orders/queries'
import { toast } from '../../stores/toastStore'
import { cn } from '../../utils/cn'
import { formatDateTime, formatVND } from '../../utils/format'
import NotFoundPage from '../NotFoundPage'

const STEPS = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
]

/** Tiến trình đơn: bước đã qua có dấu ✓, bước hiện tại tô sáng. */
function StatusTimeline({ status }) {
  if (status.value === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-control border border-danger/40 bg-danger/10 p-4 text-danger" role="status">
        <XCircle aria-hidden weight="fill" className="size-6 shrink-0" />
        <p className="font-semibold">Đơn hàng đã bị huỷ. Số lượng sản phẩm đã được hoàn lại kho.</p>
      </div>
    )
  }

  const current = STEPS.findIndex((s) => s.value === status.value)

  return (
    <ol className="grid grid-cols-4" aria-label="Tiến trình đơn hàng">
      {STEPS.map((step, i) => {
        const done = i < current || (i === current && step.value === 'completed')
        const active = i === current
        return (
          <li key={step.value} className="relative flex flex-col items-center gap-2 text-center" aria-current={active ? 'step' : undefined}>
            {i > 0 && (
              <span
                aria-hidden
                className={cn('absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2', i <= current ? 'bg-primary' : 'bg-line')}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold tabular',
                done && 'border-primary bg-primary text-on-primary',
                active && !done && 'border-primary bg-surface text-primary shadow-glow',
                !done && !active && 'border-line bg-surface text-subtle',
              )}
            >
              {done ? <Check aria-hidden weight="bold" className="size-4" /> : i + 1}
            </span>
            <span className={cn('text-xs font-semibold sm:text-sm', i <= current ? 'text-fg' : 'text-subtle')}>
              {step.label}
              {done && <span className="sr-only"> (đã xong)</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function OrderItems({ items }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          <div className="size-16 shrink-0 overflow-hidden rounded-control bg-raised sm:size-20" aria-hidden>
            {item.thumbnail ? (
              <img src={item.thumbnail} alt="" width="80" height="80" loading="lazy" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-subtle">
                <ImageBroken className="size-7" />
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 sm:flex-row sm:items-start">
            <div className="min-w-0">
              {item.product_slug ? (
                <Link to={`/products/${item.product_slug}`} className="line-clamp-2 font-semibold text-fg hover:text-primary">
                  {item.product_name}
                </Link>
              ) : (
                <p className="line-clamp-2 font-semibold text-fg">{item.product_name}</p>
              )}
              <p className="text-sm text-muted tabular">
                {formatVND(item.price)} × {item.quantity}
              </p>
            </div>
            <p className="font-bold tabular sm:text-right">{formatVND(item.line_total)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

function CancelOrder({ order }) {
  const [open, setOpen] = useState(false)
  const cancel = useCancelOrder()

  const confirm = () =>
    cancel.mutate(order.code, {
      onSuccess: () => {
        setOpen(false)
        toast.success(`Đã huỷ đơn ${order.code}`)
      },
      onError: (error) => {
        setOpen(false)
        toast.error(getErrorMessage(error, 'Không huỷ được đơn hàng'))
      },
    })

  return (
    <>
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>
        Huỷ đơn hàng
      </Button>
      <Modal
        open={open}
        onClose={() => !cancel.isPending && setOpen(false)}
        title="Huỷ đơn hàng này?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={cancel.isPending}>
              Giữ đơn
            </Button>
            <Button variant="danger" onClick={confirm} loading={cancel.isPending}>
              Huỷ đơn
            </Button>
          </>
        }
      >
        <p>
          Đơn <strong className="text-fg tabular">{order.code}</strong> sẽ bị huỷ và không thể khôi phục. Bạn có thể đặt lại
          từ giỏ hàng bất cứ lúc nào.
        </p>
        {order.payment_method.value === 'bank_qr' && (
          <p className="mt-2">Nếu bạn đã lỡ chuyển khoản, hãy liên hệ cửa hàng để được hoàn tiền.</p>
        )}
      </Modal>
    </>
  )
}

function SummaryCard({ order }) {
  return (
    <Card className="space-y-4 p-5">
      <section>
        <h2 className="mb-2 font-bold">Giao tới</h2>
        <p className="font-medium">
          {order.recipient_name} · <span className="tabular">{order.phone}</span>
        </p>
        <p className="text-sm text-muted">{order.address}</p>
        {order.note && <p className="mt-2 text-sm text-muted">Ghi chú: {order.note}</p>}
      </section>

      <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 border-t border-line pt-4 text-sm">
        <dt className="text-muted">Tạm tính</dt>
        <dd className="text-right tabular">{formatVND(order.subtotal)}</dd>
        <dt className="text-muted">Phí vận chuyển</dt>
        <dd className="text-right tabular">{formatVND(order.shipping_fee)}</dd>
        <dt className="pt-2 font-bold">Tổng cộng</dt>
        <dd className="pt-2 text-right text-lg font-bold text-primary tabular">{formatVND(order.total)}</dd>
        <dt className="pt-2 text-muted">Thanh toán</dt>
        <dd className="pt-2 text-right font-medium">{order.payment_method.label}</dd>
      </dl>

      {order.status.value === 'pending' && <CancelOrder order={order} />}
    </Card>
  )
}

export default function OrderDetailPage() {
  const { code } = useParams()
  const { data: order, isPending, error, refetch } = useOrder(code)

  if (error?.response?.status === 404) return <NotFoundPage />

  const awaiting = isAwaitingTransfer(order)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <title>{order ? `Đơn ${order.code} – Toy Store` : 'Chi tiết đơn hàng – Toy Store'}</title>

      <Link to="/orders" className="mb-4 inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-primary">
        <ArrowLeft aria-hidden className="size-4" /> Đơn hàng của tôi
      </Link>

      {isPending ? (
        <div className="space-y-4" aria-busy="true" aria-label="Đang tải đơn hàng">
          <Skeleton className="h-32 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="Không tải được đơn hàng" />
      ) : (
        <div className="space-y-6">
          <Card className="space-y-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold tabular sm:text-3xl">{order.code}</h1>
                <p className="text-sm text-muted tabular">Đặt lúc {formatDateTime(order.created_at)}</p>
              </div>
              {/* aria-live: trạng thái đổi (huỷ / admin xác nhận tiền) thì trình đọc màn hình được báo */}
              <div className="flex flex-wrap gap-1.5" aria-live="polite">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge paymentStatus={order.payment_status} />
              </div>
            </div>
            <StatusTimeline status={order.status} />
          </Card>

          {awaiting && order.qr_url && order.bank && <BankQrBox order={order} />}

          <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
            <Card className="p-5">
              <h2 className="mb-4 font-bold">Sản phẩm ({order.item_count})</h2>
              <OrderItems items={order.items} />
            </Card>
            <SummaryCard order={order} />
          </div>
        </div>
      )}
    </div>
  )
}

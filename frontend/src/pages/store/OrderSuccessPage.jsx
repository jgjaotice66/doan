import { CheckCircle } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import BankQrBox from '../../components/BankQrBox'
import ErrorState from '../../components/ErrorState'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Skeleton from '../../components/ui/Skeleton'
import { useClearCartCache, useOrder } from '../../features/orders/queries'
import { formatVND } from '../../utils/format'
import NotFoundPage from '../NotFoundPage'

export default function OrderSuccessPage() {
  const { code } = useParams()
  const location = useLocation()
  const { data: order, isPending, error, refetch } = useOrder(code)
  const clearCartCache = useClearCartCache()
  const justPlaced = Boolean(location.state?.justPlaced)

  // Chỉ khi vừa đặt xong (đi từ checkout sang); mở lại link này sau đó thì không đụng tới giỏ.
  useEffect(() => {
    if (justPlaced) clearCartCache()
  }, [justPlaced, clearCartCache])

  if (error?.response?.status === 404) return <NotFoundPage />

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <title>Đặt hàng thành công – Toy Store</title>

      {isPending ? (
        <div className="space-y-4" aria-busy="true" aria-label="Đang tải đơn hàng">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="Không tải được đơn hàng" />
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
            <CheckCircle aria-hidden weight="fill" className="size-14 text-success" />
            <h1 className="text-2xl font-bold sm:text-3xl">Đặt hàng thành công!</h1>
            <p className="text-muted">
              Mã đơn hàng của bạn: <strong className="font-display text-xl text-primary tabular">{order.code}</strong>
            </p>
            <dl className="mt-2 grid w-full max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-control border border-line p-4 text-left text-sm">
              <dt className="text-muted">Tổng thanh toán</dt>
              <dd className="text-right font-bold tabular">{formatVND(order.total)}</dd>
              <dt className="text-muted">Thanh toán</dt>
              <dd className="text-right font-medium">{order.payment_method.label}</dd>
              <dt className="text-muted">Trạng thái</dt>
              <dd className="text-right font-medium">{order.status.label}</dd>
              <dt className="text-muted">Giao tới</dt>
              <dd className="text-right font-medium">
                {order.recipient_name} · <span className="tabular">{order.phone}</span>
                <span className="block text-muted">{order.address}</span>
              </dd>
            </dl>
            {order.payment_method.value === 'cod' && (
              <p className="text-sm text-muted">Bạn sẽ thanh toán khi nhận hàng. Cửa hàng sẽ sớm liên hệ xác nhận đơn.</p>
            )}
          </Card>

          {order.qr_url && order.bank && <BankQrBox order={order} />}

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button as={Link} to={`/orders/${order.code}`} variant="outline">
              Xem chi tiết đơn
            </Button>
            <Button as={Link} to="/products">
              Tiếp tục mua sắm
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

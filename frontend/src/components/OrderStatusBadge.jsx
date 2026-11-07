import Badge from './ui/Badge'

const STATUS_VARIANTS = {
  pending: 'warning',
  confirmed: 'accent',
  shipping: 'primary',
  completed: 'success',
  cancelled: 'danger',
}

/** Nhãn trạng thái đơn — status = { value, label } từ API. */
export default function OrderStatusBadge({ status, className }) {
  return (
    <Badge variant={STATUS_VARIANTS[status.value] ?? 'neutral'} className={className}>
      {status.label}
    </Badge>
  )
}

const PAYMENT_VARIANTS = { paid: 'success', refunded: 'accent' }

/** Nhãn tình trạng thanh toán — paymentStatus = { value: 'unpaid' | 'paid' | 'refunded', label }. */
export function PaymentStatusBadge({ paymentStatus, className }) {
  return (
    <Badge variant={PAYMENT_VARIANTS[paymentStatus.value] ?? 'neutral'} className={className}>
      {paymentStatus.label}
    </Badge>
  )
}

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

/** Nhãn tình trạng thanh toán — paymentStatus = { value: 'unpaid' | 'paid', label }. */
export function PaymentStatusBadge({ paymentStatus, className }) {
  return (
    <Badge variant={paymentStatus.value === 'paid' ? 'success' : 'neutral'} className={className}>
      {paymentStatus.label}
    </Badge>
  )
}

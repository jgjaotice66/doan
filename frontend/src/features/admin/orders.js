import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminOrdersApi } from '../../api/admin/orders'
import { inventoryKeys } from './inventory'
import { adminProductKeys } from './products'

export const adminOrderKeys = {
  all: ['admin', 'orders'],
  detail: (id) => ['admin', 'orders', 'detail', String(id)],
}

/** Màu Tag antd theo trạng thái đơn. */
export const ORDER_STATUS_COLORS = {
  pending: 'gold',
  confirmed: 'blue',
  shipping: 'geekblue',
  completed: 'green',
  cancelled: 'default',
}

export const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã huỷ' },
]

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'cod', label: 'COD' },
  { value: 'bank_qr', label: 'Chuyển khoản' },
]

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

/**
 * Tag thanh toán trên bảng + trang chi tiết; tình huống cần admin làm gì đó thì nói rõ việc cần làm.
 * → { color, label }
 */
export function paymentTag(order) {
  if (order.can_mark_refunded) return { color: 'red', label: 'Cần hoàn tiền' }
  if (order.can_mark_paid) return { color: 'orange', label: 'Chờ nhận tiền' }
  const color = { paid: 'green', refunded: 'purple' }[order.payment_status.value] ?? 'default'
  return { color, label: order.payment_status.label }
}

export const useAdminOrder = (id) =>
  useQuery({
    queryKey: adminOrderKeys.detail(id),
    queryFn: () => adminOrdersApi.get(id),
    enabled: Boolean(id),
    retry: (count, error) => error?.response?.status !== 404 && count < 1,
  })

/**
 * Chuyển trạng thái + xác nhận đã nhận tiền. Server trả đơn mới → ghi vào cache chi tiết ngay
 * (nút đổi theo allowed_next / can_mark_paid), bảng đơn tải lại. Huỷ đơn hoàn kho → tồn kho sản phẩm tải lại.
 * 422 (đơn vừa bị khách huỷ / admin khác xử lý) → tải lại chi tiết để hiện trạng thái thật.
 */
export function useOrderActions(orderId) {
  const queryClient = useQueryClient()
  const detailKey = adminOrderKeys.detail(orderId)

  const onSuccess = (order) => {
    queryClient.setQueryData(detailKey, order)
    queryClient.invalidateQueries({
      queryKey: adminOrderKeys.all,
      refetchType: 'none',
    })
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
  }

  const onError = (error) => {
    if (error.response?.status === 422) queryClient.invalidateQueries({ queryKey: detailKey })
  }

  const changeStatus = useMutation({
    mutationFn: (status) => adminOrdersApi.updateStatus(orderId, status),
    onSuccess: (order) => {
      onSuccess(order)
      if (order.status.value === 'cancelled') {
        ;[adminProductKeys.all, inventoryKeys.all, ['products'], ['product']].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
      }
    },
    onError,
  })

  const markPaid = useMutation({
    mutationFn: () => adminOrdersApi.markPaid(orderId),
    onSuccess,
    onError,
  })

  const markRefunded = useMutation({
    mutationFn: () => adminOrdersApi.markRefunded(orderId),
    onSuccess,
    onError,
  })

  return { changeStatus, markPaid, markRefunded }
}

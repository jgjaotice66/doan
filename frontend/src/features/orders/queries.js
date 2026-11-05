import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { ordersApi } from '../../api/orders'
import { useAuthStore } from '../../stores/authStore'
import { cartKeys } from '../cart/queries'

export const orderKeys = {
  all: ['orders'],
  detail: (code) => ['orders', 'detail', code],
}

const EMPTY_CART = { items: [], count: 0, subtotal: 0, shipping_fee: 0, total: 0, has_unavailable: false }

/** 404 = không có đơn này (hoặc của người khác) → không thử lại. */
const retryUnlessNotFound = (failureCount, error) => error?.response?.status !== 404 && failureCount < 1

/** Đơn chuyển khoản còn chờ tiền (chưa trả, chưa huỷ). */
export const isAwaitingTransfer = (order) =>
  order?.payment_method.value === 'bank_qr' && order.payment_status.value === 'unpaid' && order.status.value !== 'cancelled'

const AWAITING_POLL_MS = 15_000

/**
 * Chi tiết đơn. Đơn chuyển khoản đang chờ tiền thì tự hỏi lại server mỗi 15s:
 * admin xác nhận "Đã nhận tiền" → trang tự đổi sang "Đã thanh toán", ẩn QR.
 */
export const useOrder = (code) =>
  useQuery({
    queryKey: orderKeys.detail(code),
    queryFn: () => ordersApi.get(code),
    enabled: Boolean(code),
    retry: retryUnlessNotFound,
    refetchInterval: (query) => (isAwaitingTransfer(query.state.data) ? AWAITING_POLL_MS : false),
  })

/**
 * Đặt hàng thành công: server đã trừ kho → cache sẵn đơn cho trang thành công,
 * đánh dấu danh sách sản phẩm/đơn cũ để lần sau tải lại tồn kho mới.
 * Giỏ được làm rỗng ở trang thành công (useClearCartCache) — làm ở đây thì trang
 * checkout kịp chớp "giỏ trống" trong lúc chờ tải trang mới.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ordersApi.place,
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.code), order)
      queryClient.invalidateQueries({ queryKey: orderKeys.all, refetchType: 'none' })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product'] })
    },
    onError: (error) => {
      // Hết hàng / giỏ đổi trong lúc đặt → tải lại giỏ để hiện đúng trạng thái mới.
      if (error.response?.status === 422) {
        queryClient.invalidateQueries({ queryKey: cartKeys.all })
      }
    },
  })
}

/**
 * Server đã xoá giỏ khi tạo đơn → làm rỗng giỏ trong cache ngay (badge về 0, không cần gọi API).
 */
export function useClearCartCache() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useCallback(() => queryClient.setQueryData(cartKeys.mine(userId), EMPTY_CART), [queryClient, userId])
}

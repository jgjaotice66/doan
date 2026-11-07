import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { ordersApi } from '../../api/orders'
import { useAuthStore } from '../../stores/authStore'
import { cartKeys } from '../cart/queries'

export const orderKeys = {
  all: ['orders'],
  lists: ['orders', 'list'],
  list: (params) => ['orders', 'list', params],
  detail: (code) => ['orders', 'detail', code],
}

const EMPTY_CART = { items: [], count: 0, subtotal: 0, shipping_fee: 0, total: 0, has_unavailable: false }

/** 404 = không có đơn này (hoặc của người khác) → không thử lại. */
const retryUnlessNotFound = (failureCount, error) => error?.response?.status !== 404 && failureCount < 1

/** Đơn chuyển khoản còn chờ tiền (chưa trả, chưa huỷ). */
export const isAwaitingTransfer = (order) =>
  order?.payment_method.value === 'bank_qr' && order.payment_status.value === 'unpaid' && order.status.value !== 'cancelled'

const AWAITING_POLL_MS = 15_000
const ACTIVE_POLL_MS = 30_000
const FINAL_STATUSES = ['completed', 'cancelled']

/** Đơn còn được cửa hàng xử lý tiếp (chưa hoàn thành / huỷ). */
const isActive = (order) => order && !FINAL_STATUSES.includes(order.status.value)

/**
 * Chi tiết đơn tự hỏi lại server để thấy thao tác của admin mà không cần F5:
 *   - chuyển khoản chờ tiền: mỗi 15s (admin bấm "Đã nhận tiền" → "Đã thanh toán", ẩn QR);
 *   - đơn đang xử lý khác: mỗi 30s; quay lại tab cũng tải lại. Đơn đã xong/huỷ thì thôi.
 */
export const useOrder = (code) =>
  useQuery({
    queryKey: orderKeys.detail(code),
    queryFn: () => ordersApi.get(code),
    enabled: Boolean(code),
    retry: retryUnlessNotFound,
    refetchOnWindowFocus: true,
    refetchInterval: ({ state }) => (isAwaitingTransfer(state.data) ? AWAITING_POLL_MS : isActive(state.data) ? ACTIVE_POLL_MS : false),
  })

/**
 * Đơn của tôi theo tab trạng thái + trang. Giữ dữ liệu cũ khi đổi tab/trang để danh sách không nháy trắng.
 * params: { status?: string, page?: number }
 */
export const useMyOrders = (params) =>
  useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersApi.list(params),
    placeholderData: keepPreviousData,
    // Trang này còn đơn đang xử lý → tự cập nhật trạng thái admin vừa đổi.
    refetchOnWindowFocus: true,
    refetchInterval: ({ state }) => (state.data?.data.some(isActive) ? ACTIVE_POLL_MS : false),
  })

/**
 * Khách huỷ đơn pending: server trả đơn mới → cập nhật chi tiết ngay (nút huỷ biến mất),
 * danh sách đơn và tồn kho sản phẩm (đã hoàn kho) tải lại khi cần.
 */
export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ordersApi.cancel,
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.code), order)
      queryClient.invalidateQueries({ queryKey: orderKeys.lists })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product'] })
    },
    onError: (error, code) => {
      // 422 = đơn vừa được cửa hàng xác nhận → tải lại để hiện trạng thái thật.
      if (error.response?.status === 422) queryClient.invalidateQueries({ queryKey: orderKeys.detail(code) })
    },
  })
}

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

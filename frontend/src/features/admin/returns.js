import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminReturnsApi } from '../../api/admin/returns'
import { dashboardKeys } from './dashboard'
import { inventoryKeys } from './inventory'
import { adminOrderKeys } from './orders'
import { PRODUCT_RELATED_KEYS } from './products'

export const adminReturnKeys = {
  all: ['admin', 'returns'],
  detail: (id) => ['admin', 'returns', 'detail', String(id)],
}

export const RETURN_STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'received', label: 'Đã nhận hàng' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
  { value: 'rejected', label: 'Từ chối' },
]

/** Màu Tag antd theo trạng thái yêu cầu. */
export const RETURN_STATUS_COLORS = {
  pending: 'gold',
  approved: 'blue',
  received: 'cyan',
  refunded: 'green',
  rejected: 'red',
}

export const useAdminReturn = (id) =>
  useQuery({
    queryKey: adminReturnKeys.detail(id),
    queryFn: () => adminReturnsApi.get(id),
    enabled: Boolean(id),
    retry: (count, error) => error?.response?.status !== 404 && count < 1,
  })

/**
 * 4 thao tác trên trang chi tiết. Server trả yêu cầu mới → ghi thẳng vào cache chi tiết (nút đổi theo allowed_actions);
 * danh sách, số đếm trên menu/dashboard, đơn gốc tải lại; nhận hàng có nhập kho → tồn kho tải lại.
 * 422 (admin khác vừa xử lý) → tải lại chi tiết để hiện trạng thái thật.
 */
export function useReturnActions(id) {
  const queryClient = useQueryClient()
  const detailKey = adminReturnKeys.detail(id)

  const onSuccess = (request) => {
    queryClient.setQueryData(detailKey, request)
    queryClient.invalidateQueries({ queryKey: adminReturnKeys.all, refetchType: 'none' })
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    queryClient.invalidateQueries({ queryKey: adminOrderKeys.detail(request.order.id) })
  }
  const onError = (error) => {
    if (error.response?.status === 422 && error.response.data?.errors?.status) queryClient.invalidateQueries({ queryKey: detailKey })
  }

  const approve = useMutation({ mutationFn: (note) => adminReturnsApi.approve(id, note), onSuccess, onError })
  const reject = useMutation({ mutationFn: (note) => adminReturnsApi.reject(id, note), onSuccess, onError })
  const receive = useMutation({
    mutationFn: (items) => adminReturnsApi.receive(id, items),
    onSuccess: (request) => {
      onSuccess(request)
      ;[inventoryKeys.all, ...PRODUCT_RELATED_KEYS].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
    },
    onError,
  })
  const refund = useMutation({ mutationFn: (amount) => adminReturnsApi.refund(id, amount), onSuccess, onError })

  return { approve, reject, receive, refund }
}

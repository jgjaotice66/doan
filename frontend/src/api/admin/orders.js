import { api } from '../client'

const unwrap = (res) => res.data.data

/**
 * Quản lý đơn hàng (mọi khách).
 */
export const adminOrdersApi = {
  /** params: { page, per_page, q, status, payment_method, payment_status, awaiting_payment, needs_refund, from, to } → { data, meta } */
  list: (params) => api.get('/admin/orders', { params }).then((res) => res.data),
  get: (id) => api.get(`/admin/orders/${id}`).then(unwrap),
  /** status: một giá trị trong order.allowed_next */
  updateStatus: (id, status) => api.patch(`/admin/orders/${id}/status`, { status }).then(unwrap),
  /** "Đã nhận tiền" cho đơn chuyển khoản. */
  markPaid: (id) => api.patch(`/admin/orders/${id}/payment`).then(unwrap),
  /** "Đã hoàn tiền" cho đơn đã huỷ mà khách đã trả. */
  markRefunded: (id) => api.patch(`/admin/orders/${id}/refund`).then(unwrap),
}

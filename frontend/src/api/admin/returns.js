import { api } from '../client'

const unwrap = (res) => res.data.data

/**
 * Yêu cầu trả hàng (admin). Mỗi thao tác trả về yêu cầu mới (kèm allowed_actions).
 */
export const adminReturnsApi = {
  /** params: { page, per_page, status, q (mã đơn) } → { data, meta } */
  list: (params) => api.get('/admin/returns', { params }).then((res) => res.data),
  get: (id) => api.get(`/admin/returns/${id}`).then(unwrap),
  approve: (id, adminNote) => api.patch(`/admin/returns/${id}/approve`, { admin_note: adminNote || null }).then(unwrap),
  reject: (id, adminNote) => api.patch(`/admin/returns/${id}/reject`, { admin_note: adminNote }).then(unwrap),
  /** items: [{ id, restock: bool }] */
  receive: (id, items) => api.patch(`/admin/returns/${id}/receive`, { items }).then(unwrap),
  refund: (id, refundAmount) => api.patch(`/admin/returns/${id}/refund`, { refund_amount: refundAmount }).then(unwrap),
}

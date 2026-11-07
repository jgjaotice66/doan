import { api } from '../client'
import { toFormData } from './formData'

const unwrap = (res) => res.data.data

/**
 * Quản trị banner slider. payload: { title, link, is_active, image?: File }
 * (sửa không gửi image = giữ ảnh cũ).
 */
export const adminBannersApi = {
  /** → mảng banner theo thứ tự hiển thị (không phân trang). */
  list: () => api.get('/admin/banners').then(unwrap),
  create: (payload) => api.post('/admin/banners', toFormData(payload)).then(unwrap),
  update: (id, payload) => api.post(`/admin/banners/${id}`, toFormData(payload, 'PUT')).then(unwrap),
  remove: (id) => api.delete(`/admin/banners/${id}`),
  toggleActive: (id) => api.patch(`/admin/banners/${id}/toggle-active`).then(unwrap),
  /** ids = toàn bộ id theo thứ tự mới → trả danh sách mới. */
  reorder: (ids) => api.put('/admin/banners/order', { ids }).then(unwrap),
}

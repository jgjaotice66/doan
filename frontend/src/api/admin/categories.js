import { api } from '../client'
import { toFormData } from './formData'

const unwrap = (res) => res.data.data

/**
 * Quản trị danh mục. payload: { name, parent_id, image?: File, remove_image?: boolean }
 */
export const adminCategoriesApi = {
  /** params: { page, per_page, q } → { data, meta } */
  list: (params) => api.get('/admin/categories', { params }).then((res) => res.data),
  create: (payload) => api.post('/admin/categories', toFormData(payload)).then(unwrap),
  update: (id, payload) => api.post(`/admin/categories/${id}`, toFormData(payload, 'PUT')).then(unwrap),
  remove: (id) => api.delete(`/admin/categories/${id}`),
}

import { api } from '../client'
import { toFormData } from './formData'

const unwrap = (res) => res.data.data

/**
 * Quản trị thương hiệu. payload: { name, logo?: File, remove_logo?: boolean }
 */
export const adminBrandsApi = {
  /** params: { page, per_page, q } → { data, meta } */
  list: (params) => api.get('/admin/brands', { params }).then((res) => res.data),
  create: (payload) => api.post('/admin/brands', toFormData(payload)).then(unwrap),
  update: (id, payload) => api.post(`/admin/brands/${id}`, toFormData(payload, 'PUT')).then(unwrap),
  remove: (id) => api.delete(`/admin/brands/${id}`),
}

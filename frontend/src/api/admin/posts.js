import { api } from '../client'
import { toFormData } from './formData'

const unwrap = (res) => res.data.data

/**
 * Quản trị tin tức. payload: { title, slug?, excerpt?, content (HTML), is_published, published_at (ISO kèm múi giờ) | null,
 *   thumbnail?: File, remove_thumbnail?: true } — gửi multipart vì có thể kèm ảnh đại diện.
 */
export const adminPostsApi = {
  /** params: { page, per_page, q, status } → { data, meta } */
  list: (params) => api.get('/admin/posts', { params }).then((res) => res.data),
  get: (id) => api.get(`/admin/posts/${id}`).then(unwrap),
  create: (payload) => api.post('/admin/posts', toFormData(payload)).then(unwrap),
  update: (id, payload) => api.post(`/admin/posts/${id}`, toFormData(payload, 'PUT')).then(unwrap),
  remove: (id) => api.delete(`/admin/posts/${id}`),
  /** Ảnh chèn trong nội dung → URL để chèn vào trình soạn thảo. */
  uploadImage: (file) => api.post('/admin/posts/images', toFormData({ image: file })).then((res) => res.data.url),
}

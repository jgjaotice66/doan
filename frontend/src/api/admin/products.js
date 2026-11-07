import { api } from '../client'
import { toFormData } from './formData'

const unwrap = (res) => res.data.data

/**
 * Quản trị sản phẩm + ảnh.
 * payload: { category_id, brand_id, name, sku, description, price, sale_price, min_age, is_featured, status,
 *            stock (chỉ khi tạo), images: File[] (chỉ khi tạo) }
 */
export const adminProductsApi = {
  /** params: { page, per_page, q, category, brand, status, low_stock, sort } → { data, meta } */
  list: (params) => api.get('/admin/products', { params }).then((res) => res.data),
  get: (id) => api.get(`/admin/products/${id}`).then(unwrap),
  // Tạo có thể kèm ảnh → multipart; sửa chỉ là dữ liệu → JSON.
  create: (payload) => api.post('/admin/products', toFormData(payload)).then(unwrap),
  update: (id, payload) => api.put(`/admin/products/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/admin/products/${id}`),

  /** Thêm ảnh vào cuối → trả toàn bộ ảnh theo thứ tự mới. */
  uploadImages: (id, files) => api.post(`/admin/products/${id}/images`, toFormData({ images: files })).then(unwrap),
  /** ids = tất cả id ảnh theo thứ tự mới (ảnh đầu = ảnh đại diện). */
  reorderImages: (id, ids) => api.put(`/admin/products/${id}/images/order`, { ids }).then(unwrap),
  deleteImage: (imageId) => api.delete(`/admin/product-images/${imageId}`),
}

import { api } from './client'

/**
 * Bỏ tham số rỗng để URL gọn: { q: '', page: 2 } → { page: 2 }
 */
const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length)))

export const catalogApi = {
  categories: () => api.get('/categories').then((res) => res.data.data),
  brands: () => api.get('/brands').then((res) => res.data.data),
  banners: () => api.get('/banners').then((res) => res.data.data),
  /** [{ code, name }] — gợi ý ô ngân hàng nhận tiền hoàn */
  banks: () => api.get('/banks').then((res) => res.data.data),
  /** { hotline: string | null, return_days: number } — nút gọi nổi, số ngày đổi trả */
  shop: () => api.get('/shop').then((res) => res.data.data),

  /** Trả { data: [...], meta: { current_page, last_page, total, ... } } */
  products: (params) => api.get('/products', { params: cleanParams(params) }).then((res) => res.data),

  product: (slug) => api.get(`/products/${encodeURIComponent(slug)}`).then((res) => res.data.data),
}

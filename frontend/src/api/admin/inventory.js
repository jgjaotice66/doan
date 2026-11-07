import { api } from '../client'

/**
 * Kho: tồn kho, nhập/điều chỉnh, lịch sử biến động.
 */
export const adminInventoryApi = {
  /** params: { page, per_page, q, low_stock } → { data, meta, summary: { low_stock, out_of_stock, threshold } } */
  list: (params) => api.get('/admin/inventory', { params }).then((res) => res.data),
  /** payload: { type: 'import' | 'adjust', quantity (+/-), note } → { product, movement } */
  adjust: (productId, payload) => api.post(`/admin/inventory/${productId}/adjust`, payload).then((res) => res.data.data),
  /** params: { page, per_page, product, reason, from, to } → { data, meta } */
  movements: (params) => api.get('/admin/inventory/movements', { params }).then((res) => res.data),
}

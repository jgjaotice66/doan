import { api } from '../client'

/**
 * Kho: tồn kho, nhập/điều chỉnh, lịch sử biến động.
 */
export const adminInventoryApi = {
  /** params: { page, per_page, q, low_stock } → { data, meta, summary: { low_stock, out_of_stock, threshold } } */
  list: (params) => api.get('/admin/inventory', { params }).then((res) => res.data),
  /** payload: { type: 'import' | 'adjust', quantity (+/-), note } → { product, movement } */
  adjust: (productId, payload) => api.post(`/admin/inventory/${productId}/adjust`, payload).then((res) => res.data.data),
  /** Ngưỡng "sắp hết hàng" riêng của sản phẩm; null = dùng của danh mục / chung → sản phẩm mới */
  setThreshold: (productId, threshold) =>
    api.patch(`/admin/inventory/${productId}/threshold`, { low_stock_threshold: threshold }).then((res) => res.data.data),
  /** params: { page, per_page, product, reason, from, to } → { data, meta } */
  movements: (params) => api.get('/admin/inventory/movements', { params }).then((res) => res.data),
}

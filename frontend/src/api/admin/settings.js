import { api } from '../client'

const unwrap = (res) => res.data.data

/**
 * Cài đặt cửa hàng → { bank, account, account_name, low_stock_threshold, banks: [{ code, name }] }
 */
export const adminSettingsApi = {
  get: () => api.get('/admin/settings').then(unwrap),
  /** payload: { bank, account, account_name } */
  update: (payload) => api.put('/admin/settings', payload).then(unwrap),
  /** Ngưỡng "sắp hết hàng" chung (sản phẩm / danh mục không đặt riêng thì dùng số này). */
  updateLowStock: (threshold) => api.put('/admin/settings/low-stock', { low_stock_threshold: threshold }).then(unwrap),
  /** Số hotline cho nút gọi nổi ở storefront; null = ẩn nút. */
  updateHotline: (hotline) => api.put('/admin/settings/hotline', { hotline: hotline || null }).then(unwrap),
}

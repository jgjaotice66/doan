import { api } from '../client'

const unwrap = (res) => res.data.data

/**
 * Số liệu trang tổng quan. Doanh thu = đơn hoàn thành + đã thu tiền, tính theo ngày hoàn thành (giờ VN).
 */
export const adminDashboardApi = {
  /** → { revenue_today, revenue_month, revenue_month_change, orders_today, pending_orders, awaiting_payment, needs_refund, new_customers_month, low_stock, out_of_stock, low_stock_threshold, ... } */
  summary: () => api.get('/admin/dashboard/summary').then(unwrap),
  /** range: '30d' | '12m' → { range, points: [{ date, label, revenue, orders }], total_revenue, total_orders } */
  revenue: (range) => api.get('/admin/dashboard/revenue', { params: { range } }).then(unwrap),
  /** → [{ product_id, name, sku, slug, thumbnail, quantity, revenue }] */
  topProducts: (limit = 10) => api.get('/admin/dashboard/top-products', { params: { limit } }).then(unwrap),
  /** → [{ value, label, count }] đủ 5 trạng thái */
  orderStatus: () => api.get('/admin/dashboard/order-status').then(unwrap),
}

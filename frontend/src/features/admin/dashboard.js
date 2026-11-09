import { useQuery } from '@tanstack/react-query'
import { adminDashboardApi } from '../../api/admin/dashboard'

/** Mọi khoá bắt đầu bằng ['admin','dashboard'] → đổi trạng thái đơn, nhập kho, xử lý trả hàng là cả trang tải lại. */
export const dashboardKeys = {
  all: ['admin', 'dashboard'],
  summary: ['admin', 'dashboard', 'summary'],
  revenue: (range) => ['admin', 'dashboard', 'revenue', range],
  topProducts: ['admin', 'dashboard', 'top-products'],
  orderStatus: ['admin', 'dashboard', 'order-status'],
}

/** Số liệu tổng quan — dùng chung cho trang Dashboard và số đếm trên menu admin (1 lần gọi API). */
export const useDashboardSummary = (options = {}) =>
  useQuery({ queryKey: dashboardKeys.summary, queryFn: adminDashboardApi.summary, ...options })

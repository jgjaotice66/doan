import { useQuery } from '@tanstack/react-query'
import { adminSettingsApi } from '../../api/admin/settings'
import { PRODUCT_RELATED_KEYS } from './products'

/** Ngưỡng chung (Cài đặt cửa hàng) — cùng cache với trang Cài đặt; để gợi ý "bỏ trống = dùng N". */
export const useGlobalLowStockThreshold = () =>
  useQuery({ queryKey: ['admin', 'settings'], queryFn: adminSettingsApi.get, select: (s) => s.low_stock_threshold }).data

export const inventoryKeys = {
  all: ['admin', 'inventory'],
  stock: ['admin', 'inventory', 'stock'],
  summary: ['admin', 'inventory', 'summary'],
  movements: ['admin', 'inventory', 'movements'],
}

/** Đổi ngưỡng "sắp hết hàng" (chung / danh mục / sản phẩm) → mọi nơi hiện "sắp hết" tải lại: Kho, Dashboard + menu, sản phẩm. */
export const LOW_STOCK_RELATED_KEYS = [inventoryKeys.all, ['admin', 'dashboard'], ...PRODUCT_RELATED_KEYS]

/**
 * Sản phẩm thuộc danh mục categoryId mà không đặt ngưỡng riêng thì dùng ngưỡng nào (giống backend Product::lowStockThreshold).
 * tree = cây danh mục công khai (gốc + children). → { value, label }
 */
export function inheritedThreshold(tree, categoryId, globalThreshold) {
  const all = tree.flatMap((c) => [c, ...(c.children ?? [])])
  const category = all.find((c) => c.id === categoryId)
  const parent = category?.parent_id ? all.find((c) => c.id === category.parent_id) : null
  for (const c of [category, parent]) {
    if (c && c.low_stock_threshold != null) return { value: c.low_stock_threshold, label: `theo danh mục ${c.name}` }
  }
  return { value: globalThreshold, label: 'ngưỡng chung' }
}

/** Nguồn của ngưỡng đang áp dụng → màu Tag. */
export const THRESHOLD_SOURCE_COLORS = { product: 'purple', category: 'blue', global: 'default' }

/** Sắp xếp tab Tồn kho; bỏ trống = tồn ít nhất trước (mặc định của API). */
export const STOCK_SORT_OPTIONS = [
  { value: 'stock_desc', label: 'Tồn nhiều nhất trước' },
  { value: 'name', label: 'Tên A → Z' },
  { value: 'newest', label: 'Mới thêm gần đây' },
]

/** Sắp xếp tab Lịch sử; bỏ trống = mới nhất trước. */
export const MOVEMENT_SORT_OPTIONS = [{ value: 'oldest', label: 'Cũ nhất trước' }]

export const STOCK_REASON_OPTIONS = [
  { value: 'order', label: 'Bán hàng' },
  { value: 'cancel', label: 'Huỷ đơn hoàn kho' },
  { value: 'import', label: 'Nhập kho' },
  { value: 'adjust', label: 'Điều chỉnh' },
]

export const STOCK_REASON_COLORS = {
  order: 'blue',
  cancel: 'gold',
  import: 'green',
  adjust: 'purple',
}

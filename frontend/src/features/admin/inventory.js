export const inventoryKeys = {
  all: ['admin', 'inventory'],
  stock: ['admin', 'inventory', 'stock'],
  summary: ['admin', 'inventory', 'summary'],
  movements: ['admin', 'inventory', 'movements'],
}

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

import {
  ArrowUUpLeft,
  ChartPieSlice,
  Cube,
  GearSix,
  Image,
  Newspaper,
  Package,
  Receipt,
  Tag,
  TreeStructure,
  Users,
} from '@phosphor-icons/react'

/**
 * Menu khu quản trị — một nơi duy nhất: sider vẽ menu từ đây, header lấy tiêu đề từ đây.
 * badge = tên trường trong summary dashboard → số việc đang chờ hiện cạnh mục menu.
 * badgeHint = chữ đọc cho trình đọc màn hình / tooltip; badgeColor = màu badge (mặc định đỏ).
 */
export const ADMIN_MENU = [
  { path: '/admin', label: 'Dashboard', icon: ChartPieSlice },
  // low_stock tính cả hàng hết (tồn 0 ≤ ngưỡng) → số sản phẩm cần nhập thêm.
  { path: '/admin/products', label: 'Sản phẩm', icon: Cube, badge: 'low_stock', badgeHint: 'cần nhập hàng', badgeColor: 'orange' },
  { path: '/admin/categories', label: 'Danh mục', icon: TreeStructure },
  { path: '/admin/brands', label: 'Thương hiệu', icon: Tag },
  { path: '/admin/orders', label: 'Đơn hàng', icon: Receipt, badge: 'pending_orders' },
  { path: '/admin/returns', label: 'Trả hàng', icon: ArrowUUpLeft, badge: 'pending_returns' },
  { path: '/admin/inventory', label: 'Kho', icon: Package },
  { path: '/admin/users', label: 'Người dùng', icon: Users },
  { path: '/admin/banners', label: 'Banner', icon: Image },
  { path: '/admin/posts', label: 'NEWS', icon: Newspaper },
  { path: '/admin/settings', label: 'Cài đặt', icon: GearSix },
]

/**
 * Mục menu ứng với URL hiện tại (khớp dài nhất): /admin/products/12/edit → "Sản phẩm".
 */
export function findAdminMenuItem(pathname) {
  return ADMIN_MENU.filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0]
}

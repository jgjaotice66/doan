import {
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
 */
export const ADMIN_MENU = [
  { path: '/admin', label: 'Dashboard', icon: ChartPieSlice },
  { path: '/admin/products', label: 'Sản phẩm', icon: Cube },
  { path: '/admin/categories', label: 'Danh mục', icon: TreeStructure },
  { path: '/admin/brands', label: 'Thương hiệu', icon: Tag },
  { path: '/admin/orders', label: 'Đơn hàng', icon: Receipt },
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

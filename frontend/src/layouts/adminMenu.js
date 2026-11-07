import {
  ChartPieSlice,
  Cube,
  Image,
  Newspaper,
  Package,
  Receipt,
  Tag,
  TreeStructure,
  Users,
} from '@phosphor-icons/react'

/**
 * Menu khu quản trị — một nơi duy nhất: sider vẽ menu từ đây, header/placeholder lấy tiêu đề từ đây.
 * task = task sẽ làm trang đó (placeholder hiện ra cho tới khi xong).
 */
export const ADMIN_MENU = [
  { path: '/admin', label: 'Dashboard', icon: ChartPieSlice, task: '37' },
  { path: '/admin/products', label: 'Sản phẩm', icon: Cube, task: '29' },
  { path: '/admin/categories', label: 'Danh mục', icon: TreeStructure, task: '27' },
  { path: '/admin/brands', label: 'Thương hiệu', icon: Tag, task: '27' },
  { path: '/admin/orders', label: 'Đơn hàng', icon: Receipt, task: '30' },
  { path: '/admin/inventory', label: 'Kho', icon: Package, task: '31' },
  { path: '/admin/users', label: 'Người dùng', icon: Users, task: '32' },
  { path: '/admin/banners', label: 'Banner', icon: Image, task: '33' },
  { path: '/admin/posts', label: 'NEWS', icon: Newspaper, task: '34' },
]

/**
 * Mục menu ứng với URL hiện tại (khớp dài nhất): /admin/products/12/edit → "Sản phẩm".
 */
export function findAdminMenuItem(pathname) {
  return ADMIN_MENU.filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0]
}

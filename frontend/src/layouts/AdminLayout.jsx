import { Link, NavLink, Outlet } from 'react-router'
import { useAuthStore } from '../stores/authStore'

const ADMIN_MENU = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Sản phẩm' },
  { to: '/admin/categories', label: 'Danh mục' },
  { to: '/admin/brands', label: 'Thương hiệu' },
  { to: '/admin/orders', label: 'Đơn hàng' },
  { to: '/admin/inventory', label: 'Kho' },
  { to: '/admin/users', label: 'Người dùng' },
  { to: '/admin/banners', label: 'Banner' },
  { to: '/admin/posts', label: 'NEWS' },
]

/**
 * Khung admin tạm (thay bằng Ant Design Layout ở task 26).
 */
export default function AdminLayout() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen flex bg-gray-100 text-gray-900">
      <aside className="w-56 shrink-0 bg-gray-900 text-gray-200">
        <div className="px-4 py-4 text-lg font-bold">Toy Store Admin</div>
        <nav className="flex flex-col">
          {ADMIN_MENU.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `px-4 py-2 text-sm ${isActive ? 'bg-gray-700 text-white' : 'hover:bg-gray-800'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
          <span className="text-sm">Xin chào, <strong>{user?.name}</strong></span>
          <Link to="/" className="text-sm text-blue-600 hover:underline">Xem cửa hàng</Link>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

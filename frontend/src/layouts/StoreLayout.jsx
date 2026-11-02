import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition-colors hover:text-white ${isActive ? 'text-white' : 'text-slate-400'}`

function SearchBox() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') ?? '')

  const onSubmit = (e) => {
    e.preventDefault()
    const keyword = q.trim()
    navigate(keyword ? `/products?q=${encodeURIComponent(keyword)}` : '/products')
  }

  return (
    <form onSubmit={onSubmit} role="search" className="flex-1 max-w-md">
      <label htmlFor="site-search" className="sr-only">Tìm sản phẩm</label>
      <input
        id="site-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm Gundam, LEGO, figure…"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-400 focus:outline-none"
      />
    </form>
  )
}

function AccountMenu() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  if (!token) {
    return (
      <div className="flex items-center gap-3">
        <NavLink to="/login" className={navLinkClass}>Đăng nhập</NavLink>
        <NavLink to="/register" className={navLinkClass}>Đăng ký</NavLink>
      </div>
    )
  }

  const onLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Token có thể đã hết hạn; vẫn xoá phía client.
    }
    logout()
    navigate('/')
  }

  return (
    <div className="flex items-center gap-3">
      {user?.role === 'admin' && <NavLink to="/admin" className={navLinkClass}>Quản trị</NavLink>}
      <NavLink to="/account" className={navLinkClass}>{user?.name ?? 'Tài khoản'}</NavLink>
      <button type="button" onClick={onLogout} className="text-sm text-slate-400 hover:text-white">
        Đăng xuất
      </button>
    </div>
  )
}

/**
 * Khung storefront: header, nội dung, footer. Giao diện chi tiết chốt ở task 14.
 */
export default function StoreLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <Link to="/" className="text-xl font-extrabold tracking-tight">Toy Store</Link>
          <nav className="flex items-center gap-4">
            <NavLink to="/products" className={navLinkClass}>Sản phẩm</NavLink>
            <NavLink to="/news" className={navLinkClass}>Tin tức</NavLink>
          </nav>
          <SearchBox />
          <nav className="flex items-center gap-4">
            <NavLink to="/wishlist" className={navLinkClass}>Yêu thích</NavLink>
            <NavLink to="/cart" className={navLinkClass}>Giỏ hàng</NavLink>
          </nav>
          <AccountMenu />
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Toy Store – Đồ chơi sưu tầm
      </footer>
    </div>
  )
}

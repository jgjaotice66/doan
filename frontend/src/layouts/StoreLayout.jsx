import { Heart, MagnifyingGlass, ShoppingCartSimple, SignOut, UserCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate, useSearchParams } from 'react-router'
import { useLogout } from '../features/auth/useLogout'
import { useCart } from '../features/cart/queries'
import { useAuthStore } from '../stores/authStore'
import { cn } from '../utils/cn'

const navLinkClass = ({ isActive }) =>
  cn(
    'inline-flex min-h-11 items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary',
    isActive ? 'text-primary' : 'text-muted',
  )

function SearchBox() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlQ = searchParams.get('q') ?? ''
  const [q, setQ] = useState(urlQ)

  // URL đổi từ khoá (gỡ chip, bấm Back…) → ô tìm kiếm cập nhật theo.
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ)
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ)
    setQ(urlQ)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const keyword = q.trim()
    navigate(keyword ? `/products?q=${encodeURIComponent(keyword)}` : '/products')
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative order-last w-full md:order-none md:max-w-md md:flex-1">
      <label htmlFor="site-search" className="sr-only">
        Tìm sản phẩm
      </label>
      <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        id="site-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm Gundam, LEGO, figure…"
        className="h-11 w-full rounded-control border border-control bg-surface pl-9 pr-3 text-base text-fg placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </form>
  )
}

/**
 * Icon giỏ kèm số món (tổng số lượng). Số đọc cùng nhãn cho trình đọc màn hình.
 */
function CartLink() {
  const token = useAuthStore((s) => s.token)
  const { data: cart } = useCart()
  const count = token ? (cart?.count ?? 0) : 0

  return (
    <NavLink to="/cart" className={navLinkClass}>
      <span className="relative">
        <ShoppingCartSimple aria-hidden className="size-5" />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -right-2.5 -top-2 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-on-primary tabular"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </span>
      <span className="sr-only lg:not-sr-only">Giỏ hàng</span>
      {count > 0 && <span className="sr-only">, {count} sản phẩm</span>}
    </NavLink>
  )
}

function AccountMenu() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const onLogout = useLogout()

  if (!token) {
    return (
      <div className="flex items-center gap-4">
        <NavLink to="/login" className={navLinkClass}>
          Đăng nhập
        </NavLink>
        <NavLink to="/register" className={navLinkClass}>
          Đăng ký
        </NavLink>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {user?.role === 'admin' && (
        <NavLink to="/admin" className={navLinkClass}>
          Quản trị
        </NavLink>
      )}
      <NavLink to="/account" className={navLinkClass}>
        <UserCircle aria-hidden className="size-5" />
        <span className="max-w-32 truncate">{user?.name ?? 'Tài khoản'}</span>
      </NavLink>
      <button
        type="button"
        onClick={onLogout}
        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm text-muted transition-colors hover:text-danger"
      >
        <SignOut aria-hidden className="size-5" />
        <span className="sr-only sm:not-sr-only">Đăng xuất</span>
      </button>
    </div>
  )
}

/**
 * Khung storefront: header, nội dung, footer.
 */
export default function StoreLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
      >
        Bỏ qua đến nội dung chính
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          <Link to="/" className="font-display text-xl font-bold tracking-wide text-primary">
            TOY<span className="text-fg">STORE</span>
          </Link>
          <nav aria-label="Danh mục chính" className="flex items-center gap-4">
            <NavLink to="/products" className={navLinkClass}>
              Sản phẩm
            </NavLink>
            <NavLink to="/news" className={navLinkClass}>
              Tin tức
            </NavLink>
          </nav>
          <SearchBox />
          <div className="ml-auto flex items-center gap-4">
            <NavLink to="/wishlist" className={navLinkClass}>
              <Heart aria-hidden className="size-5" />
              <span className="sr-only lg:not-sr-only">Yêu thích</span>
            </NavLink>
            <CartLink />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      {/* Trang mới → cuộn lên đầu; bấm Back → về đúng vị trí cũ */}
      <ScrollRestoration />

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} Toy Store – Đồ chơi sưu tầm
      </footer>
    </div>
  )
}

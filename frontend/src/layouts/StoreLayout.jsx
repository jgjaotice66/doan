import {
  CaretDown,
  Heart,
  List,
  MagnifyingGlass,
  Newspaper,
  Receipt,
  ShieldCheck,
  ShoppingCartSimple,
  SignIn,
  SignOut,
  SquaresFour,
  Storefront,
  UserCircle,
  UserPlus,
} from '@phosphor-icons/react'
import { useState } from 'react'
import CategoryMenu from '../components/CategoryMenu'
import FloatingActions from '../components/FloatingActions'
import StoreFooter from '../components/StoreFooter'
import Drawer from '../components/ui/Drawer'
import { Link, NavLink, Outlet, ScrollRestoration, useNavigate, useSearchParams } from 'react-router'
import { useLogout } from '../features/auth/useLogout'
import { useCart } from '../features/cart/queries'
import { useCategories } from '../features/catalog/queries'
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
    <form onSubmit={onSubmit} role="search" className="header-popover relative order-last w-full lg:order-none lg:min-w-56 lg:max-w-md lg:flex-1">
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
        className="h-11 w-full rounded-control border border-control bg-bg pl-9 pr-3 text-base text-fg placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
      <span className="sr-only xl:not-sr-only">Giỏ hàng</span>
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
      <NavLink to="/orders" className={navLinkClass}>
        <Receipt aria-hidden className="size-5" />
        <span className="sr-only xl:not-sr-only">Đơn hàng</span>
      </NavLink>
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

const drawerLinkClass = ({ isActive }) =>
  cn(
    'flex min-h-12 items-center gap-3 rounded-control px-3 text-base font-medium transition-colors hover:bg-raised',
    isActive ? 'bg-raised text-primary' : 'text-fg',
  )

/**
 * Danh mục trong menu điện thoại: mục thu gọn được (details/summary có sẵn bàn phím + trình đọc màn hình).
 */
function MobileCategories({ onNavigate }) {
  const { data: categories } = useCategories()
  if (!categories?.length) return null

  return (
    <details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-control px-3 text-base font-medium text-fg hover:bg-raised [&::-webkit-details-marker]:hidden">
        <SquaresFour aria-hidden className="size-5 text-muted" />
        Danh mục
        <CaretDown aria-hidden weight="bold" className="ml-auto size-4 text-muted motion-safe:transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-1 space-y-0.5 pl-11">
        {categories.flatMap((category) => [category, ...(category.children ?? [])]).map((category) => (
          <li key={category.id}>
            <Link
              to={`/products?category=${category.slug}`}
              onClick={onNavigate}
              className={cn(
                'flex min-h-11 items-center justify-between rounded-control px-3 text-sm hover:bg-raised hover:text-primary',
                category.parent_id ? 'pl-6 text-muted' : 'text-fg',
              )}
            >
              {category.name}
              {category.products_count != null && <span className="text-xs text-subtle tabular">{category.products_count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  )
}

/**
 * Menu điện thoại (< md): nút ☰ mở ngăn kéo chứa điều hướng + tài khoản.
 * Bấm vào link nào cũng đóng ngăn kéo.
 */
function MobileMenu() {
  const [open, setOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const onLogout = useLogout()
  const close = () => setOpen(false)

  const item = (to, Icon, label) => (
    <li>
      <NavLink to={to} onClick={close} className={drawerLinkClass}>
        <Icon aria-hidden className="size-5 text-muted" />
        {label}
      </NavLink>
    </li>
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mở menu"
        aria-expanded={open}
        className="-ml-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-control text-fg hover:bg-raised md:hidden"
      >
        <List aria-hidden className="size-6" />
      </button>
      <Drawer
        open={open}
        onClose={close}
        title="Menu"
        className="header-popover"
        footer={
          token ? (
            <button
              type="button"
              onClick={() => {
                close()
                onLogout()
              }}
              className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-control px-3 text-base font-medium text-danger hover:bg-raised"
            >
              <SignOut aria-hidden className="size-5" />
              Đăng xuất
            </button>
          ) : null
        }
      >
        {token && (
          <div className="mb-4 flex items-center gap-3 rounded-card border border-line bg-raised px-3 py-3">
            <UserCircle aria-hidden className="size-9 shrink-0 text-primary" weight="duotone" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{user?.name}</p>
              <p className="truncate text-sm text-muted">{user?.email}</p>
            </div>
          </div>
        )}
        <nav aria-label="Menu điện thoại">
          <ul className="space-y-1">
            {item('/products', Storefront, 'Sản phẩm')}
            <li>
              <MobileCategories onNavigate={close} />
            </li>
            {item('/news', Newspaper, 'Tin tức')}
            {item('/wishlist', Heart, 'Yêu thích')}
          </ul>
          <hr className="my-3 border-line" />
          <ul className="space-y-1">
            {token ? (
              <>
                {item('/orders', Receipt, 'Đơn hàng của tôi')}
                {item('/account', UserCircle, 'Tài khoản')}
                {user?.role === 'admin' && item('/admin', ShieldCheck, 'Quản trị')}
              </>
            ) : (
              <>
                {item('/login', SignIn, 'Đăng nhập')}
                {item('/register', UserPlus, 'Đăng ký')}
              </>
            )}
          </ul>
        </nav>
      </Drawer>
    </>
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

      {/* Nền header khác thân trang ở cả 2 chế độ (token --color-header; sáng = đỏ cam, xem .store-header ở index.css) */}
      <header className="store-header sticky top-0 z-30 border-b border-line bg-header/95 shadow-[0_6px_20px_-12px_rgb(0_0_0/0.35)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
          <div className="flex items-center gap-1">
            <MobileMenu />
            <Link to="/" className="font-display text-xl font-bold tracking-wide text-primary">
              TOY<span className="text-fg">STORE</span>
            </Link>
          </div>
          <nav aria-label="Danh mục chính" className="hidden items-center gap-4 md:flex">
            <CategoryMenu />
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
              <span className="sr-only xl:not-sr-only">Yêu thích</span>
            </NavLink>
            <CartLink />
            <div className="hidden md:block">
              <AccountMenu />
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      {/* Trang mới → cuộn lên đầu; bấm Back → về đúng vị trí cũ */}
      <ScrollRestoration />

      <StoreFooter />

      <FloatingActions />
    </div>
  )
}

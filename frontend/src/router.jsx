import { createBrowserRouter } from 'react-router'
import AuthBootstrap from './components/AuthBootstrap'
import PagePlaceholder from './components/PagePlaceholder'
import RequireAdmin from './components/RequireAdmin'
import RequireAuth from './components/RequireAuth'
import StoreLayout from './layouts/StoreLayout'
import NotFoundPage from './pages/NotFoundPage'

const placeholder = (title, task) => <PagePlaceholder title={title} task={task} />

/**
 * Mỗi trang là một bundle riêng, chỉ tải khi khách mở trang đó
 * (bundle chính chỉ còn layout + thư viện dùng chung; admin/antd tách hẳn).
 */
const lazyPage = (load) => async () => ({ Component: (await load()).default })

/** Trang admin chưa làm: placeholder antd (tiêu đề + task lấy từ adminMenu theo URL). */
const adminPlaceholder = lazyPage(() => import('./pages/admin/AdminPlaceholderPage'))
const adminPage = (path) => ({ path, lazy: adminPlaceholder })

export const router = createBrowserRouter([
  {
    element: <AuthBootstrap />,
    children: [
      {
        element: <StoreLayout />,
        children: [
          { index: true, lazy: lazyPage(() => import('./pages/store/HomePage')) },
          { path: 'products', lazy: lazyPage(() => import('./pages/store/ProductListPage')) },
          { path: 'products/:slug', lazy: lazyPage(() => import('./pages/store/ProductDetailPage')) },
          { path: 'news', element: placeholder('Tin tức', '35') },
          { path: 'news/:slug', element: placeholder('Bài viết', '35') },
          // Trang xem design system: chỉ có khi chạy `npm run dev`, bị loại khỏi bản build.
          ...(import.meta.env.DEV ? [{ path: 'dev/ui', lazy: lazyPage(() => import('./pages/dev/UiShowcasePage')) }] : []),
          { path: 'login', lazy: lazyPage(() => import('./pages/store/LoginPage')) },
          { path: 'register', lazy: lazyPage(() => import('./pages/store/RegisterPage')) },
          {
            element: <RequireAuth />,
            children: [
              { path: 'cart', lazy: lazyPage(() => import('./pages/store/CartPage')) },
              { path: 'checkout', lazy: lazyPage(() => import('./pages/store/CheckoutPage')) },
              { path: 'orders/:code/success', lazy: lazyPage(() => import('./pages/store/OrderSuccessPage')) },
              { path: 'orders', lazy: lazyPage(() => import('./pages/store/MyOrdersPage')) },
              { path: 'orders/:code', lazy: lazyPage(() => import('./pages/store/OrderDetailPage')) },
              { path: 'wishlist', lazy: lazyPage(() => import('./pages/store/WishlistPage')) },
              { path: 'account', lazy: lazyPage(() => import('./pages/store/ProfilePage')) },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        path: 'admin',
        element: <RequireAdmin />,
        children: [
          {
            lazy: lazyPage(() => import('./layouts/AdminLayout')),
            children: [
              { index: true, lazy: adminPlaceholder },
              { path: 'products', lazy: lazyPage(() => import('./pages/admin/ProductsPage')) },
              { path: 'products/new', lazy: lazyPage(() => import('./pages/admin/ProductFormPage')) },
              { path: 'products/:id', lazy: lazyPage(() => import('./pages/admin/ProductFormPage')) },
              { path: 'categories', lazy: lazyPage(() => import('./pages/admin/CategoriesPage')) },
              { path: 'brands', lazy: lazyPage(() => import('./pages/admin/BrandsPage')) },
              { path: 'orders', lazy: lazyPage(() => import('./pages/admin/OrdersPage')) },
              { path: 'orders/:id', lazy: lazyPage(() => import('./pages/admin/OrderDetailPage')) },
              { path: 'inventory', lazy: lazyPage(() => import('./pages/admin/InventoryPage')) },
              adminPage('users'),
              adminPage('banners'),
              adminPage('posts'),
              { path: 'settings', lazy: lazyPage(() => import('./pages/admin/SettingsPage')) },
              { path: '*', lazy: lazyPage(() => import('./pages/admin/AdminNotFoundPage')) },
            ],
          },
        ],
      },
    ],
  },
])

import { createBrowserRouter } from 'react-router'
import AuthBootstrap from './components/AuthBootstrap'
import RequireAdmin from './components/RequireAdmin'
import RequireAuth from './components/RequireAuth'
import StoreLayout from './layouts/StoreLayout'
import NotFoundPage from './pages/NotFoundPage'

/**
 * Mỗi trang là một bundle riêng, chỉ tải khi khách mở trang đó
 * (bundle chính chỉ còn layout + thư viện dùng chung; admin/antd tách hẳn).
 */
const lazyPage = (load) => async () => ({ Component: (await load()).default })

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
          { path: 'news', lazy: lazyPage(() => import('./pages/store/NewsListPage')) },
          { path: 'news/:slug', lazy: lazyPage(() => import('./pages/store/NewsDetailPage')) },
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
              { index: true, lazy: lazyPage(() => import('./pages/admin/DashboardPage')) },
              { path: 'products', lazy: lazyPage(() => import('./pages/admin/ProductsPage')) },
              { path: 'products/new', lazy: lazyPage(() => import('./pages/admin/ProductFormPage')) },
              { path: 'products/:id', lazy: lazyPage(() => import('./pages/admin/ProductFormPage')) },
              { path: 'categories', lazy: lazyPage(() => import('./pages/admin/CategoriesPage')) },
              { path: 'brands', lazy: lazyPage(() => import('./pages/admin/BrandsPage')) },
              { path: 'orders', lazy: lazyPage(() => import('./pages/admin/OrdersPage')) },
              { path: 'orders/:id', lazy: lazyPage(() => import('./pages/admin/OrderDetailPage')) },
              { path: 'returns', lazy: lazyPage(() => import('./pages/admin/ReturnsPage')) },
              { path: 'returns/:id', lazy: lazyPage(() => import('./pages/admin/ReturnDetailPage')) },
              { path: 'inventory',lazy: lazyPage(() => import('./pages/admin/InventoryPage')) },
              { path: 'users', lazy: lazyPage(() => import('./pages/admin/UsersPage')) },
              { path: 'banners', lazy: lazyPage(() => import('./pages/admin/BannersPage')) },
              { path: 'posts', lazy: lazyPage(() => import('./pages/admin/PostsPage')) },
              { path: 'posts/new', lazy: lazyPage(() => import('./pages/admin/PostFormPage')) },
              { path: 'posts/:id', lazy: lazyPage(() => import('./pages/admin/PostFormPage')) },
              { path: 'settings', lazy: lazyPage(() => import('./pages/admin/SettingsPage')) },
              { path: '*', lazy: lazyPage(() => import('./pages/admin/AdminNotFoundPage')) },
            ],
          },
        ],
      },
    ],
  },
])

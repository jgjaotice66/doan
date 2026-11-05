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

const adminPage = (path, title, task) => ({
  path,
  element: placeholder(title, task),
})

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
              { path: 'checkout', element: placeholder('Thanh toán', '23') },
              { path: 'orders', element: placeholder('Đơn hàng của tôi', '24') },
              { path: 'orders/:code', element: placeholder('Chi tiết đơn hàng', '24') },
              { path: 'wishlist', element: placeholder('Yêu thích', '25') },
              { path: 'account', element: placeholder('Tài khoản', '25') },
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
              { index: true, element: placeholder('Dashboard', '37') },
              adminPage('products', 'Sản phẩm', '29'),
              adminPage('categories', 'Danh mục', '27'),
              adminPage('brands', 'Thương hiệu', '27'),
              adminPage('orders', 'Đơn hàng', '30'),
              adminPage('inventory', 'Kho', '31'),
              adminPage('users', 'Người dùng', '32'),
              adminPage('banners', 'Banner', '33'),
              adminPage('posts', 'NEWS', '34'),
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])

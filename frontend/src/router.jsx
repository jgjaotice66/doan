import { createBrowserRouter } from 'react-router'
import AuthBootstrap from './components/AuthBootstrap'
import PagePlaceholder from './components/PagePlaceholder'
import RequireAdmin from './components/RequireAdmin'
import RequireAuth from './components/RequireAuth'
import StoreLayout from './layouts/StoreLayout'
import NotFoundPage from './pages/NotFoundPage'
import HomePage from './pages/store/HomePage'
import LoginPage from './pages/store/LoginPage'
import RegisterPage from './pages/store/RegisterPage'

const placeholder = (title, task) => <PagePlaceholder title={title} task={task} />

/**
 * Khu admin được tách bundle riêng (lazy) để khách mua hàng không phải tải code admin/antd.
 */
const lazyAdmin = (load) => async () => ({ Component: (await load()).default })

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
          { index: true, element: <HomePage /> },
          { path: 'products', element: placeholder('Sản phẩm', '16') },
          { path: 'products/:slug', element: placeholder('Chi tiết sản phẩm', '17') },
          { path: 'news', element: placeholder('Tin tức', '35') },
          { path: 'news/:slug', element: placeholder('Bài viết', '35') },
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          {
            element: <RequireAuth />,
            children: [
              { path: 'cart', element: placeholder('Giỏ hàng', '22') },
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
            lazy: lazyAdmin(() => import('./layouts/AdminLayout')),
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

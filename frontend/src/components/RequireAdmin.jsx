import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '../stores/authStore'

/**
 * Chỉ admin mới vào được /admin. Backend vẫn kiểm tra lại quyền (middleware admin),
 * nên đây chỉ là chặn ở giao diện.
 */
export default function RequireAdmin() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!token) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

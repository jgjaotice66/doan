import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuthStore } from '../../stores/authStore'

/**
 * Dùng trước thao tác cần đăng nhập (thêm giỏ, yêu thích):
 * chưa đăng nhập → chuyển /login rồi quay lại trang hiện tại, trả false.
 *
 *   const requireLogin = useRequireLogin()
 *   const onAdd = () => { if (!requireLogin()) return; ... }
 */
export function useRequireLogin() {
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(() => {
    if (token) return true
    const redirect = encodeURIComponent(location.pathname + location.search)
    navigate(`/login?redirect=${redirect}`)
    return false
  }, [token, navigate, location.pathname, location.search])
}

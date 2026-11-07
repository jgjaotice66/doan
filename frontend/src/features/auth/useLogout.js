import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'

/**
 * Đăng xuất: thu hồi token trên server (lỗi cũng bỏ qua) → xoá phía client → về trang chủ.
 * Dùng chung cho header storefront và header admin.
 */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Token có thể đã hết hạn; vẫn xoá phía client.
    }
    logout()
    navigate('/')
  }, [logout, navigate])
}

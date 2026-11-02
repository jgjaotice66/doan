import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { authApi } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

/**
 * Route gốc: nếu có token đã lưu thì gọi GET /me để làm mới thông tin user.
 * Token hết hạn -> interceptor 401 trong api/client.js tự đăng xuất.
 */
export default function AuthBootstrap() {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)

  const { data: me } = useQuery({
    queryKey: ['me', token],
    queryFn: authApi.me,
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (me) {
      setUser(me)
    }
  }, [me, setUser])

  return <Outlet />
}

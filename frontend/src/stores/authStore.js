import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Trạng thái đăng nhập: token Sanctum + thông tin user.
 * Lưu vào localStorage để giữ đăng nhập khi tải lại trang.
 */
export const useAuthStore = create()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: ({ token, user }) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'toystore-auth' },
  ),
)

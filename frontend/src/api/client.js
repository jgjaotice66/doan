import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

/**
 * Axios dùng chung cho mọi lời gọi API Laravel.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
})

// Gắn token vào mọi request nếu đã đăng nhập.
api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Token hết hạn / bị thu hồi -> đăng xuất và đưa về trang đăng nhập.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.assign(`/login?redirect=${redirect}`)
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Lấy thông báo lỗi dễ đọc từ response Laravel.
 */
export function getErrorMessage(error, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.') {
  return error?.response?.data?.message || fallback
}

/**
 * Lỗi validation 422 dạng { field: 'thông báo đầu tiên' } để gắn vào form.
 */
export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors ?? {}
  return Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]))
}

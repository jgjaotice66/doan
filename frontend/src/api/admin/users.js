import { api } from '../client'

/**
 * Quản lý tài khoản.
 */
export const adminUsersApi = {
  /** params: { page, per_page, q, role, is_active ('1' | '0'), sort } → { data, meta } */
  list: (params) => api.get('/admin/users', { params }).then((res) => res.data),
  /** Khoá ↔ mở khoá; khoá thì người đó bị đăng xuất ngay. */
  toggleActive: (id) => api.patch(`/admin/users/${id}/toggle-active`).then((res) => res.data.data),
}

import { api } from './client'

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((res) => res.data),
  login: (payload) => api.post('/auth/login', payload).then((res) => res.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/me').then((res) => res.data.data),
  /** payload: { name, phone } → user mới */
  updateProfile: (payload) => api.put('/me', payload).then((res) => res.data.data),
  /** payload: { current_password, password, password_confirmation } → 204 */
  updatePassword: (payload) => api.put('/me/password', payload),
}

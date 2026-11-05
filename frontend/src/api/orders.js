import { api } from './client'

const unwrap = (res) => res.data.data

/**
 * Đơn hàng của khách đang đăng nhập.
 */
export const ordersApi = {
  /** payload: { recipient_name, phone, address, note, payment_method: 'cod' | 'bank_qr' } */
  place: (payload) => api.post('/orders', payload).then(unwrap),
  get: (code) => api.get(`/orders/${encodeURIComponent(code)}`).then(unwrap),
  /** Trả { data: [...], meta } */
  list: (params) => api.get('/orders', { params }).then((res) => res.data),
  cancel: (code) => api.post(`/orders/${encodeURIComponent(code)}/cancel`).then(unwrap),
}

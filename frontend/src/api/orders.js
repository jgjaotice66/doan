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
  /**
   * Gửi yêu cầu trả hàng (multipart: items[i][order_item_id|quantity], reason, description, media[], bank_name, bank_account, account_name).
   * onProgress(0–100) để hiện thanh tải lên — video có thể nặng tới 50 MB.
   */
  requestReturn: (code, formData, onProgress) =>
    api
      .post(`/orders/${encodeURIComponent(code)}/returns`, formData, {
        onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
      })
      .then(unwrap),
}

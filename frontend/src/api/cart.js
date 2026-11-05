import { api } from './client'

/**
 * Giỏ hàng. Mọi thao tác đều trả về toàn bộ giỏ mới:
 * { items, count, subtotal, shipping_fee, total, has_unavailable }
 */
const unwrap = (res) => res.data.data

export const cartApi = {
  get: () => api.get('/cart').then(unwrap),
  add: ({ productId, quantity }) => api.post('/cart', { product_id: productId, quantity }).then(unwrap),
  update: ({ id, quantity }) => api.patch(`/cart/${id}`, { quantity }).then(unwrap),
  remove: (id) => api.delete(`/cart/${id}`).then(unwrap),
}

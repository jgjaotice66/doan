import { api } from './client'

/**
 * Danh sách yêu thích của khách đang đăng nhập.
 */
export const wishlistApi = {
  /** Mảng sản phẩm (đang bán), mới thích nằm đầu. */
  list: () => api.get('/wishlist').then((res) => res.data.data),
  add: (productId) => api.post('/wishlist', { product_id: productId }).then((res) => res.data.data),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
}

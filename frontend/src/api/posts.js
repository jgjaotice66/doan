import { api } from './client'

/** Tin tức công khai (chỉ bài đã đăng). */
export const postsApi = {
  /** params: { page, per_page, exclude: "3" | "3,7,9" } → { data, meta } */
  list: (params) => api.get('/posts', { params }).then((res) => res.data),
  /** Khối nổi bật: [bài to (tin hot / mới nhất), 2 bài mới nhất còn lại]. */
  highlights: () => api.get('/posts/highlights').then((res) => res.data.data),
  get: (slug) => api.get(`/posts/${encodeURIComponent(slug)}`).then((res) => res.data.data),
}

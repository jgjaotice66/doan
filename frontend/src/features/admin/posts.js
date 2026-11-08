import { useQuery } from '@tanstack/react-query'
import { adminPostsApi } from '../../api/admin/posts'

export const adminPostKeys = {
  all: ['admin', 'posts'],
  detail: (id) => ['admin', 'posts', 'detail', String(id)],
}

/** Bài đổi → bảng admin + trang tin tức storefront (task 35) tải lại. */
export const POST_RELATED_KEYS = [adminPostKeys.all, ['posts'], ['post']]

export const POST_STATUS_OPTIONS = [
  { value: 'published', label: 'Đã đăng' },
  { value: 'scheduled', label: 'Hẹn giờ' },
  { value: 'draft', label: 'Nháp' },
]

export const POST_STATUS_COLORS = { published: 'green', scheduled: 'gold', draft: 'default' }

/** Khớp backend: ảnh đại diện jpg/png/webp ≤ 5MB; ảnh trong bài thêm gif. */
export const POST_IMAGE_MAX_MB = 5
export const CONTENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const useAdminPost = (id) =>
  useQuery({
    queryKey: adminPostKeys.detail(id),
    queryFn: () => adminPostsApi.get(id),
    enabled: Boolean(id),
    retry: (count, error) => error?.response?.status !== 404 && count < 1,
  })

const parse = (html) => new DOMParser().parseFromString(`<body>${html ?? ''}</body>`, 'text/html').body

/** Trình soạn thảo trống (Quill để trống vẫn có "<p><br></p>"). */
export function isBlankHtml(html) {
  const body = parse(html)
  return body.textContent.trim() === '' && !body.querySelector('img')
}

/**
 * HTML của Quill 2 → HTML chuẩn trước khi lưu.
 * Quill gom mọi danh sách vào <ol> và đánh dấu bằng data-list="bullet|ordered" (server lọc bỏ data-*),
 * nên tách lại thành <ul>/<ol> thật; bỏ <span class="ql-ui"> (nút đánh số nội bộ của Quill).
 */
export function normalizeEditorHtml(html) {
  const body = parse(html)
  const doc = body.ownerDocument

  body.querySelectorAll('span.ql-ui').forEach((el) => el.remove())

  body.querySelectorAll('ol').forEach((ol) => {
    const runs = []
    ;[...ol.children].forEach((li) => {
      const tag = li.getAttribute('data-list') === 'bullet' ? 'ul' : 'ol'
      li.removeAttribute('data-list')
      if (runs.at(-1)?.tag !== tag) runs.push({ tag, items: [] })
      runs.at(-1).items.push(li)
    })

    const fragment = doc.createDocumentFragment()
    runs.forEach(({ tag, items }) => {
      const list = doc.createElement(tag)
      list.append(...items)
      fragment.append(list)
    })
    ol.replaceWith(fragment)
  })

  return body.innerHTML
}
